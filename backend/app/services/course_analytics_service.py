
"""Course Analytics Service for EduInsight AI."""

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_course_statistics(db: Session) -> list[dict]:
    """Return course-level analytics without duplicating fact records."""

    query = text("""
        WITH class_stats AS (
            SELECT
                course_key,
                COUNT(*) AS total_classes
            FROM warehouse.dim_class
            GROUP BY course_key
        ),

        enrollment_stats AS (
            SELECT
                c.course_key,
                COUNT(*) FILTER (
                    WHERE e.enrollment_status = 'enrolled'
                ) AS total_enrollments,
                COUNT(DISTINCT s.student_code) FILTER (
                    WHERE e.enrollment_status = 'enrolled'
                ) AS total_students
            FROM warehouse.fact_enrollment e
            JOIN warehouse.dim_class c
                ON e.class_key = c.class_key
            JOIN warehouse.dim_student s
                ON e.student_key = s.student_key
            GROUP BY c.course_key
        ),

        grade_stats AS (
            SELECT
                c.course_key,
                COUNT(*) AS total_grade_records,
                ROUND(
                    AVG(g.score / NULLIF(g.max_score, 0) * 10),
                    2
                ) AS average_grade
            FROM warehouse.fact_grades g
            JOIN warehouse.dim_class c
                ON g.class_key = c.class_key
            GROUP BY c.course_key
        ),

        attendance_stats AS (
            SELECT
                c.course_key,
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
            GROUP BY c.course_key
        ),

        assignment_stats AS (
            SELECT
                c.course_key,
                COUNT(*) AS total_assignments,
                ROUND(
                    100.0 * COUNT(*) FILTER (
                        WHERE a.submission_status IN ('submitted', 'late')
                    ) / NULLIF(COUNT(*), 0),
                    2
                ) AS assignment_submission_rate
            FROM warehouse.fact_assignments a
            JOIN warehouse.dim_class c
                ON a.class_key = c.class_key
            GROUP BY c.course_key
        )

        SELECT
            co.course_key,
            co.course_code,
            co.course_name,
            co.credits,
            d.department_code,
            d.department_name,

            COALESCE(cs.total_classes, 0) AS total_classes,
            COALESCE(e.total_students, 0) AS total_students,
            COALESCE(e.total_enrollments, 0) AS total_enrollments,
            COALESCE(g.total_grade_records, 0) AS total_grade_records,
            g.average_grade,

            COALESCE(
                at.total_attendance_records, 0
            ) AS total_attendance_records,
            at.attendance_rate,

            COALESCE(
                ass.total_assignments, 0
            ) AS total_assignments,
            ass.assignment_submission_rate

        FROM warehouse.dim_course co

        JOIN warehouse.dim_department d
            ON co.department_key = d.department_key

        LEFT JOIN class_stats cs
            ON co.course_key = cs.course_key

        LEFT JOIN enrollment_stats e
            ON co.course_key = e.course_key

        LEFT JOIN grade_stats g
            ON co.course_key = g.course_key

        LEFT JOIN attendance_stats at
            ON co.course_key = at.course_key

        LEFT JOIN assignment_stats ass
            ON co.course_key = ass.course_key

        ORDER BY co.course_key
    """)

    rows = db.execute(query).mappings().all()

    def optional_float(value):
        return float(value) if value is not None else None

    return [
        {
            "course_key": row["course_key"],
            "course_code": row["course_code"],
            "course_name": row["course_name"],
            "credits": optional_float(row["credits"]),
            "department_code": row["department_code"],
            "department_name": row["department_name"],
            "total_classes": row["total_classes"],
            "total_students": row["total_students"],
            "total_enrollments": row["total_enrollments"],
            "total_grade_records": row["total_grade_records"],
            "average_grade": optional_float(row["average_grade"]),
            "total_attendance_records": row["total_attendance_records"],
            "attendance_rate": optional_float(row["attendance_rate"]),
            "total_assignments": row["total_assignments"],
            "assignment_submission_rate": optional_float(
                row["assignment_submission_rate"]
            ),
        }
        for row in rows
    ]
