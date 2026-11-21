
"""Generate reproducible synthetic university dimension CSVs for EduInsight AI.

Run from repository root:
python data_pipeline/generators/generate_dimensions.py

No database writes are performed.
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 20261104

ROOT = Path(__file__).resolve().parents[2]

OUTPUT = ROOT / "data_pipeline" / "outputs" / "dimensions"

RNG = random.Random(SEED)


def write_csv(name: str, rows: list[dict]) -> None:
    if not rows:
        raise ValueError(f"No data to write: {name}")

    path = OUTPUT / f"{name}.csv"

    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=list(rows[0])
        )

        writer.writeheader()
        writer.writerows(rows)

    print(f"{name}: {len(rows):,} rows -> {path}")


def make_dates(start: date, end: date) -> list[dict]:
    rows = []
    day = start

    while day <= end:
        rows.append({
            "date_key": int(day.strftime("%Y%m%d")),
            "full_date": day.isoformat(),
            "day": day.day,
            "month": day.month,
            "quarter": (day.month - 1) // 3 + 1,
            "year": day.year,
            "week_of_year": day.isocalendar().week,
            "day_of_week": day.isoweekday(),
        })

        day += timedelta(days=1)

    return rows


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    # 1. Departments
    department_names = [
        "Cong nghe thong tin",
        "Kinh te",
        "Ngoai ngu",
        "Ky thuat",
        "Khoa hoc xa hoi",
    ]

    departments = [
        {
            "department_key": i,
            "department_code": f"FAC{i:02d}",
            "department_name": name,
            "description": "Synthetic university department",
        }
        for i, name in enumerate(department_names, 1)
    ]

    # 2. Programs
    program_names = [
        "Khoa hoc may tinh",
        "Ky thuat phan mem",
        "He thong thong tin",
        "Quan tri kinh doanh",
        "Ke toan",
        "Tai chinh",
        "Ngon ngu Anh",
        "Ngon ngu Nhat",
        "Ky thuat dien",
        "Co khi",
        "Tam ly hoc",
        "Xa hoi hoc",
    ]

    program_departments = [
        1, 1, 1,
        2, 2, 2,
        3, 3,
        4, 4,
        5, 5,
    ]

    programs = [
        {
            "program_key": i,
            "program_code": f"PRG{i:03d}",
            "program_name": name,
            "degree_level": "Bachelor",
            "department_key": program_departments[i - 1],
        }
        for i, name in enumerate(program_names, 1)
    ]

    # 3. Students
    students = [
        {
            "student_key": i,
            "student_code": f"SV{i:06d}",
            "full_name": f"Sinh vien gia lap {i:04d}",
            "program_key": RNG.randint(1, len(programs)),
            "admission_year": RNG.randint(2022, 2025),
            "study_status": RNG.choices(
                ["active", "graduated", "on_leave"],
                [90, 7, 3]
            )[0],
            "effective_from": "2025-01-01",
            "effective_to": "",
            "is_current": "true",
        }
        for i in range(1, 1001)
    ]

    # 4. Courses
    courses = [
        {
            "course_key": i,
            "course_code": f"CRS{i:03d}",
            "course_name": f"Hoc phan gia lap {i:03d}",
            "credits": RNG.choice([2.0, 3.0, 4.0]),
            "department_key": (i - 1) % len(departments) + 1,
        }
        for i in range(1, 61)
    ]

    # 5. Instructors
    instructors = [
        {
            "instructor_key": i,
            "instructor_code": f"GV{i:04d}",
            "full_name": f"Giang vien gia lap {i:03d}",
            "department_key": (i - 1) % len(departments) + 1,
            "academic_title": RNG.choice([
                "Lecturer",
                "Senior Lecturer",
                "Professor",
            ]),
        }
        for i in range(1, 41)
    ]

    # 6. Semesters
    semester_specs = [
        (
            "2025-1",
            "2024-2025",
            date(2025, 1, 6),
            date(2025, 5, 31),
        ),
        (
            "2025-2",
            "2025-2026",
            date(2025, 8, 18),
            date(2025, 12, 20),
        ),
        (
            "2026-1",
            "2025-2026",
            date(2026, 1, 5),
            date(2026, 5, 30),
        ),
        (
            "2026-2",
            "2026-2027",
            date(2026, 8, 17),
            date(2026, 12, 19),
        ),
    ]

    semesters = [
        {
            "semester_key": i,
            "semester_code": code,
            "semester_name": f"Hoc ky {i}",
            "academic_year": year,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        }
        for i, (code, year, start, end)
        in enumerate(semester_specs, 1)
    ]

    # 7. Classes
    classes = []

    for i in range(1, 101):
        semester_key = (i - 1) // 25 + 1
        course_key = (i - 1) % 60 + 1

        course_department = courses[
            course_key - 1
        ]["department_key"]

        instructor_keys = [
            row["instructor_key"]
            for row in instructors
            if row["department_key"] == course_department
        ]

        classes.append({
            "class_key": i,
            "class_code": f"CLS{i:04d}",
            "class_name": f"Lop hoc phan gia lap {i:04d}",
            "course_key": course_key,
            "semester_key": semester_key,
            "instructor_key": RNG.choice(instructor_keys),
        })

    # 8. Assessments
    assessments = [
        {
            "assessment_key": i,
            "assessment_code": f"ASM{i:03d}",
            "assessment_name": f"Danh gia gia lap {i:03d}",
            "assessment_type": [
                "exam",
                "quiz",
                "assignment",
                "survey"
            ][(i - 1) % 4],
        }
        for i in range(1, 41)
    ]

    # 9. Create datasets
    datasets = {
        "dim_department": departments,
        "dim_program": programs,
        "dim_student": students,
        "dim_course": courses,
        "dim_semester": semesters,
        "dim_instructor": instructors,
        "dim_class": classes,
        "dim_assessment": assessments,
        "dim_date": make_dates(
            date(2025, 1, 1),
            date(2026, 12, 31)
        ),
    }

    # Export CSV files
    for name, rows in datasets.items():
        write_csv(name, rows)

    print(
        f"SUCCESS: {len(datasets)} dimension CSVs "
        f"generated (seed={SEED})."
    )

    print(
        "Synthetic data only. "
        "PostgreSQL remains unchanged."
    )


if __name__ == "__main__":
    main()
