from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FactEnrollment(Base):
    __tablename__ = "fact_enrollment"

    __table_args__ = (
        UniqueConstraint(
            "student_key",
            "class_key",
            name="uq_enrollment_student_class",
        ),
        CheckConstraint(
            "enrollment_count >= 0",
            name="ck_enrollment_count_nonnegative",
        ),
        Index("ix_enrollment_semester", "semester_key"),
        {"schema": "warehouse"},
    )

    enrollment_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_student.student_key"), nullable=False
    )
    class_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_class.class_key"), nullable=False
    )
    semester_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_semester.semester_key"), nullable=False
    )
    date_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_date.date_key"), nullable=False
    )
    enrollment_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    enrollment_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )


class FactGrade(Base):
    __tablename__ = "fact_grades"

    __table_args__ = (
        UniqueConstraint(
            "student_key",
            "class_key",
            "assessment_key",
            "attempt_number",
            name="uq_grade_student_assessment_attempt",
        ),
        CheckConstraint(
            "attempt_number > 0",
            name="ck_grade_attempt_positive",
        ),
        CheckConstraint(
            "score >= 0 AND max_score > 0 AND score <= max_score",
            name="ck_grade_score_valid",
        ),
        Index("ix_grades_semester", "semester_key"),
        {"schema": "warehouse"},
    )

    grade_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_student.student_key"), nullable=False
    )
    class_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_class.class_key"), nullable=False
    )
    assessment_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_assessment.assessment_key"),
        nullable=False,
    )
    semester_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_semester.semester_key"), nullable=False
    )
    date_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_date.date_key"), nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )
    score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    max_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )


class FactAttendance(Base):
    __tablename__ = "fact_attendance"

    __table_args__ = (
        UniqueConstraint(
            "student_key",
            "class_key",
            "date_key",
            name="uq_attendance_student_class_date",
        ),
        CheckConstraint(
            "attendance_count >= 0",
            name="ck_attendance_count_nonnegative",
        ),
        Index("ix_attendance_date", "date_key"),
        {"schema": "warehouse"},
    )

    attendance_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_student.student_key"), nullable=False
    )
    class_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_class.class_key"), nullable=False
    )
    date_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_date.date_key"), nullable=False
    )
    attendance_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    attendance_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )


class FactAssignment(Base):
    __tablename__ = "fact_assignments"

    __table_args__ = (
        UniqueConstraint(
            "student_key",
            "class_key",
            "assessment_key",
            name="uq_assignment_student_class_assessment",
        ),
        CheckConstraint(
            "score IS NULL OR score >= 0",
            name="ck_assignment_score_nonnegative",
        ),
        Index("ix_assignments_due_date", "due_date_key"),
        Index("ix_assignments_submission_date", "submission_date_key"),
        {"schema": "warehouse"},
    )

    assignment_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_student.student_key"), nullable=False
    )
    class_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_class.class_key"), nullable=False
    )
    assessment_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_assessment.assessment_key"),
        nullable=False,
    )
    due_date_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_date.date_key"), nullable=False
    )
    submission_date_key: Mapped[int | None] = mapped_column(
        ForeignKey("warehouse.dim_date.date_key")
    )
    submission_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    score: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))


class FactSurvey(Base):
    __tablename__ = "fact_surveys"

    __table_args__ = (
        UniqueConstraint(
            "student_key",
            "class_key",
            "assessment_key",
            name="uq_survey_student_class_assessment",
        ),
        CheckConstraint(
            "response_score IS NULL OR "
            "(response_score >= 0 AND response_score <= 5)",
            name="ck_survey_response_score_valid",
        ),
        CheckConstraint(
            "response_count >= 0",
            name="ck_survey_response_count_nonnegative",
        ),
        Index("ix_surveys_date", "date_key"),
        {"schema": "warehouse"},
    )

    survey_key: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    student_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_student.student_key"), nullable=False
    )
    class_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_class.class_key"), nullable=False
    )
    assessment_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_assessment.assessment_key"),
        nullable=False,
    )
    date_key: Mapped[int] = mapped_column(
        ForeignKey("warehouse.dim_date.date_key"), nullable=False
    )
    response_score: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2)
    )
    response_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )