"""Safe demo-only VAA refresh for an existing EduInsight AI PostgreSQL database.

Run from project root:
  python data_pipeline/vaa/update_vaa_demo.py --preview
  python data_pipeline/vaa/update_vaa_demo.py --apply --backup-file D:\\Backups\\eduinsight_before_vaa.dump

The script preserves all existing surrogate keys and ALL 5 Fact tables.
Only use on the synthetic demo database (not production/student records).
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path
from sqlalchemy import text

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from app.core.database import engine  # noqa: E402
from vaa_catalog import DEPARTMENTS, PROGRAMS, SOURCES, all_courses  # noqa: E402

EXPECTED = {
    'dim_program': 12, 'dim_student': 1000, 'dim_course': 60,
    'dim_instructor': 40, 'dim_class': 100,
    'fact_enrollment': 2500, 'fact_grades': 5000,
    'fact_attendance': 15000, 'fact_assignments': 2500,
    'fact_surveys': 1994,
}
FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ']
MIDDLE = ['Minh', 'Thanh', 'Ngọc', 'Anh', 'Gia', 'Hải', 'Thùy', 'Đức', 'Hoài', 'Quốc']
GIVEN = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Huy', 'Khang', 'Linh', 'Mai', 'Nam', 'Phúc', 'Quân', 'Thảo', 'Trang', 'Vy']


def demo_name(key: int) -> str:
    rng = random.Random(20261118 + key)
    return f'{rng.choice(FAMILY)} {rng.choice(MIDDLE)} {rng.choice(GIVEN)} (mô phỏng {key:04d})'


def count_table(conn, name: str) -> int:
    return conn.execute(text(f'SELECT COUNT(*) FROM warehouse.{name}')).scalar_one()


def confirm_demo(conn):
    depts = count_table(conn, 'dim_department')
    if depts not in (5, 8):
        raise RuntimeError(f'Expected 5 or 8 demo departments; found {depts}. Stop.')
    for name, expected in EXPECTED.items():
        actual = count_table(conn, name)
        if actual != expected:
            raise RuntimeError(f'warehouse.{name}: {actual} != demo expected {expected}. Stop.')
    rows = conn.execute(text('SELECT student_key, full_name FROM warehouse.dim_student')).mappings().all()
    if any(not (r['full_name'].startswith('Sinh vien gia lap ') or '(mô phỏng ' in r['full_name']) for r in rows):
        raise RuntimeError('Non-demo student name found; refusing to touch this database.')
    for tbl, key, end in [('dim_department','department_key',depts),('dim_program','program_key',12),('dim_course','course_key',60)]:
        ids = {x for (x,) in conn.execute(text(f'SELECT {key} FROM warehouse.{tbl}'))}
        if ids != set(range(1,end+1)):
            raise RuntimeError(f'Unexpected primary keys in {tbl}; refusing update.')
    return rows


def run_updates(conn, students):
    # Department labels are source-backed; codes FACxx stay internal to demo.
    for key, name, src in DEPARTMENTS:
        if key <= 5:
            conn.execute(text('''UPDATE warehouse.dim_department
                SET department_name=:name, description=:description
                WHERE department_key=:key'''), {'key':key,'name':name,
                    'description':f'VAA reference name; DEMO analytics. {SOURCES[src]}'})
        else:
            conn.execute(text('''INSERT INTO warehouse.dim_department
                (department_key,department_code,department_name,description)
                VALUES (:key,:code,:name,:description)
                ON CONFLICT (department_key) DO UPDATE
                SET department_name=EXCLUDED.department_name,
                    description=EXCLUDED.description'''), {'key':key,'code':f'FAC{key:02d}',
                    'name':name, 'description':f'VAA reference name; DEMO analytics. {SOURCES[src]}'})

    for key, name, dept in PROGRAMS:
        conn.execute(text('''UPDATE warehouse.dim_program SET
            program_name=:name, department_key=:dept, degree_level='Đại học (mô phỏng)'
            WHERE program_key=:key'''), {'key':key,'name':name,'dept':dept})

    for course in all_courses():
        conn.execute(text('''UPDATE warehouse.dim_course SET course_name=:name,
            department_key=:dept,
            credits=COALESCE(:credits,credits)
            WHERE course_key=:key'''), {
                'key':course['course_key'], 'name':course['course_name'],
                'dept':course['department_key'], 'credits':course['credits'],
            })

    # Instructors remain synthetic. Spread 40 records across eight faculties.
    for key in range(1, 41):
        conn.execute(text('''UPDATE warehouse.dim_instructor SET
            full_name=:name, department_key=:dept WHERE instructor_key=:key'''),
            {'key':key,'name':f'Giảng viên mô phỏng VAA {key:03d}',
             'dept':(key-1)%8+1})

    # Preserve student keys and ALL linked facts; change only fictitious names.
    for row in students:
        conn.execute(text('UPDATE warehouse.dim_student SET full_name=:name WHERE student_key=:key'),
                     {'name':demo_name(row['student_key']), 'key':row['student_key']})

    # Reassign class instructors to matching demo faculty WITHOUT changing class keys.
    conn.execute(text('''UPDATE warehouse.dim_class c
        SET instructor_key = (
            SELECT i.instructor_key
            FROM warehouse.dim_instructor i
            JOIN warehouse.dim_course co ON co.department_key=i.department_key
            WHERE co.course_key=c.course_key
            ORDER BY i.instructor_key
            LIMIT 1
        )'''))

    conn.execute(text('''UPDATE warehouse.dim_class c
       SET class_name = LEFT('Lớp mô phỏng – ' || co.course_name, 200)
       FROM warehouse.dim_course co WHERE c.course_key=co.course_key'''))

    assessment_labels = {'exam':'Thi', 'quiz':'Kiểm tra', 'assignment':'Bài tập', 'survey':'Khảo sát'}
    for key, typ in conn.execute(text('SELECT assessment_key, assessment_type FROM warehouse.dim_assessment')):
        label = assessment_labels.get(typ, 'Đánh giá')
        conn.execute(text('UPDATE warehouse.dim_assessment SET assessment_name=:name WHERE assessment_key=:key'),
                     {'key':key, 'name':f'{label} mô phỏng {key:03d}'})

    conn.execute(text('''UPDATE warehouse.dim_semester
        SET semester_name='Học kỳ mô phỏng ' || semester_code'''))

    # Additional checks are carried out in SAME transaction before commit.
    invalid = conn.execute(text('''SELECT COUNT(*) FROM warehouse.dim_class c
        JOIN warehouse.dim_course co ON co.course_key=c.course_key
        JOIN warehouse.dim_instructor i ON i.instructor_key=c.instructor_key
        WHERE i.department_key<>co.department_key''')).scalar_one()
    if invalid:
        raise RuntimeError(f'{invalid} class/instructor faculty mismatches! Rolling back.')
    if count_table(conn,'dim_department') != 8:
        raise RuntimeError('Faculty count not 8; rolling back.')
    for name, expected in EXPECTED.items():
        if count_table(conn,name) != expected:
            raise RuntimeError(f'Row count changed unexpectedly: {name}; rolling back.')

    # Explicitly assigned keys can advance PostgreSQL's serial sequence.
    seq = conn.execute(text("SELECT pg_get_serial_sequence('warehouse.dim_department','department_key')")).scalar_one_or_none()
    if seq:
        conn.execute(text('SELECT setval(CAST(:seq AS regclass),8,true)'), {'seq':seq})


def main():
    parser = argparse.ArgumentParser(description='VAA reference/demo names, not official academic results')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--preview', action='store_true')
    group.add_argument('--apply', action='store_true')
    parser.add_argument('--backup-file', help='Path to verified PostgreSQL backup required for --apply')
    args = parser.parse_args()
    if args.apply:
        if not args.backup_file or not Path(args.backup_file).is_file():
            parser.error('--apply requires --backup-file pointing to an existing backup')
        if Path(args.backup_file).stat().st_size < 1024:
            parser.error('Backup looks empty; refusing update')

    with engine.connect() as conn:
        students = confirm_demo(conn)
        print('Demo database verified: 1,000 students, 60 courses, 12 programs.')
        print('Source-backed department names:',len(DEPARTMENTS))
        print('Selected program names:',len(PROGRAMS))
        print('Course names documented in VAA publications:',sum(c['source_status']=='verified_name' for c in all_courses()))
        print('Remaining simulated course labels:',sum(c['source_status']=='simulated' for c in all_courses()))
        print('Facts will NOT be updated, deleted or regenerated.')
        if args.preview:
            for key,name,_ in DEPARTMENTS:
                print(f'FAC{key:02d}  {name}')
            print('PREVIEW ONLY: no database changes.')
            return

    # Engine.begin wraps all updates in ONE transaction (automatic rollback on error).
    with engine.begin() as conn:
        students = confirm_demo(conn)
        run_updates(conn, students)
    print('SUCCESS: 8 VAA-referenced demo faculties; 12 programs; 60 courses updated.')
    print('All original Fact rows and primary/foreign keys preserved.')
    print('This is a SYNTHETIC DEMO, not official VAA academic data.')

if __name__ == '__main__':
    main()
