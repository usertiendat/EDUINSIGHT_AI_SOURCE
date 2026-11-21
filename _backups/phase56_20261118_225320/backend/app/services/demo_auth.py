"""Demo student sessions. Secrets stay on the backend; queries always use server-side identity."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

MAX_FAILURES = 5
LOCK_MINUTES = 15
SESSION_HOURS = 8
ITERATIONS = 310_000


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, count, salt, expected = encoded.split("$")
        if algorithm != "pbkdf2_sha256" or not (100_000 <= int(count) <= 2_000_000):
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(count))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (ValueError, TypeError):
        return False


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def authenticate(db: Session, username: str, password: str) -> str | None:
    # Locking SELECT protects failure count from concurrent logins.
    account = db.execute(text("""
       SELECT account_id, password_hash, failed_attempts, locked_until, is_active
       FROM auth.demo_accounts WHERE username = :username FOR UPDATE
    """), {"username": username}).mappings().first()
    now = datetime.now(timezone.utc)
    if not account or not account["is_active"]:
        # Equalize some of the cost for unknown users; no identity enumeration.
        verify_password(password, hash_password("dummy-password", bytes(16)))
        return None
    lock = account["locked_until"]
    if lock and lock > now:
        return None
    if not verify_password(password, account["password_hash"]):
        failures = account["failed_attempts"] + 1
        locked_until = now + timedelta(minutes=LOCK_MINUTES) if failures >= MAX_FAILURES else None
        db.execute(text("""UPDATE auth.demo_accounts SET failed_attempts = :n, locked_until = :until
            WHERE account_id = :id"""), {"n": failures if failures < MAX_FAILURES else 0,
                                         "until": locked_until, "id": account["account_id"]})
        db.commit()
        return None
    db.execute(text("""UPDATE auth.demo_accounts SET failed_attempts = 0, locked_until = NULL,
        last_login_at = :now WHERE account_id = :id"""), {"id": account["account_id"], "now": now})
    raw_token = secrets.token_urlsafe(48)
    db.execute(text("""INSERT INTO auth.demo_sessions (account_id, token_hash, expires_at)
         VALUES (:id, :hash, :expiry)"""), {"id": account["account_id"],
         "hash": token_hash(raw_token), "expiry": now + timedelta(hours=SESSION_HOURS)})
    db.commit()
    return raw_token


def current_student(request: Request, db: Session = Depends(get_db)) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chua dang nhap")
    token = auth[7:]
    if len(token) > 256 or len(token) < 30:
        raise HTTPException(status_code=401, detail="Phien khong hop le")
    result = db.execute(text("""
       SELECT a.account_id, a.display_name, a.student_key, a.username
       FROM auth.demo_sessions s JOIN auth.demo_accounts a ON a.account_id = s.account_id
       WHERE s.token_hash = :hash AND s.expires_at > NOW() AND s.revoked_at IS NULL
         AND a.is_active = TRUE AND a.role = 'student'
    """), {"hash": token_hash(token)}).mappings().first()
    if result is None:
        raise HTTPException(status_code=401, detail="Phien het han hoac khong hop le")
    return dict(result)


def revoke(db: Session, token: str) -> None:
    db.execute(text("""UPDATE auth.demo_sessions SET revoked_at = NOW()
        WHERE token_hash = :hash AND revoked_at IS NULL"""), {"hash": token_hash(token)})
    db.commit()
