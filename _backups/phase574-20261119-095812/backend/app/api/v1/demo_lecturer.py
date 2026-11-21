"""Demo lecturer endpoints; every private endpoint checks lecturer-session token."""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.demo_lecturer import (
 login_lecturer, current_lecturer, logout_lecturer,
 lecturer_classes, lecturer_class_students,
)
from fastapi import HTTPException

router=APIRouter(prefix='/demo-lecturer',tags=['Lecturer demo'])

class LoginBody(BaseModel):
 username:str=Field(min_length=3,max_length=80)
 password:str=Field(min_length=1,max_length=256)

@router.post('/login')
def login(body:LoginBody, db:Session=Depends(get_db)):
 token=login_lecturer(db,body.username,body.password)
 if token is None:
  raise HTTPException(status_code=401,detail='Thông tin đăng nhập không hợp lệ')
 return {'access_token':token,'token_type':'bearer','expires_in':28800}

@router.get('/me')
def me(user:dict=Depends(current_lecturer),db:Session=Depends(get_db)):
 classes=lecturer_classes(db,user['instructor_key'])
 return {'status':'success','data':{
   'lecturer':{'display_name':user['display_name'],'username':user['username'],
               'role':'lecturer','instructor_key':user['instructor_key']},
   'classes':classes,
   'overview':{'total_classes':len(classes),
               'total_students':sum(int(x['warehouse_students'])+int(x['demo_students']) for x in classes)},
   'dataset':'synthetic-cntt-lecturer-v1'
 }}

@router.get('/classes/{class_key}')
def class_detail(class_key:int,user:dict=Depends(current_lecturer),db:Session=Depends(get_db)):
 return {'status':'success','data':lecturer_class_students(db,user['instructor_key'],class_key)}

@router.post('/logout')
def logout(request:Request,user:dict=Depends(current_lecturer),db:Session=Depends(get_db)):
 logout_lecturer(db,request.headers['authorization'][7:])
 return {'status':'success'}
