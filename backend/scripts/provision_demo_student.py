"""Provision ONE VAA-context synthetic student account without rewriting facts.
Run: python -m scripts.provision_demo_student (from backend/ directory).
"""
from __future__ import annotations

from getpass import getpass

from sqlalchemy import text

from app.core.database import SessionLocal
from app.services.demo_auth import hash_password

USERNAME = 'student.demo'
DISPLAY_NAME = 'Trần Thế Phúc'


def main():
    with SessionLocal() as db:
        # Use a current student with existing fact enrollment, belonging to an IT program.
        rows = db.execute(text("""
          SELECT s.student_key, s.student_code, p.program_name, d.department_name,
             (SELECT COUNT(*) FROM warehouse.fact_enrollment e WHERE e.student_key = s.student_key) AS enrollments
          FROM warehouse.dim_student s
          JOIN warehouse.dim_program p ON p.program_key = s.program_key
          JOIN warehouse.dim_department d ON d.department_key = p.department_key
          WHERE s.is_current = TRUE
            AND (p.program_name ILIKE :pattern OR d.department_name ILIKE :pattern)
            AND (SELECT COUNT(*) FROM warehouse.dim_student q
                 WHERE q.student_code = s.student_code AND q.is_current = TRUE) = 1
          ORDER BY enrollments DESC, s.student_key ASC LIMIT 5
        """), {"pattern": "%công nghệ thông tin%"}).mappings().all()
        if not rows:
            raise SystemExit('Khong tim thay sinh vien nganh CNTT. Khong co thay doi DB.')
        chosen = next((r for r in rows if r['enrollments'] > 0), None)
        if chosen is None:
            raise SystemExit('Sinh vien CNTT chua co du lieu dang ky. Khong tao tai khoan rong.')
        existing = db.execute(text("SELECT account_id FROM auth.demo_accounts WHERE username=:u"),
                              {"u": USERNAME}).first()
        if existing:
            raise SystemExit('Tai khoan student.demo da ton tai. Khong ghi de mat khau/ho so.')
        print(f"Lien ket tai khoan demo voi {chosen['student_code']}; nganh {chosen['program_name']}; {chosen['enrollments']} luot dang ky.")
        print('Ten hien thi tren cong sinh vien: Trần Thế Phúc (MO PHONG).')
        password = getpass('Tao mat khau demo (toi thieu 12 ky tu): ')
        confirm = getpass('Nhap lai mat khau: ')
        if password != confirm or len(password) < 12 or len(password) > 128:
            raise SystemExit('Mat khau khong khop hoac khong dung do dai 12-128.')
        db.execute(text("""INSERT INTO auth.demo_accounts
          (username, display_name, student_key, password_hash) VALUES (:u,:name,:key,:pw)"""),
          {"u": USERNAME, "name": DISPLAY_NAME, "key": chosen['student_key'], "pw": hash_password(password)})
        db.commit()
        print('Da tao tai khoan demo. Mat khau khong duoc in/log.')


if __name__ == '__main__':
    main()
