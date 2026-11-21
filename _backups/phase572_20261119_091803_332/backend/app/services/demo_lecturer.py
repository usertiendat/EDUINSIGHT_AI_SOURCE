"""Lecturer-demo credentials and strict class-level authorization.

Only classes assigned to the authenticated instructor and belonging to
CNTT (department_key=1) are returned. No mutation of academic records.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.demo_auth import (
    ITERATIONS, LOCK_MINUTES, MAX_FAILURES, SESSION_HOURS,
    hash_password, verify_password, token_hash,
)


def login_lecturer(db: Session, username: str, password: str) -> str | None:
    row = db.execute(text('''
      SELECT lecturer_account_id, password_hash, is_active, failed_attempts, locked_until
      FROM auth.demo_lecturer_accounts WHERE username=:username FOR UPDATE
    '''), {'username': username}).mappings().first()
    now = datetime.now(timezone.utc)
    if row is None or not row['is_active']:
        # Comparable KDF work even when account does not exist.
        verify_password(password, hash_password('invalid-demo', bytes(16)))
        return None
    if row['locked_until'] and row['locked_until'] > now:
        db.rollback()
        return None
    if not verify_password(password, row['password_hash']):
        attempts = row['failed_attempts'] + 1
        locked = now + timedelta(minutes=LOCK_MINUTES) if attempts >= MAX_FAILURES else None
        db.execute(text('''UPDATE auth.demo_lecturer_accounts
          SET failed_attempts=:n, locked_until=:locked WHERE lecturer_account_id=:id'''), {
          'n': 0 if locked else attempts, 'locked': locked, 'id': row['lecturer_account_id'],
        })
        db.commit()
        return None
    raw = secrets.token_urlsafe(48)
    db.execute(text('''UPDATE auth.demo_lecturer_accounts
      SET failed_attempts=0, locked_until=NULL WHERE lecturer_account_id=:id'''),
      {'id': row['lecturer_account_id']})
    db.execute(text('''INSERT INTO auth.demo_lecturer_sessions
      (lecturer_account_id, token_hash, expires_at) VALUES (:id,:token,:expires)'''), {
      'id': row['lecturer_account_id'], 'token': token_hash(raw),
      'expires': now + timedelta(hours=SESSION_HOURS),
    })
    db.commit()
    return raw


def current_lecturer(request: Request, db: Session = Depends(get_db)) -> dict:
    bearer = request.headers.get('Authorization', '')
    if not bearer.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Cần đăng nhập giảng viên')
    token = bearer[7:]
    if not (30 <= len(token) <= 256):
        raise HTTPException(status_code=401, detail='Phiên không hợp lệ')
    lecturer = db.execute(text('''
      SELECT a.lecturer_account_id, a.username, a.display_name, a.instructor_key
      FROM auth.demo_lecturer_sessions s
      JOIN auth.demo_lecturer_accounts a ON a.lecturer_account_id=s.lecturer_account_id
      WHERE s.token_hash=:hash AND s.revoked_at IS NULL AND s.expires_at>NOW()
        AND a.is_active=TRUE
    '''), {'hash':token_hash(token)}).mappings().first()
    if lecturer is None:
        raise HTTPException(status_code=401, detail='Phiên không hợp lệ hoặc đã hết hạn')
    return dict(lecturer)


def logout_lecturer(db:Session, token:str) -> None:
    db.execute(text('''UPDATE auth.demo_lecturer_sessions SET revoked_at=NOW()
         WHERE token_hash=:hash AND revoked_at IS NULL'''), {'hash':token_hash(token)})
    db.commit()


def lecturer_classes(db:Session, instructor_key:int) -> list[dict]:
    rows=db.execute(text('''
       SELECT cl.class_key, cl.class_code, cl.class_name, c.course_code, c.course_name,
              c.credits, sm.semester_code, sm.academic_year,
              (SELECT COUNT(DISTINCT e.student_key) FROM warehouse.fact_enrollment e
                WHERE e.class_key=cl.class_key AND e.enrollment_status='enrolled') AS warehouse_students,
              (SELECT COUNT(*) FROM auth.demo_academic_enrollments e
                 JOIN auth.demo_accounts a ON a.account_id=e.account_id
                WHERE e.class_key=cl.class_key AND a.username='student.demo'
                  AND a.role='student' AND a.is_active=TRUE) AS demo_students,
              (SELECT ROUND(AVG(g.score/g.max_score*10),2)
                 FROM warehouse.fact_grades g WHERE g.class_key=cl.class_key
                   AND g.max_score>0) AS average_assessment,
              (SELECT ROUND(100.0*SUM(CASE WHEN at.attendance_status='present' THEN COALESCE(at.attendance_count,1) ELSE 0 END)
                        / NULLIF(SUM(COALESCE(at.attendance_count,1)),0),2)
                 FROM warehouse.fact_attendance at WHERE at.class_key=cl.class_key) AS attendance_rate
       FROM warehouse.dim_class cl
       JOIN warehouse.dim_course c ON c.course_key=cl.course_key
       JOIN warehouse.dim_semester sm ON sm.semester_key=cl.semester_key
       WHERE cl.instructor_key=:instructor AND c.department_key=1
       ORDER BY sm.start_date, c.course_code, cl.class_code
    '''), {'instructor':instructor_key}).mappings().all()
    return [{**dict(row), 'credits':float(row['credits']),
             'average_assessment':float(row['average_assessment']) if row['average_assessment'] is not None else None,
             'attendance_rate':float(row['attendance_rate']) if row['attendance_rate'] is not None else None}
            for row in rows]


def lecturer_class_students(db:Session, instructor_key:int, class_key:int) -> dict:
    # Check the class assignment BEFORE reading student-level information.
    allowed = db.execute(text('''SELECT cl.class_key, cl.class_code, c.course_name,
                                  c.course_code, sm.semester_code
           FROM warehouse.dim_class cl JOIN warehouse.dim_course c ON c.course_key=cl.course_key
           JOIN warehouse.dim_semester sm ON sm.semester_key=cl.semester_key
           WHERE cl.class_key=:class_key AND cl.instructor_key=:instructor AND c.department_key=1'''),
           {'class_key':class_key,'instructor':instructor_key}).mappings().first()
    if allowed is None:
        # Return 404 for both non-existent and unauthorized classes.
        raise HTTPException(status_code=404,detail='Không tìm thấy lớp trong phạm vi được phân công')
    students = db.execute(text('''
      SELECT s.student_code, s.full_name,
       (SELECT ROUND(AVG(g.score/g.max_score*10),2) FROM warehouse.fact_grades g
         WHERE g.class_key=e.class_key AND g.student_key=e.student_key AND g.max_score>0) AS average_assessment,
       (SELECT ROUND(100.0*SUM(CASE WHEN at.attendance_status='present' THEN COALESCE(at.attendance_count,1) ELSE 0 END)
                  / NULLIF(SUM(COALESCE(at.attendance_count,1)),0),2)
         FROM warehouse.fact_attendance at WHERE at.class_key=e.class_key AND at.student_key=e.student_key) AS attendance_rate
      FROM warehouse.fact_enrollment e
      JOIN warehouse.dim_student s ON s.student_key=e.student_key AND s.is_current=TRUE
      WHERE e.class_key=:class_key AND e.enrollment_status='enrolled'
      ORDER BY s.student_code
    '''), {'class_key':class_key}).mappings().all()
    roster=[{'student_code':s['student_code'], 'full_name':s['full_name'],
             'average_assessment':float(s['average_assessment']) if s['average_assessment'] is not None else None,
             'attendance_rate':float(s['attendance_rate']) if s['attendance_rate'] is not None else None,
             'is_demo':False} for s in students]
    demo=db.execute(text('''
       SELECT a.display_name, e.account_id,
            (SELECT AVG(g.score) FROM auth.demo_academic_grades g
             WHERE g.account_id=e.account_id AND g.class_key=e.class_key) AS average_assessment,
            (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE at.attendance_status='present') /
                NULLIF(COUNT(*),0),2) FROM auth.demo_academic_attendance at
             WHERE at.account_id=e.account_id AND at.class_key=e.class_key) AS attendance_rate
       FROM auth.demo_academic_enrollments e
       JOIN auth.demo_accounts a ON a.account_id=e.account_id
       WHERE e.class_key=:class_key AND a.username='student.demo'
         AND a.role='student' AND a.is_active=TRUE
    '''), {'class_key':class_key}).mappings().first()
    if demo:
        roster.append({'student_code':'DEMO-CNTT-001','full_name':demo['display_name'],
            'average_assessment':float(demo['average_assessment']) if demo['average_assessment'] is not None else None,
            'attendance_rate':float(demo['attendance_rate']) if demo['attendance_rate'] is not None else None,
            'is_demo':True})
    return {'class':dict(allowed),'students':roster,'total_students':len(roster)}
