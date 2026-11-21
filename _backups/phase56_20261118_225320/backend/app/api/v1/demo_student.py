"""Authenticated demo student APIs; account identity is never provided by the browser."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.demo_auth import authenticate, current_student, revoke
from app.services.demo_academic import read_demo_academic

router = APIRouter(prefix="/demo-auth", tags=["Student demo authentication"])

class LoginBody(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=1, max_length=256)

@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    token = authenticate(db, body.username, body.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Thông tin đăng nhập không hợp lệ")
    return {"access_token": token, "token_type": "bearer", "expires_in": 8 * 3600}

@router.post("/logout")
def logout(request: Request, user: dict = Depends(current_student), db: Session = Depends(get_db)):
    revoke(db, request.headers["authorization"][7:])
    return {"status": "success"}

@router.get("/me")
def me(user: dict = Depends(current_student), db: Session = Depends(get_db)):
    if user["username"] != "student.demo":
        raise HTTPException(status_code=403, detail="Tài khoản không có quyền xem hồ sơ mô phỏng")
    try:
        result = read_demo_academic(db, user)
    except ValueError:
        raise HTTPException(status_code=409, detail="Chưa khởi tạo đầy đủ dữ liệu học tập mô phỏng")
    return {"status":"success","data":result}
