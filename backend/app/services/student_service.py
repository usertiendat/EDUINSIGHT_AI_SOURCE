"""Read-only student analytics for synthetic university warehouse data.

The student feature is for LOCAL DEMO DATA only until login/RBAC is implemented.
"""
from sqlalchemy import text
from sqlalchemy.orm import Session


def list_students(db: Session, *, q: str, department_key: int | None,
                  program_key: int | None, status: str | None,
                  page: int, page_size: int) -> dict:
    filters = ["s.is_current = TRUE"]
    params: dict = {"limit": page_size, "offset": (page - 1) * page_size}
    if q.strip():
        # Escape wildcard characters so user input is treated as text.
        escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        params["pattern"] = f"%{escaped}%"
        filters.append("(s.student_code ILIKE :pattern ESCAPE '\\' OR s.full_name ILIKE :pattern ESCAPE '\\')")
    if department_key is not None:
        filters.append("p.department_key = :department_key")
        params["department_key"] = department_key
    if program_key is not None:
        filters.append("s.program_key = :program_key")
        params["program_key"] = program_key
    if status is not None:
        filters.append("s.study_status = :status")
        params["status"] = status

    where = " AND ".join(filters)
    source = """
        FROM warehouse.dim_student s
        JOIN warehouse.dim_program p ON p.program_key = s.program_key
        JOIN warehouse.dim_department d ON d.department_key = p.department_key
    """
    count = db.execute(text(f"SELECT COUNT(*) {source} WHERE {where}"), params).scalar_one()
    rows = db.execute(text(f"""
        SELECT s.student_code, s.full_name, s.admission_year, s.study_status,
               p.program_key, p.program_code, p.program_name,
               d.department_key, d.department_code, d.department_name
        {source}
        WHERE {where}
        ORDER BY s.student_code ASC, s.student_key ASC
        LIMIT :limit OFFSET :offset
    """), params).mappings().all()
    return {
        "items": [dict(row) for row in rows],
        "total": count,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (count + page_size - 1) // page_size),
    }


def get_student(db: Session, student_code: str) -> dict | None:
    student = db.execute(text("""
        SELECT s.student_key, s.student_code, s.full_name, s.admission_year,
               s.study_status, s.effective_from,
               p.program_key, p.program_code, p.program_name,
               d.department_key, d.department_code, d.department_name
        FROM warehouse.dim_student s
        JOIN warehouse.dim_program p ON p.program_key = s.program_key
        JOIN warehouse.dim_department d ON d.department_key = p.department_key
        WHERE s.student_code = :student_code AND s.is_current = TRUE
        ORDER BY s.effective_from DESC, s.student_key DESC
        LIMIT 1
    """), {"student_code": student_code}).mappings().first()
    if student is None:
        return None

    params = {"student_key": student["student_key"]}
    overview = db.execute(text("""
        SELECT
          (SELECT COUNT(*) FROM warehouse.fact_enrollment e
             WHERE e.student_key = :student_key AND e.enrollment_status = 'enrolled') AS enrollments,
          (SELECT ROUND(AVG(g.score / NULLIF(g.max_score, 0) * 10), 2)
             FROM warehouse.fact_grades g WHERE g.student_key = :student_key) AS average_grade,
          (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.attendance_status = 'present') /
             NULLIF(COUNT(*), 0), 2)
             FROM warehouse.fact_attendance a WHERE a.student_key = :student_key) AS attendance_rate,
          (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE a.submission_status IN ('submitted','late')) /
             NULLIF(COUNT(*), 0), 2)
             FROM warehouse.fact_assignments a WHERE a.student_key = :student_key) AS assignment_submission_rate
    """), params).mappings().one()

    course_rows = db.execute(text("""
        SELECT c.class_key, c.class_code, co.course_code, co.course_name,
               sem.semester_code, e.enrollment_status,
               (SELECT ROUND(AVG(g.score / NULLIF(g.max_score, 0) * 10), 2)
                  FROM warehouse.fact_grades g
                  WHERE g.student_key = e.student_key AND g.class_key = e.class_key) AS average_grade
        FROM warehouse.fact_enrollment e
        JOIN warehouse.dim_class c ON c.class_key = e.class_key
        JOIN warehouse.dim_course co ON co.course_key = c.course_key
        JOIN warehouse.dim_semester sem ON sem.semester_key = c.semester_key
        WHERE e.student_key = :student_key
        ORDER BY sem.start_date DESC, co.course_code, c.class_code
        LIMIT 100
    """), params).mappings().all()

    return {
        "student": {
            **{k: v for k, v in dict(student).items() if k != "student_key"},
            "effective_from": student["effective_from"].isoformat(),
        },
        "overview": {
            "enrollments": overview["enrollments"],
            "average_grade": float(overview["average_grade"]) if overview["average_grade"] is not None else None,
            "attendance_rate": float(overview["attendance_rate"]) if overview["attendance_rate"] is not None else None,
            "assignment_submission_rate": float(overview["assignment_submission_rate"]) if overview["assignment_submission_rate"] is not None else None,
        },
        "courses": [{**dict(r), "average_grade": float(r["average_grade"]) if r["average_grade"] is not None else None} for r in course_rows],
        "courses_truncated": len(course_rows) == 100,
    }


def get_filters(db: Session) -> dict:
    departments = db.execute(text("""
        SELECT department_key, department_code, department_name
        FROM warehouse.dim_department ORDER BY department_key
    """)).mappings().all()
    programs = db.execute(text("""
        SELECT program_key, program_code, program_name, department_key
        FROM warehouse.dim_program ORDER BY program_key
    """)).mappings().all()
    return {"departments": [dict(x) for x in departments],
            "programs": [dict(x) for x in programs]}
