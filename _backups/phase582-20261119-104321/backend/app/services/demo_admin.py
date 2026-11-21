"""Isolated demo administrator authentication. All session tokens are hashed in storage."""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.demo_auth import (
    MAX_FAILURES, LOCK_MINUTES, SESSION_HOURS,
    hash_password, verify_password, token_hash,
)
import secrets


def login_admin(db: Session, username: str, password: str) -> str | None:
    row = db.execute(text("""
        SELECT admin_account_id, password_hash, failed_attempts, locked_until, is_active
        FROM auth.demo_admin_accounts WHERE username=:username FOR UPDATE
    """), {'username':username}).mappings().first()
    now = datetime.now(timezone.utc)
    if row is None or not row['is_active']:
        verify_password(password, hash_password('nonexistent-user', bytes(16)))
        return None
    if row['locked_until'] and row['locked_until'] > now:
        db.rollback()
        return None
    if not verify_password(password, row['password_hash']):
        count = int(row['failed_attempts']) + 1
        lock = now + timedelta(minutes=LOCK_MINUTES) if count >= MAX_FAILURES else None
        db.execute(text("""UPDATE auth.demo_admin_accounts
            SET failed_attempts=:count,locked_until=:lock WHERE admin_account_id=:id"""),
            {'count':0 if lock else count,'lock':lock,'id':row['admin_account_id']})
        db.commit()
        return None
    raw = secrets.token_urlsafe(48)
    db.execute(text("""UPDATE auth.demo_admin_accounts
        SET failed_attempts=0,locked_until=NULL,last_login_at=:now WHERE admin_account_id=:id"""),
        {'id':row['admin_account_id'],'now':now})
    db.execute(text("""INSERT INTO auth.demo_admin_sessions(admin_account_id, token_hash,expires_at)
        VALUES (:id,:hash,:expiry)"""),
        {'id':row['admin_account_id'],'hash':token_hash(raw),'expiry':now+timedelta(hours=SESSION_HOURS)})
    db.commit()
    return raw


def current_admin(request:Request,db:Session=Depends(get_db))->dict:
    auth = request.headers.get('Authorization','')
    if not auth.startswith('Bearer '):
        raise HTTPException(status_code=401,detail='Cần đăng nhập quản trị viên')
    token=auth[7:]
    if not 30<=len(token)<=256:
        raise HTTPException(status_code=401,detail='Phiên không hợp lệ')
    row=db.execute(text("""SELECT a.admin_account_id,a.username,a.display_name,
            s.created_at AS session_created_at,s.expires_at AS session_expires_at
        FROM auth.demo_admin_sessions s JOIN auth.demo_admin_accounts a
          ON a.admin_account_id=s.admin_account_id
        WHERE s.token_hash=:hash AND s.expires_at>NOW()
          AND s.revoked_at IS NULL AND a.is_active=TRUE AND a.role='admin'"""),
        {'hash':token_hash(token)}).mappings().first()
    if row is None:
        raise HTTPException(status_code=401,detail='Phiên quản trị không hợp lệ hoặc hết hạn')
    return dict(row)


def revoke_admin(db:Session,token:str)->None:
    db.execute(text("""UPDATE auth.demo_admin_sessions SET revoked_at=NOW()
        WHERE token_hash=:hash AND revoked_at IS NULL"""),{'hash':token_hash(token)})
    db.commit()


def list_demo_users(db:Session)->list[dict]:
    """Read-only account directory. Never exposes password hashes or session tokens."""
    rows=db.execute(text("""
        SELECT username,display_name,role,is_active,created_at FROM auth.demo_accounts
        UNION ALL
        SELECT username,display_name,'lecturer',is_active,created_at FROM auth.demo_lecturer_accounts
        UNION ALL
        SELECT username,display_name,role,is_active,created_at FROM auth.demo_admin_accounts
        ORDER BY role,username
    """)).mappings().all()
    return [{**dict(row),'created_at':row['created_at'].isoformat()} for row in rows]
