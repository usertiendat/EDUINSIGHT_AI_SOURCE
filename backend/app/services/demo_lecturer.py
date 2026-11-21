"""Lecturer-demo credentials and strict class-level authorization.

Only classes assigned to the authenticated instructor and belonging to
CNTT (department_key=1) are returned. No mutation of academic records.
"""
from __future__ import annotations

import secrets
import hmac
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
      SELECT a.lecturer_account_id, a.username, a.display_name, a.instructor_key,
             s.created_at AS session_created_at, s.expires_at AS session_expires_at
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



def lecturer_session_status(db: Session, lecturer_account_id: int, session_created_at, session_expires_at) -> dict:
    """Return non-secret session metadata, never tokens or password hashes."""
    count = db.execute(text('''
      SELECT COUNT(*) FROM auth.demo_lecturer_sessions
      WHERE lecturer_account_id=:id AND revoked_at IS NULL AND expires_at>NOW()
    '''), {'id': lecturer_account_id}).scalar_one()
    return {
      'created_at': session_created_at.isoformat(),
      'expires_at': session_expires_at.isoformat(),
      'active_sessions': int(count),
    }


def change_lecturer_password(db: Session, lecturer_account_id: int,
                             current_password: str, new_password: str) -> None:
    """Validate old secret, update password and revoke all sessions atomically.

    Authentication to this service must come from current_lecturer.
    """
    if not 12 <= len(new_password) <= 128 or len(current_password) > 256:
        raise HTTPException(status_code=400, detail='Mật khẩu mới phải có 12 đến 128 ký tự')
    account = db.execute(text('''
       SELECT lecturer_account_id,password_hash,is_active,failed_attempts,locked_until
       FROM auth.demo_lecturer_accounts WHERE lecturer_account_id=:id FOR UPDATE
    '''), {'id': lecturer_account_id}).mappings().first()
    if account is None or not account['is_active']:
        raise HTTPException(status_code=403, detail='Tài khoản không được phép thao tác')
    now = datetime.now(timezone.utc)
    if account['locked_until'] and account['locked_until'] > now:
        raise HTTPException(status_code=429, detail='Tài khoản đang tạm khóa')
    if not verify_password(current_password, account['password_hash']):
        attempts = int(account['failed_attempts']) + 1
        locked = now + timedelta(minutes=LOCK_MINUTES) if attempts >= MAX_FAILURES else None
        db.execute(text('''UPDATE auth.demo_lecturer_accounts
          SET failed_attempts=:n, locked_until=:locked WHERE lecturer_account_id=:id
        '''), {'n': 0 if locked else attempts, 'locked': locked, 'id': lecturer_account_id})
        db.commit()  # Persist failed attempts before raising HTTPException.
        raise HTTPException(status_code=400, detail='Mật khẩu hiện tại không đúng')
    if hmac.compare_digest(current_password.encode('utf-8'), new_password.encode('utf-8')):
        raise HTTPException(status_code=400, detail='Mật khẩu mới phải khác mật khẩu cũ')
    db.execute(text('''UPDATE auth.demo_lecturer_accounts
      SET password_hash=:hashed, failed_attempts=0, locked_until=NULL
      WHERE lecturer_account_id=:id
    '''), {'hashed': hash_password(new_password), 'id': lecturer_account_id})
    db.execute(text('''UPDATE auth.demo_lecturer_sessions
      SET revoked_at=NOW() WHERE lecturer_account_id=:id AND revoked_at IS NULL
    '''), {'id': lecturer_account_id})
    db.commit()


def revoke_all_lecturer_sessions(db: Session, lecturer_account_id: int) -> None:
    db.execute(text('''UPDATE auth.demo_lecturer_sessions SET revoked_at=NOW()
       WHERE lecturer_account_id=:id AND revoked_at IS NULL
    '''), {'id': lecturer_account_id})
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


def lecturer_class_students(db: Session, instructor_key: int, class_key: int) -> dict:
    """Class-scoped detailed analytics; denies access before any roster read.

    Scores are unweighted assessment means on a 0-10 scale, NOT GPA or
    official final grades. Attendance 'late' is never counted as 'present'.
    """
    allowed = db.execute(text('''
        SELECT cl.class_key, cl.class_code, c.course_name, c.course_code,
               sm.semester_code
        FROM warehouse.dim_class cl
        JOIN warehouse.dim_course c ON c.course_key = cl.course_key
        JOIN warehouse.dim_semester sm ON sm.semester_key = cl.semester_key
        WHERE cl.class_key = :class_key
          AND cl.instructor_key = :instructor
          AND c.department_key = 1
    '''), {'class_key': class_key, 'instructor': instructor_key}).mappings().first()
    if allowed is None:
        raise HTTPException(status_code=404, detail='Không tìm thấy lớp trong phạm vi được phân công')

    warehouse = db.execute(text('''
        SELECT s.student_code, s.full_name,
               g.quiz_score, g.exam_score, g.average_assessment,
               COALESCE(at.present_count, 0) AS attendance_present,
               COALESCE(at.late_count, 0) AS attendance_late,
               COALESCE(at.absent_count, 0) AS attendance_absent,
               COALESCE(at.total_count, 0) AS attendance_total,
               COALESCE(ass.assignment_total, 0) AS assignment_total,
               COALESCE(ass.assignment_submitted, 0) AS assignment_submitted,
               COALESCE(ass.assignment_late, 0) AS assignment_late,
               COALESCE(ass.assignment_missing, 0) AS assignment_missing
        FROM warehouse.fact_enrollment e
        JOIN warehouse.dim_student s
          ON s.student_key = e.student_key AND s.is_current = TRUE
        LEFT JOIN LATERAL (
            SELECT ROUND(AVG(CASE WHEN a.assessment_type = 'quiz'
                           THEN 10.0 * g.score / NULLIF(g.max_score, 0) END), 2) AS quiz_score,
                   ROUND(AVG(CASE WHEN a.assessment_type = 'exam'
                           THEN 10.0 * g.score / NULLIF(g.max_score, 0) END), 2) AS exam_score,
                   ROUND(AVG(CASE WHEN a.assessment_type IN ('quiz','exam')
                           THEN 10.0 * g.score / NULLIF(g.max_score, 0) END), 2) AS average_assessment
            FROM warehouse.fact_grades g
            JOIN warehouse.dim_assessment a ON a.assessment_key = g.assessment_key
            WHERE g.student_key = e.student_key AND g.class_key = e.class_key
              AND g.max_score > 0
        ) g ON TRUE
        LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(CASE WHEN attendance_status='present' THEN attendance_count ELSE 0 END),0) AS present_count,
                   COALESCE(SUM(CASE WHEN attendance_status='late' THEN attendance_count ELSE 0 END),0) AS late_count,
                   COALESCE(SUM(CASE WHEN attendance_status='absent' THEN attendance_count ELSE 0 END),0) AS absent_count,
                   COALESCE(SUM(attendance_count),0) AS total_count
            FROM warehouse.fact_attendance
            WHERE student_key=e.student_key AND class_key=e.class_key
        ) at ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS assignment_total,
                   COUNT(*) FILTER (WHERE submission_status IN ('submitted','late')) AS assignment_submitted,
                   COUNT(*) FILTER (WHERE submission_status='late') AS assignment_late,
                   COUNT(*) FILTER (WHERE submission_status='missing') AS assignment_missing
            FROM warehouse.fact_assignments
            WHERE student_key=e.student_key AND class_key=e.class_key
        ) ass ON TRUE
        WHERE e.class_key=:class_key AND e.enrollment_status='enrolled'
        ORDER BY s.student_code
    '''), {'class_key': class_key}).mappings().all()

    def numeric(value):
        return float(value) if value is not None else None

    def student_record(raw, is_demo):
        r = dict(raw)
        total = int(r['attendance_total'])
        present = int(r['attendance_present'])
        return {
            'student_code': r['student_code'], 'full_name': r['full_name'],
            'is_demo': is_demo,
            'quiz_score': numeric(r['quiz_score']),
            'exam_score': numeric(r['exam_score']),
            'average_assessment': numeric(r['average_assessment']),
            'attendance_present': present,
            'attendance_late': int(r['attendance_late']),
            'attendance_absent': int(r['attendance_absent']),
            'attendance_total': total,
            'attendance_rate': round(100.0 * present / total, 2) if total else None,
            'assignment_total': int(r['assignment_total']),
            'assignment_submitted': int(r['assignment_submitted']),
            'assignment_late': int(r['assignment_late']),
            'assignment_missing': int(r['assignment_missing']),
        }

    roster = [student_record(r, False) for r in warehouse]
    # The extra demo learner is only visible when enrolled in this exact class.
    demo = db.execute(text('''
        SELECT 'DEMO-CNTT-001' AS student_code, a.display_name AS full_name,
             (SELECT AVG(g.score) FROM auth.demo_academic_grades g
              WHERE g.account_id=e.account_id AND g.class_key=e.class_key
                AND g.assessment_type='quiz') AS quiz_score,
             (SELECT AVG(g.score) FROM auth.demo_academic_grades g
              WHERE g.account_id=e.account_id AND g.class_key=e.class_key
                AND g.assessment_type='exam') AS exam_score,
             (SELECT AVG(g.score) FROM auth.demo_academic_grades g
              WHERE g.account_id=e.account_id AND g.class_key=e.class_key
                AND g.assessment_type IN ('quiz','exam')) AS average_assessment,
             (SELECT COUNT(*) FROM auth.demo_academic_attendance at
              WHERE at.account_id=e.account_id AND at.class_key=e.class_key
                AND at.attendance_status='present') AS attendance_present,
             (SELECT COUNT(*) FROM auth.demo_academic_attendance at
              WHERE at.account_id=e.account_id AND at.class_key=e.class_key
                AND at.attendance_status='late') AS attendance_late,
             (SELECT COUNT(*) FROM auth.demo_academic_attendance at
              WHERE at.account_id=e.account_id AND at.class_key=e.class_key
                AND at.attendance_status='absent') AS attendance_absent,
             (SELECT COUNT(*) FROM auth.demo_academic_attendance at
              WHERE at.account_id=e.account_id AND at.class_key=e.class_key) AS attendance_total,
             (SELECT COUNT(*) FROM auth.demo_academic_assignments ass
              WHERE ass.account_id=e.account_id AND ass.class_key=e.class_key) AS assignment_total,
             (SELECT COUNT(*) FROM auth.demo_academic_assignments ass
              WHERE ass.account_id=e.account_id AND ass.class_key=e.class_key
                AND ass.submission_status IN ('submitted','late')) AS assignment_submitted,
             (SELECT COUNT(*) FROM auth.demo_academic_assignments ass
              WHERE ass.account_id=e.account_id AND ass.class_key=e.class_key
                AND ass.submission_status='late') AS assignment_late,
             (SELECT COUNT(*) FROM auth.demo_academic_assignments ass
              WHERE ass.account_id=e.account_id AND ass.class_key=e.class_key
                AND ass.submission_status='missing') AS assignment_missing
        FROM auth.demo_academic_enrollments e
        JOIN auth.demo_accounts a ON a.account_id=e.account_id
        WHERE e.class_key=:class_key AND a.username='student.demo'
          AND a.role='student' AND a.is_active=TRUE
    '''), {'class_key': class_key}).mappings().first()
    if demo:
        roster.append(student_record(demo, True))

    totals = {
        'students': len(roster),
        'with_grades': sum(s['average_assessment'] is not None for s in roster),
        'grades_mean': None,
        'attendance_present': sum(s['attendance_present'] for s in roster),
        'attendance_late': sum(s['attendance_late'] for s in roster),
        'attendance_absent': sum(s['attendance_absent'] for s in roster),
        'attendance_total': sum(s['attendance_total'] for s in roster),
        'assignment_total': sum(s['assignment_total'] for s in roster),
        'assignment_submitted': sum(s['assignment_submitted'] for s in roster),
        'assignment_late': sum(s['assignment_late'] for s in roster),
        'assignment_missing': sum(s['assignment_missing'] for s in roster),
    }
    grades = [s['average_assessment'] for s in roster if s['average_assessment'] is not None]
    if grades:
        totals['grades_mean'] = round(sum(grades) / len(grades), 2)
    totals['attendance_rate'] = (
        round(100.0 * totals['attendance_present'] / totals['attendance_total'], 2)
        if totals['attendance_total'] else None
    )
    totals['assignment_rate'] = (
        round(100.0 * totals['assignment_submitted'] / totals['assignment_total'], 2)
        if totals['assignment_total'] else None
    )
    return {'class': dict(allowed), 'students': roster,
            'total_students': len(roster), 'analytics': totals}
