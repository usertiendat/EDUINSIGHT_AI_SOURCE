"""Administrator API: session validation and read-only account inventory."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel,Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.demo_admin import current_admin,login_admin,revoke_admin,list_demo_users

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
def me(admin:dict=Depends(current_admin)):
    return {'status':'success','data':{'username':admin['username'],
      'display_name':admin['display_name'],'role':'admin',
      'session_expires_at':admin['session_expires_at'].isoformat()}}

@router.post('/logout')
def logout(request:Request,admin:dict=Depends(current_admin),db:Session=Depends(get_db)):
    revoke_admin(db,request.headers['Authorization'][7:])
    return {'status':'success'}

@router.get('/users')
def users(admin:dict=Depends(current_admin),db:Session=Depends(get_db)):
    return {'status':'success','data':list_demo_users(db)}
