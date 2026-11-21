"""Deterministic, idempotent academic demo seed; does not modify warehouse fact rows.
Usage: python -m scripts.seed_demo_academic --preview
       python -m scripts.seed_demo_academic --apply
"""
import argparse
from sqlalchemy import text
from app.core.database import engine

USERNAME = "student.demo"
# Exactly one class per distinct IT course across semesters 1..4 (verified against user's DB).
CLASS_CODES = ("CLS0002", "CLS0008", "CLS0039", "CLS0047", "CLS0055", "CLS0075", "CLS0091", "CLS0083")
# 8 entries; deterministic points (quiz, exam). No official weighted course grade claimed.
POINTS = ((8.0, 8.5), (7.8, 8.2), (8.4, 8.0), (7.5, 8.0),
          (8.6, 8.4), (7.9, 8.1), (8.2, 8.6), (7.7, 8.3))


def main():
    parser = argparse.ArgumentParser()
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument("--preview", action="store_true")
    choice.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    with engine.begin() as connection:
        account = connection.execute(text("""
            SELECT account_id, display_name, role, is_active
            FROM auth.demo_accounts WHERE username = :name
        """), {"name": USERNAME}).mappings().one_or_none()
        if not account or account["role"] != "student" or not account["is_active"]:
            raise RuntimeError("student.demo must exist, be active and have student role")
        rows = connection.execute(text("""
            SELECT cl.class_key, cl.class_code, cl.semester_key, co.course_key,
                   co.course_code, co.course_name, co.department_key
            FROM warehouse.dim_class cl
            JOIN warehouse.dim_course co ON co.course_key = cl.course_key
            WHERE cl.class_code = ANY(:codes)
        """), {"codes": list(CLASS_CODES)}).mappings().all()
        by_code = {r["class_code"]: r for r in rows}
        if len(rows) != len(CLASS_CODES) or set(by_code) != set(CLASS_CODES):
            raise RuntimeError("Class catalogue missing/ambiguous; no changes made")
        if any(r["department_key"] != 1 for r in rows):
            raise RuntimeError("Non-IT class found; refusing to seed")
        if len({r["course_key"] for r in rows}) != 8:
            raise RuntimeError("Duplicate course across selected classes")
        if {r["semester_key"] for r in rows} != {1,2,3,4}:
            raise RuntimeError("Four expected semesters are not present")
        # Avoid silent replacement of an existing custom dataset.
        installed = connection.execute(text("SELECT to_regclass('auth.demo_academic_enrollments')")).scalar_one()
        if installed is None:
            raise RuntimeError("Run scripts.apply_demo_academic_schema first")
        prior = connection.execute(text("""
            SELECT array_agg(class_key ORDER BY class_key) AS keys
            FROM auth.demo_academic_enrollments WHERE account_id=:id
        """), {"id": account["account_id"]}).scalar_one()
        desired = sorted(r["class_key"] for r in rows)
        if prior is not None and prior != desired:
            raise RuntimeError("Different demo enrollment set already exists; refusing to overwrite")
        for code in CLASS_CODES:
            r = by_code[code]
            print(f"{code}: {r['course_code']} - {r['course_name']} (semester_key={r['semester_key']})")
        if args.preview:
            print("PREVIEW ONLY: no database changes")
            return
        aid = account["account_id"]
        for index, code in enumerate(CLASS_CODES):
            cid = by_code[code]["class_key"]
            connection.execute(text("""
                INSERT INTO auth.demo_academic_enrollments(account_id,class_key) VALUES (:aid,:cid)
                ON CONFLICT DO NOTHING
            """), {"aid":aid,"cid":cid})
            for typ, point in zip(("quiz", "exam"), POINTS[index]):
                connection.execute(text("""
                    INSERT INTO auth.demo_academic_grades(account_id,class_key,assessment_type,score)
                    VALUES (:aid,:cid,:typ,:score) ON CONFLICT DO NOTHING
                """), {"aid":aid,"cid":cid,"typ":typ,"score":point})
            for lesson in range(1,13):
                status = "absent" if (index + lesson) % 13 == 0 else ("late" if (index + lesson) % 7 == 0 else "present")
                connection.execute(text("""
                    INSERT INTO auth.demo_academic_attendance(account_id,class_key,lesson_no,attendance_status)
                    VALUES (:aid,:cid,:lesson,:status) ON CONFLICT DO NOTHING
                """), {"aid":aid,"cid":cid,"lesson":lesson,"status":status})
            for task in range(1,4):
                status = "missing" if (index+task)%11==0 else ("late" if (index+task)%5==0 else "submitted")
                score = None if status == "missing" else round(7.0 + (index+task)%5 * .5,2)
                connection.execute(text("""
                    INSERT INTO auth.demo_academic_assignments(account_id,class_key,assignment_no,submission_status,score)
                    VALUES (:aid,:cid,:task,:status,:score) ON CONFLICT DO NOTHING
                """), {"aid":aid,"cid":cid,"task":task,"status":status,"score":score})
        # Check exact counts before commit.
        expected = {"demo_academic_enrollments":8,"demo_academic_grades":16,
                    "demo_academic_attendance":96,"demo_academic_assignments":24}
        for table, count in expected.items():
            found = connection.execute(text(f"SELECT COUNT(*) FROM auth.{table} WHERE account_id=:id"), {"id":aid}).scalar_one()
            if found != count:
                raise RuntimeError(f"Inconsistent {table}: {found} != {count}; transaction rolled back")
    print("SUCCESS: fixed IT demo created for student.demo; warehouse rows unchanged")

if __name__ == "__main__":
    main()
