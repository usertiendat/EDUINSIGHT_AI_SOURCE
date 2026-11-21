"""Account-scoped academic demo. Never reads warehouse fact records for the student portal."""
from sqlalchemy import text
from sqlalchemy.orm import Session


def read_demo_academic(db: Session, user: dict) -> dict:
    account_id = user["account_id"]  # taken exclusively from an authenticated server-side session
    courses = db.execute(text("""
        SELECT c.class_key, c.class_code, co.course_code, co.course_name,
               sem.semester_code, sem.semester_key, co.credits,
               quiz.score AS quiz_score, exam.score AS exam_score,
               (SELECT COUNT(*) FROM auth.demo_academic_attendance a
                WHERE a.account_id=:aid AND a.class_key=c.class_key) AS attendance_total,
               (SELECT COUNT(*) FROM auth.demo_academic_attendance a
                WHERE a.account_id=:aid AND a.class_key=c.class_key AND a.attendance_status='present') AS attendance_present,
               (SELECT COUNT(*) FROM auth.demo_academic_attendance a
                WHERE a.account_id=:aid AND a.class_key=c.class_key AND a.attendance_status='late') AS attendance_late,
               (SELECT COUNT(*) FROM auth.demo_academic_assignments a
                WHERE a.account_id=:aid AND a.class_key=c.class_key) AS assignment_total,
               (SELECT COUNT(*) FROM auth.demo_academic_assignments a
                WHERE a.account_id=:aid AND a.class_key=c.class_key AND a.submission_status IN ('submitted','late')) AS assignment_submitted
        FROM auth.demo_academic_enrollments e
        JOIN warehouse.dim_class c ON c.class_key=e.class_key
        JOIN warehouse.dim_course co ON co.course_key=c.course_key
        JOIN warehouse.dim_semester sem ON sem.semester_key=c.semester_key
        JOIN warehouse.dim_program p ON p.program_key=1
        LEFT JOIN auth.demo_academic_grades quiz ON quiz.account_id=e.account_id
           AND quiz.class_key=e.class_key AND quiz.assessment_type='quiz'
        LEFT JOIN auth.demo_academic_grades exam ON exam.account_id=e.account_id
           AND exam.class_key=e.class_key AND exam.assessment_type='exam'
        WHERE e.account_id=:aid AND co.department_key=1 AND p.department_key=1
        ORDER BY sem.start_date ASC, co.course_code ASC, c.class_code ASC
    """), {"aid": account_id}).mappings().all()
    result = []
    for r in courses:
        quiz = float(r["quiz_score"]) if r["quiz_score"] is not None else None
        exam = float(r["exam_score"]) if r["exam_score"] is not None else None
        grade_mean = round((quiz+exam)/2,2) if quiz is not None and exam is not None else None
        result.append({
            "class_key":r["class_key"], "class_code":r["class_code"],
            "course_code":r["course_code"], "course_name":r["course_name"],
            "semester_code":r["semester_code"], "semester_key":r["semester_key"],
            "credits":float(r["credits"]), "enrollment_status":"enrolled",
            "quiz_score":quiz,"exam_score":exam,"average_grade":grade_mean,
            "attendance_total":r["attendance_total"],"attendance_present":r["attendance_present"],
            "attendance_late":r["attendance_late"],
            "assignment_total":r["assignment_total"],"assignment_submitted":r["assignment_submitted"],
        })
    if len(result) != 8 or len({x["course_code"] for x in result}) != 8:
        # Fail closed instead of exposing a partial or mixed dataset.
        raise ValueError("Demo academic dataset has not been initialized consistently")
    averages = [x["average_grade"] for x in result if x["average_grade"] is not None]
    presence_total = sum(x["attendance_total"] for x in result)
    presence = sum(x["attendance_present"] for x in result)
    assignment_total = sum(x["assignment_total"] for x in result)
    submitted = sum(x["assignment_submitted"] for x in result)
    return {
        "student":{"student_code":"DEMO-CNTT-001","full_name":user["display_name"],
            "program_name":"Công nghệ thông tin","department_name":"Khoa Công nghệ thông tin",
            "is_demo_identity":True},
        "overview":{"enrollments":len(result),
            "average_grade":round(sum(averages)/len(averages),2) if averages else None,
            "attendance_rate":round(presence/presence_total*100,2) if presence_total else None,
            "assignment_submission_rate":round(submitted/assignment_total*100,2) if assignment_total else None},
        "courses":result,"courses_truncated":False,
        "dataset":"isolated-synthetic-it-v1",
    }
