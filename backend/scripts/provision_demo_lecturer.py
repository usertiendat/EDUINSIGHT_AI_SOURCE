"""Provision one lecturer demo with an existing CNTT instructor assignment.

Uses a class shared with the demo student when possible. Does not change warehouse.
Run from backend/: python -m scripts.provision_demo_lecturer
"""
from getpass import getpass
from sqlalchemy import text
from app.core.database import SessionLocal
from app.services.demo_auth import hash_password

USERNAME = 'lecturer.demo'
DISPLAY_NAME = 'Giảng viên CNTT (mô phỏng)'


def pick_instructor(db):
    return db.execute(text('''
       SELECT i.instructor_key, i.instructor_code, i.full_name,
              COUNT(DISTINCT cl.class_key) AS it_classes,
              COUNT(DISTINCT CASE WHEN a.account_id IS NOT NULL THEN e.class_key END) AS shared_demo_classes
       FROM warehouse.dim_instructor i
       JOIN warehouse.dim_class cl ON cl.instructor_key=i.instructor_key
       JOIN warehouse.dim_course c ON c.course_key=cl.course_key
       LEFT JOIN auth.demo_academic_enrollments e ON e.class_key=cl.class_key
       LEFT JOIN auth.demo_accounts a ON a.account_id=e.account_id AND a.username='student.demo'
       WHERE c.department_key=1
       GROUP BY i.instructor_key,i.instructor_code,i.full_name
       ORDER BY shared_demo_classes DESC,
                COUNT(DISTINCT cl.class_key) DESC, i.instructor_key ASC
       LIMIT 1
    ''')).mappings().first()


def main():
    with SessionLocal() as db:
        exists = db.execute(text("SELECT 1 FROM auth.demo_lecturer_accounts WHERE username=:u"), {'u':USERNAME}).first()
        if exists:
            raise SystemExit('lecturer.demo already exists; no changes made.')
        row = pick_instructor(db)
        if row is None:
            raise SystemExit('No CNTT instructor has assigned CNTT classes. No changes made.')
        print(f"Lecturer demo will reference {row['instructor_code']}, {row['it_classes']} assigned CNTT class(es).")
        print('The interface uses a fictional lecturer label, not a real instructor identity.')
        password = getpass('New lecturer password (12-128 characters): ')
        confirm = getpass('Confirm password: ')
        if password != confirm or not 12 <= len(password) <= 128:
            raise SystemExit('Invalid password confirmation or length. No changes made.')
        db.execute(text('''INSERT INTO auth.demo_lecturer_accounts
             (username, display_name, instructor_key, password_hash)
             VALUES (:u,:name,:ikey,:pw)'''), {
            'u':USERNAME, 'name':DISPLAY_NAME, 'ikey':row['instructor_key'],
            'pw':hash_password(password),
        })
        db.commit()
        print('lecturer.demo account created. Password never printed or logged.')

if __name__ == '__main__':
    main()
