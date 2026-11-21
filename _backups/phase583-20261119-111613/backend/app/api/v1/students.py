"""Synthetic student directory endpoints; development-only until RBAC is added."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.services.demo_admin import current_admin
from app.core.database import get_db
from app.services.student_service import get_filters, get_student, list_students

router = APIRouter(prefix="/students", tags=["Students (Demo)"], dependencies=[Depends(current_admin)])


@router.get("/filters")
def student_filters(db: Session = Depends(get_db)):
    return {"status": "success", "data": get_filters(db)}


@router.get("")
def students_list(
    q: str = Query("", max_length=100),
    department_key: int | None = Query(None, ge=1),
    program_key: int | None = Query(None, ge=1),
    status: str | None = Query(None, pattern="^(active|graduated|on_leave)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return {"status": "success", "data": list_students(
        db, q=q, department_key=department_key, program_key=program_key,
        status=status, page=page, page_size=page_size,
    )}


@router.get("/{student_code}")
def student_detail(student_code: str, db: Session = Depends(get_db)):
    if len(student_code) > 30:
        raise HTTPException(status_code=404, detail="Student not found")
    result = get_student(db, student_code)
    if result is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"status": "success", "data": result}
