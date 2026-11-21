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
    from app.services.admin_security_events import append_security_event
    try:
        row = db.execute(text("""
            SELECT admin_account_id, password_hash, failed_attempts, locked_until, is_active
            FROM auth.demo_admin_accounts WHERE username=:username FOR UPDATE
        """), {'username':username}).mappings().first()
        now = datetime.now(timezone.utc)
        if row is None or not row['is_active']:
            verify_password(password, hash_password('nonexistent-user', bytes(16)))
            append_security_event(db, event_type='admin_login_failed', actor_username=username, result='failure')
            db.commit()
            return None
        if row['locked_until'] and row['locked_until'] > now:
            append_security_event(db, event_type='admin_login_failed', actor_username=username, result='failure')
            db.commit()
            return None
        if not verify_password(password, row['password_hash']):
            count = int(row['failed_attempts']) + 1
            lock = now + timedelta(minutes=LOCK_MINUTES) if count >= MAX_FAILURES else None
            db.execute(text("""UPDATE auth.demo_admin_accounts
                SET failed_attempts=:count,locked_until=:lock WHERE admin_account_id=:id"""),
                {'count':0 if lock else count,'lock':lock,'id':row['admin_account_id']})
            append_security_event(db, event_type='admin_login_failed', actor_username=username, result='failure')
            db.commit()
            return None
        raw = secrets.token_urlsafe(48)
        db.execute(text("""UPDATE auth.demo_admin_accounts
            SET failed_attempts=0,locked_until=NULL,last_login_at=:now WHERE admin_account_id=:id"""),
            {'id':row['admin_account_id'],'now':now})
        db.execute(text("""INSERT INTO auth.demo_admin_sessions(admin_account_id, token_hash,expires_at)
            VALUES (:id,:hash,:expiry)"""),
            {'id':row['admin_account_id'],'hash':token_hash(raw),'expiry':now+timedelta(hours=SESSION_HOURS)})
        append_security_event(db, event_type='admin_login_success', actor_username=username, result='success')
        db.commit()
        return raw
    except Exception:
        db.rollback()
        raise

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


def revoke_admin(db:Session,token:str, actor_username: str)->None:
    from app.services.admin_security_events import append_security_event
    try:
        db.execute(text("""UPDATE auth.demo_admin_sessions SET revoked_at=NOW()
            WHERE token_hash=:hash AND revoked_at IS NULL"""), {'hash':token_hash(token)})
        append_security_event(db, event_type='admin_logout',
                              actor_username=actor_username, result='success')
        db.commit()
    except Exception:
        db.rollback()
        raise


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

# Phase 5.8.2: privilege-controlled demo account lifecycle.
# Table and key names are fixed server-side; never interpolated from request values.
_ACCOUNT_TABLES = {
    'student': ('auth.demo_accounts', 'account_id', 'auth.demo_sessions'),
    'lecturer': ('auth.demo_lecturer_accounts', 'lecturer_account_id', 'auth.demo_lecturer_sessions'),
    'admin': ('auth.demo_admin_accounts', 'admin_account_id', 'auth.demo_admin_sessions'),
}


def set_demo_account_status(db: Session, actor: dict, role: str, username: str, active: bool, reason: str) -> dict:
    """Atomic status update, session revocation and audit event (requires Phase 5.8.2 schema)."""
    if role not in _ACCOUNT_TABLES:
        raise HTTPException(status_code=404, detail='Vai trò không tồn tại')
    if not isinstance(reason, str) or not 8 <= len(reason.strip()) <= 500:
        raise HTTPException(status_code=422, detail='Lý do phải dài từ 8 đến 500 ký tự')
    table, key, sessions = _ACCOUNT_TABLES[role]
    # A transaction-scoped database advisory lock serializes all admin status changes.
    # Concurrent requests cannot both remove the last active administrator.
    try:
        db.execute(text('SELECT pg_advisory_xact_lock(5812)'))
        target = db.execute(text(f'''
            SELECT {key} AS id, username, is_active FROM {table}
            WHERE username=:username FOR UPDATE
        '''), {'username': username}).mappings().first()
        if target is None:
            raise HTTPException(status_code=404, detail='Không tìm thấy tài khoản')
        if role == 'admin' and not active:
            if int(target['id']) == int(actor['admin_account_id']):
                raise HTTPException(status_code=409, detail='Không thể tự vô hiệu hóa tài khoản quản trị đang sử dụng')
            remaining = db.execute(text('''
                SELECT count(*) FROM auth.demo_admin_accounts
                WHERE is_active=TRUE AND admin_account_id<>:id
            '''), {'id': target['id']}).scalar_one()
            if remaining < 1:
                raise HTTPException(status_code=409, detail='Phải duy trì ít nhất một quản trị viên hoạt động')
        before = bool(target['is_active'])
        if before == active:
            raise HTTPException(status_code=409, detail='Tài khoản đã ở trạng thái được yêu cầu')
        db.execute(text(f'UPDATE {table} SET is_active=:active WHERE {key}=:id'),
                   {'active': active, 'id': target['id']})
        revoked = 0
        if not active:
            result = db.execute(text(f'''UPDATE {sessions} SET revoked_at=NOW()
                WHERE {key}=:id AND revoked_at IS NULL AND expires_at>NOW()'''), {'id':target['id']})
            revoked = result.rowcount
        from app.services.admin_security_events import append_security_event
        append_security_event(db,
            event_type='account_activated' if active else 'account_deactivated',
            actor_username=actor['username'], result='success',
            target_role=role, target_username=username)
        db.execute(text('''
            INSERT INTO auth.demo_admin_account_audit
              (actor_admin_account_id, target_role, target_username, previous_active,
               new_active, reason, sessions_revoked)
            VALUES (:actor, :role, :username, :before, :after, :reason, :revoked)
        '''), {'actor': actor['admin_account_id'], 'role':role, 'username':username,
               'before':before, 'after':active,'reason':reason.strip(),'revoked':revoked})
        db.commit()
        return {'username':username,'role':role,'is_active':active,'sessions_revoked':revoked}
    except Exception:
        db.rollback()
        raise


def recent_admin_account_audit(db: Session, limit: int = 50) -> list[dict]:
    rows = db.execute(text('''
        SELECT log.audit_id, admin.username AS actor_username,
               log.target_role, log.target_username, log.previous_active,
               log.new_active, log.reason, log.sessions_revoked, log.created_at
        FROM auth.demo_admin_account_audit log
        JOIN auth.demo_admin_accounts admin ON admin.admin_account_id=log.actor_admin_account_id
        ORDER BY log.audit_id DESC LIMIT :limit
    '''), {'limit':max(1,min(limit,100))}).mappings().all()
    return [{**dict(row),'created_at':row['created_at'].isoformat()} for row in rows]
