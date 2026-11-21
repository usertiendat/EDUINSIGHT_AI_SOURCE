"""EduInsight AI application with demo student analytics API."""
from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1.analytics import router as analytics_router
from app.api.v1.students import router as students_router
from app.api.v1.demo_student import router as demo_router
from app.core.database import get_db

app = FastAPI(
    title="EduInsight AI API",
    description="Learning Data Warehouse & AI-powered Education Analytics Platform",
    version="1.0.0",
)

app.include_router(analytics_router, prefix="/api/v1")
app.include_router(students_router, prefix="/api/v1")
app.include_router(demo_router, prefix="/api/v1")


@app.get("/", tags=["System"])
def root():
    return {"message": "Welcome to EduInsight AI API", "status": "running"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "EduInsight AI Backend"}


@app.get("/health/database", tags=["Health"])
def database_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}
