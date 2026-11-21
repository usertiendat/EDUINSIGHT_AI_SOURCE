
"""Generate synthetic Fact Tables for EduInsight AI.

Run:
python data_pipeline/generators/generate_facts.py

Requires the 9 Dimension CSV files.
Does not modify PostgreSQL.
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

SEED = 20261104
RNG = random.Random(SEED)

ROOT = Path(__file__).resolve().parents[2]
DIM_DIR = ROOT / "data_pipeline" / "outputs" / "dimensions"
FACT_DIR = ROOT / "data_pipeline" / "outputs" / "facts"


def read_csv(name):
    path = DIM_DIR / f"{name}.csv"

    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Run generate_dimensions.py first."
        )

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(name, rows):
    if not rows:
        raise ValueError(f"No rows generated for {name}")

    FACT_DIR.mkdir(parents=True, exist_ok=True)
    path = FACT_DIR / f"{name}.csv"

    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    print(f"{name}: {len(rows):,} rows -> {path}")


def date_key(value):
    return int(value.strftime("%Y%m%d"))


def main():
    students = read_csv("dim_student")
    classes = read_csv("dim_class")
    semesters = read_csv("dim_semester")
    assessments = read_csv("dim_assessment")
    dates = read_csv("dim_date")

    student_keys = [int(x["student_key"]) for x in students]

    semester_map = {
        int(x["semester_key"]): x
        for x in semesters
    }

    date_keys = {
        int(x["date_key"])
        for x in dates
    }

    assessment_by_type = {}

    for row in assessments:
        assessment_by_type.setdefault(
            row["assessment_type"], []
        ).append(int(row["assessment_key"]))

    for required in ("exam", "quiz", "assignment", "survey"):
        if not assessment_by_type.get(required):
            raise ValueError(f"Missing assessment type: {required}")

    enrollments = []
    grades = []
    attendance = []
    assignments = []
    surveys = []

    enrollment_id = 1
    grade_id = 1
    attendance_id = 1
    assignment_id = 1
    survey_id = 1

    for class_row in classes:
        class_key = int(class_row["class_key"])
        semester_key = int(class_row["semester_key"])

        semester = semester_map[semester_key]

        start = date.fromisoformat(semester["start_date"])
        end = date.fromisoformat(semester["end_date"])

        duration = (end - start).days

        if duration < 70:
            raise ValueError(
                f"Semester {semester_key} is too short"
            )

        # 25 students enrolled in each class.
        selected_students = RNG.sample(student_keys, 25)

        # Assessment dates within the semester.
        enrollment_date = start
        quiz_date = start + timedelta(days=28)
        assignment_due = start + timedelta(days=49)
        exam_date = start + timedelta(days=duration - 7)
        survey_date = start + timedelta(days=duration - 3)

        # Six distinct attendance dates.
        attendance_dates = [
            start + timedelta(days=7 * week)
            for week in range(1, 7)
        ]

        exam_key = RNG.choice(assessment_by_type["exam"])
        quiz_key = RNG.choice(assessment_by_type["quiz"])
        assignment_assessment_key = RNG.choice(
            assessment_by_type["assignment"]
        )
        survey_assessment_key = RNG.choice(
            assessment_by_type["survey"]
        )

        for student_key in selected_students:

            # 1. Enrollment
            enrollments.append({
                "enrollment_key": enrollment_id,
                "student_key": student_key,
                "class_key": class_key,
                "semester_key": semester_key,
                "date_key": date_key(enrollment_date),
                "enrollment_status": "enrolled",
                "enrollment_count": 1,
            })
            enrollment_id += 1

            # 2. Quiz and exam grades
            for assessment_key, exam_day in [
                (quiz_key, quiz_date),
                (exam_key, exam_date),
            ]:
                score = round(
                    min(10, max(0, RNG.gauss(7.0, 1.6))),
                    2,
                )

                grades.append({
                    "grade_key": grade_id,
                    "student_key": student_key,
                    "class_key": class_key,
                    "assessment_key": assessment_key,
                    "semester_key": semester_key,
                    "date_key": date_key(exam_day),
                    "attempt_number": 1,
                    "score": score,
                    "max_score": 10,
                })
                grade_id += 1

            # 3. Attendance
            for day in attendance_dates:
                status = RNG.choices(
                    ["present", "absent", "late"],
                    weights=[85, 10, 5],
                )[0]

                attendance.append({
                    "attendance_key": attendance_id,
                    "student_key": student_key,
                    "class_key": class_key,
                    "date_key": date_key(day),
                    "attendance_status": status,
                    "attendance_count": 1,
                })
                attendance_id += 1

            # 4. Assignment
            submission_status = RNG.choices(
                ["submitted", "late", "missing"],
                weights=[80, 12, 8],
            )[0]

            if submission_status == "submitted":
                submitted_at = assignment_due - timedelta(
                    days=RNG.randint(0, 5)
                )
                assignment_score = round(
                    RNG.uniform(5, 10), 2
                )

            elif submission_status == "late":
                submitted_at = assignment_due + timedelta(
                    days=RNG.randint(1, 5)
                )
                assignment_score = round(
                    RNG.uniform(3, 8), 2
                )

            else:
                submitted_at = None
                assignment_score = None

            assignments.append({
                "assignment_key": assignment_id,
                "student_key": student_key,
                "class_key": class_key,
                "assessment_key": assignment_assessment_key,
                "due_date_key": date_key(assignment_due),
                "submission_date_key": (
                    date_key(submitted_at)
                    if submitted_at else ""
                ),
                "submission_status": submission_status,
                "score": (
                    assignment_score
                    if assignment_score is not None
                    else ""
                ),
            })
            assignment_id += 1

            # 5. Survey: roughly 80% participate.
            if RNG.random() < 0.8:
                response_score = RNG.choices(
                    [1, 2, 3, 4, 5],
                    weights=[3, 7, 15, 40, 35],
                )[0]

                surveys.append({
                    "survey_key": survey_id,
                    "student_key": student_key,
                    "class_key": class_key,
                    "assessment_key": survey_assessment_key,
                    "date_key": date_key(survey_date),
                    "response_score": response_score,
                    "response_count": 1,
                })
                survey_id += 1

    datasets = {
        "fact_enrollment": enrollments,
        "fact_grades": grades,
        "fact_attendance": attendance,
        "fact_assignments": assignments,
        "fact_surveys": surveys,
    }

    # Validate references before exporting.
    for name, rows in datasets.items():
        for row in rows:
            if int(row["student_key"]) not in student_keys:
                raise ValueError(f"Invalid student in {name}")

            for field in (
                "date_key",
                "due_date_key",
                "submission_date_key",
            ):
                if field in row and row[field] != "":
                    if int(row[field]) not in date_keys:
                        raise ValueError(
                            f"Invalid {field} in {name}"
                        )

    for name, rows in datasets.items():
        write_csv(name, rows)

    print()
    print("SUCCESS: 5 Fact CSV files generated.")
    print(f"Seed: {SEED}")
    print("PostgreSQL remains unchanged.")


if __name__ == "__main__":
    main()
