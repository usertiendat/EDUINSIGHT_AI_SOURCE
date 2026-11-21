
"""create warehouse fact tables

Revision ID: 75f2fe450798
Revises: 57cc6b9b0014
Create Date: 2026-11-04 13:58:27.109264
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "75f2fe450798"
down_revision: Union[str, Sequence[str], None] = "57cc6b9b0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('fact_assignments',
    sa.Column('assignment_key', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('student_key', sa.Integer(), nullable=False),
    sa.Column('class_key', sa.Integer(), nullable=False),
    sa.Column('assessment_key', sa.Integer(), nullable=False),
    sa.Column('due_date_key', sa.Integer(), nullable=False),
    sa.Column('submission_date_key', sa.Integer(), nullable=True),
    sa.Column('submission_status', sa.String(length=30), nullable=False),
    sa.Column('score', sa.Numeric(precision=6, scale=2), nullable=True),
    sa.CheckConstraint('score IS NULL OR score >= 0', name='ck_assignment_score_nonnegative'),
    sa.ForeignKeyConstraint(['assessment_key'], ['warehouse.dim_assessment.assessment_key']),
    sa.ForeignKeyConstraint(['class_key'], ['warehouse.dim_class.class_key']),
    sa.ForeignKeyConstraint(['due_date_key'], ['warehouse.dim_date.date_key']),
    sa.ForeignKeyConstraint(['student_key'], ['warehouse.dim_student.student_key']),
    sa.ForeignKeyConstraint(['submission_date_key'], ['warehouse.dim_date.date_key']),
    sa.PrimaryKeyConstraint('assignment_key'),
    sa.UniqueConstraint('student_key', 'class_key', 'assessment_key', name='uq_assignment_student_class_assessment'),
    schema='warehouse'
    )
    op.create_index('ix_assignments_due_date', 'fact_assignments', ['due_date_key'], unique=False, schema='warehouse')
    op.create_index('ix_assignments_submission_date', 'fact_assignments', ['submission_date_key'], unique=False, schema='warehouse')

    op.create_table('fact_attendance',
    sa.Column('attendance_key', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('student_key', sa.Integer(), nullable=False),
    sa.Column('class_key', sa.Integer(), nullable=False),
    sa.Column('date_key', sa.Integer(), nullable=False),
    sa.Column('attendance_status', sa.String(length=30), nullable=False),
    sa.Column('attendance_count', sa.Integer(), nullable=False),
    sa.CheckConstraint('attendance_count >= 0', name='ck_attendance_count_nonnegative'),
    sa.ForeignKeyConstraint(['class_key'], ['warehouse.dim_class.class_key']),
    sa.ForeignKeyConstraint(['date_key'], ['warehouse.dim_date.date_key']),
    sa.ForeignKeyConstraint(['student_key'], ['warehouse.dim_student.student_key']),
    sa.PrimaryKeyConstraint('attendance_key'),
    sa.UniqueConstraint('student_key', 'class_key', 'date_key', name='uq_attendance_student_class_date'),
    schema='warehouse'
    )
    op.create_index('ix_attendance_date', 'fact_attendance', ['date_key'], unique=False, schema='warehouse')

    op.create_table('fact_enrollment',
    sa.Column('enrollment_key', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('student_key', sa.Integer(), nullable=False),
    sa.Column('class_key', sa.Integer(), nullable=False),
    sa.Column('semester_key', sa.Integer(), nullable=False),
    sa.Column('date_key', sa.Integer(), nullable=False),
    sa.Column('enrollment_status', sa.String(length=30), nullable=False),
    sa.Column('enrollment_count', sa.Integer(), nullable=False),
    sa.CheckConstraint('enrollment_count >= 0', name='ck_enrollment_count_nonnegative'),
    sa.ForeignKeyConstraint(['class_key'], ['warehouse.dim_class.class_key']),
    sa.ForeignKeyConstraint(['date_key'], ['warehouse.dim_date.date_key']),
    sa.ForeignKeyConstraint(['semester_key'], ['warehouse.dim_semester.semester_key']),
    sa.ForeignKeyConstraint(['student_key'], ['warehouse.dim_student.student_key']),
    sa.PrimaryKeyConstraint('enrollment_key'),
    sa.UniqueConstraint('student_key', 'class_key', name='uq_enrollment_student_class'),
    schema='warehouse'
    )
    op.create_index('ix_enrollment_semester', 'fact_enrollment', ['semester_key'], unique=False, schema='warehouse')

    op.create_table('fact_grades',
    sa.Column('grade_key', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('student_key', sa.Integer(), nullable=False),
    sa.Column('class_key', sa.Integer(), nullable=False),
    sa.Column('assessment_key', sa.Integer(), nullable=False),
    sa.Column('semester_key', sa.Integer(), nullable=False),
    sa.Column('date_key', sa.Integer(), nullable=False),
    sa.Column('attempt_number', sa.Integer(), nullable=False),
    sa.Column('score', sa.Numeric(precision=6, scale=2), nullable=False),
    sa.Column('max_score', sa.Numeric(precision=6, scale=2), nullable=False),
    sa.CheckConstraint('attempt_number > 0', name='ck_grade_attempt_positive'),
    sa.CheckConstraint('score >= 0 AND max_score > 0 AND score <= max_score', name='ck_grade_score_valid'),
    sa.ForeignKeyConstraint(['assessment_key'], ['warehouse.dim_assessment.assessment_key']),
    sa.ForeignKeyConstraint(['class_key'], ['warehouse.dim_class.class_key']),
    sa.ForeignKeyConstraint(['date_key'], ['warehouse.dim_date.date_key']),
    sa.ForeignKeyConstraint(['semester_key'], ['warehouse.dim_semester.semester_key']),
    sa.ForeignKeyConstraint(['student_key'], ['warehouse.dim_student.student_key']),
    sa.PrimaryKeyConstraint('grade_key'),
    sa.UniqueConstraint('student_key', 'class_key', 'assessment_key', 'attempt_number', name='uq_grade_student_assessment_attempt'),
    schema='warehouse'
    )
    op.create_index('ix_grades_semester', 'fact_grades', ['semester_key'], unique=False, schema='warehouse')

    op.create_table('fact_surveys',
    sa.Column('survey_key', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('student_key', sa.Integer(), nullable=False),
    sa.Column('class_key', sa.Integer(), nullable=False),
    sa.Column('assessment_key', sa.Integer(), nullable=False),
    sa.Column('date_key', sa.Integer(), nullable=False),
    sa.Column('response_score', sa.Numeric(precision=3, scale=2), nullable=True),
    sa.Column('response_count', sa.Integer(), nullable=False),
    sa.CheckConstraint('response_count >= 0', name='ck_survey_response_count_nonnegative'),
    sa.CheckConstraint('response_score IS NULL OR (response_score >= 0 AND response_score <= 5)', name='ck_survey_response_score_valid'),
    sa.ForeignKeyConstraint(['assessment_key'], ['warehouse.dim_assessment.assessment_key']),
    sa.ForeignKeyConstraint(['class_key'], ['warehouse.dim_class.class_key']),
    sa.ForeignKeyConstraint(['date_key'], ['warehouse.dim_date.date_key']),
    sa.ForeignKeyConstraint(['student_key'], ['warehouse.dim_student.student_key']),
    sa.PrimaryKeyConstraint('survey_key'),
    sa.UniqueConstraint('student_key', 'class_key', 'assessment_key', name='uq_survey_student_class_assessment'),
    schema='warehouse'
    )
    op.create_index('ix_surveys_date', 'fact_surveys', ['date_key'], unique=False, schema='warehouse')


def downgrade() -> None:
    op.drop_index('ix_surveys_date', table_name='fact_surveys', schema='warehouse')
    op.drop_table('fact_surveys', schema='warehouse')

    op.drop_index('ix_grades_semester', table_name='fact_grades', schema='warehouse')
    op.drop_table('fact_grades', schema='warehouse')

    op.drop_index('ix_enrollment_semester', table_name='fact_enrollment', schema='warehouse')
    op.drop_table('fact_enrollment', schema='warehouse')

    op.drop_index('ix_attendance_date', table_name='fact_attendance', schema='warehouse')
    op.drop_table('fact_attendance', schema='warehouse')

    op.drop_index('ix_assignments_submission_date', table_name='fact_assignments', schema='warehouse')
    op.drop_index('ix_assignments_due_date', table_name='fact_assignments', schema='warehouse')
    op.drop_table('fact_assignments', schema='warehouse')
