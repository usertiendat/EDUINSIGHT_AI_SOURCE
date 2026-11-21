"""Analytics API Router for EduInsight AI."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.rbac import require_admin_permission

from app.services.analytics_service import (
    get_overview_statistics,
    get_department_statistics,
    get_semester_statistics,
)

from app.services.course_analytics_service import (
    get_course_statistics,
)


router = APIRouter(
    dependencies=[Depends(require_admin_permission("admin:analytics:read"))],
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/overview")
def analytics_overview(db: Session = Depends(get_db)):
    return {
        "status": "success",
        "data": get_overview_statistics(db),
    }


@router.get("/departments")
def analytics_departments(db: Session = Depends(get_db)):
    return {
        "status": "success",
        "data": get_department_statistics(db),
    }


@router.get("/semesters")
def analytics_semesters(db: Session = Depends(get_db)):
    return {
        "status": "success",
        "data": get_semester_statistics(db),
    }


@router.get("/courses")
def analytics_courses(db: Session = Depends(get_db)):
    return {
        "status": "success",
        "data": get_course_statistics(db),
    }
