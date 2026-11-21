"""Administrator API: session validation and read-only account inventory."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel,Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.demo_admin import login_admin,revoke_admin,list_demo_users
from app.services.admin_security_events import append_security_event, read_security_events
from app.core.rbac import require_admin_permission

router=APIRouter(prefix='/demo-admin',tags=['Admin demo'])
class LoginBody(BaseModel):
    username:str=Field(min_length=3,max_length=80)
    password:str=Field(min_length=1,max_length=256)

@router.post('/login')
def login(body:LoginBody,db:Session=Depends(get_db)):
    token=login_admin(db,body.username,body.password)
    if token is None: raise HTTPException(status_code=401,detail='Thông tin đăng nhập không hợp lệ')
    return {'access_token':token,'token_type':'bearer','expires_in':28800}

@router.get('/me')
def me(admin:dict=Depends(require_admin_permission("admin:profile:read"))):
    return {'status':'success','data':{'username':admin['username'],
      'display_name':admin['display_name'],'role':'admin',
      'session_expires_at':admin['session_expires_at'].isoformat()}}

@router.post('/logout')
def logout(request:Request,admin:dict=Depends(require_admin_permission("admin:session:revoke")),db:Session=Depends(get_db)):
    revoke_admin(db,request.headers['Authorization'][7:],admin['username'])
    return {'status':'success'}

@router.get('/users')
def users(admin:dict=Depends(require_admin_permission("admin:accounts:read")),db:Session=Depends(get_db)):
    return {'status':'success','data':list_demo_users(db)}

from app.services.demo_admin import set_demo_account_status, recent_admin_account_audit

class AccountStatusBody(BaseModel):
    is_active: bool
    reason: str = Field(min_length=8, max_length=500)

@router.patch('/users/{role}/{username}/status')
def update_user_status(role: str, username: str, body: AccountStatusBody,
                       admin: dict=Depends(require_admin_permission("admin:accounts:status_write")), db: Session=Depends(get_db)):
    return {'status':'success','data':set_demo_account_status(
        db, admin, role, username, body.is_active, body.reason)}

@router.get('/account-audit')
def account_audit(admin: dict=Depends(require_admin_permission("admin:account_audit:read")), db: Session=Depends(get_db)):
    return {'status':'success','data':recent_admin_account_audit(db)}

@router.get('/security-events')
def security_events(limit: int = 50, before_id: int | None = None,
                    event_type: str | None = None,
                    admin: dict = Depends(require_admin_permission("admin:security_events:read")),
                    db: Session = Depends(get_db)):
    if not 1 <= limit <= 100 or (before_id is not None and before_id < 1):
        raise HTTPException(status_code=422, detail='Tham số phân trang không hợp lệ')
    from app.services.admin_security_events import EVENT_TYPES
    if event_type is not None and event_type not in EVENT_TYPES:
        raise HTTPException(status_code=422, detail='Loại sự kiện không hợp lệ')
    return {'status': 'success', 'data': read_security_events(
        db, limit=limit, before_id=before_id, event_type=event_type)}
