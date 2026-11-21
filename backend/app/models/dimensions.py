
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


# =========================================================
# 1. DEPARTMENT
# =========================================================

class Department(Base):
    __tablename__ = "dim_department"
    __table_args__ = {"schema": "warehouse"}

    department_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    department_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    department_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(500))


# =========================================================
# 2. PROGRAM
# =========================================================

class Program(Base):
    __tablename__ = "dim_program"
    __table_args__ = {"schema": "warehouse"}

    program_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    program_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    program_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    degree_level: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    department_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_department.department_key"),
        nullable=False,
    )


# =========================================================
# 3. STUDENT
# =========================================================

class Student(Base):
    __tablename__ = "dim_student"
    __table_args__ = (
        UniqueConstraint(
            "student_code",
            "effective_from",
            name="uq_student_code_effective_from",
        ),
        {"schema": "warehouse"},
    )

    student_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_code: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    program_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_program.program_key"),
        nullable=False,
    )
    admission_year: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    study_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="active"
    )
    effective_from: Mapped[date] = mapped_column(
        Date, nullable=False
    )
    effective_to: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )


# =========================================================
# 4. COURSE
# =========================================================

class Course(Base):
    __tablename__ = "dim_course"
    __table_args__ = {"schema": "warehouse"}

    course_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    course_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    course_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    credits: Mapped[float] = mapped_column(
        Numeric(4, 1), nullable=False
    )
    department_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_department.department_key"),
        nullable=False,
    )


# =========================================================
# 5. SEMESTER
# =========================================================

class Semester(Base):
    __tablename__ = "dim_semester"
    __table_args__ = {"schema": "warehouse"}

    semester_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    semester_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    semester_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    academic_year: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)


# =========================================================
# 6. INSTRUCTOR
# =========================================================

class Instructor(Base):
    __tablename__ = "dim_instructor"
    __table_args__ = {"schema": "warehouse"}

    instructor_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    instructor_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    department_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_department.department_key"),
        nullable=False,
    )
    academic_title: Mapped[str | None] = mapped_column(String(100))


# =========================================================
# 7. CLASS
# =========================================================

class CourseClass(Base):
    __tablename__ = "dim_class"
    __table_args__ = (
        UniqueConstraint(
            "class_code",
            "semester_key",
            name="uq_class_code_semester",
        ),
        {"schema": "warehouse"},
    )

    class_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    class_code: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    class_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    course_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_course.course_key"),
        nullable=False,
    )
    semester_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_semester.semester_key"),
        nullable=False,
    )
    instructor_key: Mapped[int | None] = mapped_column(
        ForeignKey("warehouse.dim_instructor.instructor_key")
    )


# =========================================================
# 8. ASSESSMENT
# =========================================================

class Assessment(Base):
    __tablename__ = "dim_assessment"
    __table_args__ = {"schema": "warehouse"}

    assessment_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    assessment_code: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False
    )
    assessment_name: Mapped[str] = mapped_column(
        String(150), nullable=False
    )
    assessment_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )


# =========================================================
# 9. DATE
# =========================================================

class DateDimension(Base):
    __tablename__ = "dim_date"
    __table_args__ = {"schema": "warehouse"}

    date_key: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )
    full_date: Mapped[date] = mapped_column(
        Date, unique=True, nullable=False
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    quarter: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    week_of_year: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
