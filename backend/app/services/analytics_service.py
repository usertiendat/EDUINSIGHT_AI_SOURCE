
"""Analytics Service for EduInsight AI.

Read-only analytics queries against the PostgreSQL Data Warehouse.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session


# ============================================================
# 1. UNIVERSITY OVERVIEW
# ============================================================

def get_overview_statistics(db: Session) -> dict:
    """Calculate university-wide dashboard indicators."""

    query = text("""
        SELECT
            (
                SELECT COUNT(*)
                FROM warehouse.dim_student
                WHERE is_current = TRUE
            ) AS total_students,

            (
                SELECT COUNT(*)
                FROM warehouse.dim_instructor
            ) AS total_instructors,

            (
                SELECT COUNT(*)
                FROM warehouse.dim_course
            ) AS total_courses,

            (
                SELECT COUNT(*)
                FROM warehouse.dim_class
            ) AS total_classes,

            (
                SELECT COUNT(*)
                FROM warehouse.fact_enrollment
                WHERE enrollment_status = 'enrolled'
            ) AS total_enrollments,

            (
                SELECT ROUND(
                    AVG(score / NULLIF(max_score, 0) * 10),
                    2
                )
                FROM warehouse.fact_grades
            ) AS average_grade,

            (
                SELECT ROUND(
                    100.0 * COUNT(*) FILTER (
                        WHERE attendance_status = 'present'
                    ) / NULLIF(COUNT(*), 0),
                    2
                )
                FROM warehouse.fact_attendance
            ) AS attendance_rate,

            (
                SELECT ROUND(
                    100.0 * COUNT(*) FILTER (
                        WHERE submission_status IN ('submitted', 'late')
                    ) / NULLIF(COUNT(*), 0),
                    2
                )
                FROM warehouse.fact_assignments
            ) AS assignment_submission_rate
    """)

    result = db.execute(query).mappings().one()

    return {
        "total_students": result["total_students"],
        "total_instructors": result["total_instructors"],
        "total_courses": result["total_courses"],
        "total_classes": result["total_classes"],
        "total_enrollments": result["total_enrollments"],
        "average_grade": (
            float(result["average_grade"])
            if result["average_grade"] is not None
            else None
        ),
        "attendance_rate": (
            float(result["attendance_rate"])
            if result["attendance_rate"] is not None
            else None
        ),
        "assignment_submission_rate": (
            float(result["assignment_submission_rate"])
            if result["assignment_submission_rate"] is not None
            else None
        ),
    }


# ============================================================
# 2. DEPARTMENT ANALYTICS
# ============================================================

def get_department_statistics(db: Session) -> list[dict]:
    """Calculate student, course and instructor counts by department."""

    query = text("""
        WITH student_counts AS (
            SELECT
                p.department_key,
                COUNT(DISTINCT s.student_code) AS total_students
            FROM warehouse.dim_student s
            JOIN warehouse.dim_program p
                ON s.program_key = p.program_key
            WHERE s.is_current = TRUE
            GROUP BY p.department_key
        ),

        course_counts AS (
            SELECT
                department_key,
                COUNT(*) AS total_courses
            FROM warehouse.dim_course
            GROUP BY department_key
        ),

        instructor_counts AS (
            SELECT
                department_key,
                COUNT(*) AS total_instructors
            FROM warehouse.dim_instructor
            GROUP BY department_key
        )

        SELECT
            d.department_key,
            d.department_code,
            d.department_name,

            COALESCE(
                s.total_students, 0
            ) AS total_students,

            COALESCE(
                c.total_courses, 0
            ) AS total_courses,

            COALESCE(
                i.total_instructors, 0
            ) AS total_instructors

        FROM warehouse.dim_department d

        LEFT JOIN student_counts s
            ON d.department_key = s.department_key

        LEFT JOIN course_counts c
            ON d.department_key = c.department_key

        LEFT JOIN instructor_counts i
            ON d.department_key = i.department_key

        ORDER BY d.department_key
    """)

    results = db.execute(query).mappings().all()

    return [
        {
            "department_key": row["department_key"],
            "department_code": row["department_code"],
            "department_name": row["department_name"],
            "total_students": row["total_students"],
            "total_courses": row["total_courses"],
            "total_instructors": row["total_instructors"],
        }
        for row in results
    ]


# ============================================================
# 3. SEMESTER ANALYTICS
# ============================================================

def get_semester_statistics(db: Session) -> list[dict]:
    """Calculate analytics separately for each academic semester.

    Each fact table is aggregated before joining.
    This prevents duplicated counts caused by joining fact tables.
    """

    query = text("""
        WITH enrollment_stats AS (
            SELECT
                semester_key,

                COUNT(*) FILTER (
                    WHERE enrollment_status = 'enrolled'
                ) AS total_enrollments,

                COUNT(DISTINCT student_key) FILTER (
                    WHERE enrollment_status = 'enrolled'
                ) AS total_students

            FROM warehouse.fact_enrollment
            GROUP BY semester_key
        ),

        grade_stats AS (
            SELECT
                semester_key,

                COUNT(*) AS total_grade_records,

                ROUND(
                    AVG(score / NULLIF(max_score, 0) * 10),
                    2
                ) AS average_grade

            FROM warehouse.fact_grades
            GROUP BY semester_key
        ),

        attendance_stats AS (
            SELECT
                c.semester_key,

                COUNT(*) AS total_attendance_records,

                ROUND(
                    100.0 * COUNT(*) FILTER (
                        WHERE a.attendance_status = 'present'
                    ) / NULLIF(COUNT(*), 0),
                    2
                ) AS attendance_rate

            FROM warehouse.fact_attendance a

            JOIN warehouse.dim_class c
                ON a.class_key = c.class_key

            GROUP BY c.semester_key
        ),

        assignment_stats AS (
            SELECT
                c.semester_key,

                COUNT(*) AS total_assignments,

                ROUND(
                    100.0 * COUNT(*) FILTER (
                        WHERE a.submission_status IN (
                            'submitted', 'late'
                        )
                    ) / NULLIF(COUNT(*), 0),
                    2
                ) AS assignment_submission_rate

            FROM warehouse.fact_assignments a

            JOIN warehouse.dim_class c
                ON a.class_key = c.class_key

            GROUP BY c.semester_key
        ),

        class_stats AS (
            SELECT
                semester_key,
                COUNT(*) AS total_classes
            FROM warehouse.dim_class
            GROUP BY semester_key
        )

        SELECT
            s.semester_key,
            s.semester_code,
            s.semester_name,
            s.academic_year,
            s.start_date,
            s.end_date,

            COALESCE(
                cs.total_classes, 0
            ) AS total_classes,

            COALESCE(
                e.total_students, 0
            ) AS total_students,

            COALESCE(
                e.total_enrollments, 0
            ) AS total_enrollments,

            COALESCE(
                g.total_grade_records, 0
            ) AS total_grade_records,

            g.average_grade,

            COALESCE(
                a.total_attendance_records, 0
            ) AS total_attendance_records,

            a.attendance_rate,

            COALESCE(
                ass.total_assignments, 0
            ) AS total_assignments,

            ass.assignment_submission_rate

        FROM warehouse.dim_semester s

        LEFT JOIN class_stats cs
            ON s.semester_key = cs.semester_key

        LEFT JOIN enrollment_stats e
            ON s.semester_key = e.semester_key

        LEFT JOIN grade_stats g
            ON s.semester_key = g.semester_key

        LEFT JOIN attendance_stats a
            ON s.semester_key = a.semester_key

        LEFT JOIN assignment_stats ass
            ON s.semester_key = ass.semester_key

        ORDER BY s.start_date, s.semester_key
    """)

    rows = db.execute(query).mappings().all()

    results = []

    for row in rows:
        results.append({
            "semester_key": row["semester_key"],
            "semester_code": row["semester_code"],
            "semester_name": row["semester_name"],
            "academic_year": row["academic_year"],
            "start_date": (
                row["start_date"].isoformat()
                if row["start_date"] is not None
                else None
            ),
            "end_date": (
                row["end_date"].isoformat()
                if row["end_date"] is not None
                else None
            ),
            "total_classes": row["total_classes"],
            "total_students": row["total_students"],
            "total_enrollments": row["total_enrollments"],
            "total_grade_records": row["total_grade_records"],
            "average_grade": (
                float(row["average_grade"])
                if row["average_grade"] is not None
                else None
            ),
            "total_attendance_records": (
                row["total_attendance_records"]
            ),
            "attendance_rate": (
                float(row["attendance_rate"])
                if row["attendance_rate"] is not None
                else None
            ),
            "total_assignments": row["total_assignments"],
            "assignment_submission_rate": (
                float(row["assignment_submission_rate"])
                if row["assignment_submission_rate"] is not None
                else None
            ),
        })

    return results
