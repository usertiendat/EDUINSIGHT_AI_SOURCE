"""Read-only post-seed verification. Fails loudly on any unexpected linkage."""
from sqlalchemy import text
from app.core.database import engine

EXPECTED = {
    "demo_academic_enrollments": 8,
    "demo_academic_grades": 16,
    "demo_academic_attendance": 96,
    "demo_academic_assignments": 24,
}


def main():
    with engine.connect() as db:
        aid = db.execute(text("SELECT account_id FROM auth.demo_accounts WHERE username='student.demo' AND is_active = TRUE AND role='student'")).scalar_one()
        counts = {}
        for tab, needed in EXPECTED.items():
            found = db.execute(text(f"SELECT COUNT(*) FROM auth.{tab} WHERE account_id=:aid"), {"aid":aid}).scalar_one()
            if found != needed:
                raise RuntimeError(f"{tab}: expected {needed}, found {found}")
            counts[tab] = found
        bad = db.execute(text("""
            SELECT COUNT(*) FROM auth.demo_academic_enrollments e
            JOIN warehouse.dim_class c ON c.class_key=e.class_key
            JOIN warehouse.dim_course co ON co.course_key=c.course_key
            WHERE e.account_id=:aid AND co.department_key <> 1
        """), {"aid":aid}).scalar_one()
        if bad:
            raise RuntimeError(f"Found {bad} class(es) outside CNTT")
        distinct = db.execute(text("""
            SELECT COUNT(DISTINCT co.course_key)
            FROM auth.demo_academic_enrollments e
            JOIN warehouse.dim_class cl ON cl.class_key=e.class_key
            JOIN warehouse.dim_course co ON co.course_key=cl.course_key
            WHERE e.account_id=:aid
        """), {"aid":aid}).scalar_one()
        if distinct != 8:
            raise RuntimeError("Expected exactly 8 unique CNTT courses")
        invalid = db.execute(text("""
            SELECT COUNT(*) FROM auth.demo_academic_grades g
            WHERE g.account_id=:aid AND (g.score < 0 OR g.score > 10)
        """), {"aid":aid}).scalar_one()
        if invalid:
            raise RuntimeError("Out-of-range assessment scores")
        print("PASS: isolated demo dataset valid", counts)
        print("PASS: 8 distinct CNTT courses; no other department")
        print("PASS: grades in 0..10. No Warehouse writes performed")

if __name__ == "__main__":
    main()
