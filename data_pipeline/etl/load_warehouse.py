
"""Validate and load synthetic EduInsight AI warehouse data.

Check only:
    python data_pipeline/etl/load_warehouse.py

Import into PostgreSQL:
    python data_pipeline/etl/load_warehouse.py --apply
"""

import argparse
import csv
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy import Boolean, Date, Integer, Numeric, text

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.database import Base, engine

import app.models  # Register all 14 SQLAlchemy models


DATA_DIR = ROOT / "data_pipeline" / "outputs"

DIMENSIONS = [
    "dim_department",
    "dim_program",
    "dim_course",
    "dim_semester",
    "dim_instructor",
    "dim_assessment",
    "dim_date",
    "dim_student",
    "dim_class",
]

FACTS = [
    "fact_enrollment",
    "fact_grades",
    "fact_attendance",
    "fact_assignments",
    "fact_surveys",
]

TABLES = DIMENSIONS + FACTS


def convert_value(value, column):
    if value is None or value == "":
        return None

    column_type = column.type

    if isinstance(column_type, Boolean):
        if value.lower() not in ("true", "false"):
            raise ValueError(
                f"Invalid boolean: {column.name}={value}"
            )
        return value.lower() == "true"

    if isinstance(column_type, Date):
        return date.fromisoformat(value)

    if isinstance(column_type, Integer):
        return int(value)

    if isinstance(column_type, Numeric):
        return Decimal(value)

    return value


def read_dataset(name):
    folder = "dimensions" if name in DIMENSIONS else "facts"
    path = DATA_DIR / folder / f"{name}.csv"

    if not path.is_file():
        raise FileNotFoundError(f"Missing CSV: {path}")

    table = Base.metadata.tables[f"warehouse.{name}"]
    expected_columns = set(table.columns.keys())

    with path.open(
        "r", encoding="utf-8-sig", newline=""
    ) as handle:
        reader = csv.DictReader(handle)

        actual_columns = set(reader.fieldnames or [])

        missing = expected_columns - actual_columns
        extra = actual_columns - expected_columns

        if missing or extra:
            raise ValueError(
                f"{name}: columns mismatch. "
                f"Missing={sorted(missing)}, "
                f"Extra={sorted(extra)}"
            )

        rows = []

        for row_number, raw in enumerate(reader, start=2):
            try:
                record = {
                    column.name: convert_value(
                        raw[column.name], column
                    )
                    for column in table.columns
                }
            except (ValueError, TypeError) as exc:
                raise ValueError(
                    f"{name}, CSV line {row_number}: {exc}"
                ) from exc

            rows.append(record)

    if not rows:
        raise ValueError(f"Empty dataset: {name}")

    return rows


def validate_data(datasets):
    print("\nChecking primary keys...")

    key_sets = {}

    for name in TABLES:
        table = Base.metadata.tables[f"warehouse.{name}"]
        rows = datasets[name]

        primary_keys = [
            column.name for column in table.primary_key.columns
        ]

        seen = set()

        for row in rows:
            key = tuple(row[col] for col in primary_keys)

            if None in key:
                raise ValueError(
                    f"{name}: NULL primary key {key}"
                )

            if key in seen:
                raise ValueError(
                    f"{name}: duplicate primary key {key}"
                )

            seen.add(key)

        key_sets[name] = {
            column.name: {
                row[column.name] for row in rows
            }
            for column in table.primary_key.columns
        }

    print("Primary keys: OK")
    print("Checking foreign keys...")

    for name in TABLES:
        table = Base.metadata.tables[f"warehouse.{name}"]

        for column in table.columns:
            for fk in column.foreign_keys:
                parent_table = fk.column.table.name
                parent_column = fk.column.name

                if parent_table not in key_sets:
                    raise ValueError(
                        f"Unknown parent table: {parent_table}"
                    )

                valid_keys = key_sets[parent_table].get(
                    parent_column
                )

                if valid_keys is None:
                    raise ValueError(
                        f"Unsupported FK: "
                        f"{parent_table}.{parent_column}"
                    )

                for row in datasets[name]:
                    value = row[column.name]

                    if value is not None and value not in valid_keys:
                        raise ValueError(
                            f"{name}: invalid FK "
                            f"{column.name}={value}"
                        )

    print("Foreign keys: OK")


def load_database(datasets):
    print("\nChecking PostgreSQL tables...")

    with engine.begin() as connection:
        # Import only into empty tables. Never delete existing data.
        for name in TABLES:
            table = Base.metadata.tables[f"warehouse.{name}"]

            existing = connection.execute(
                text(
                    f'SELECT COUNT(*) FROM "warehouse"."{name}"'
                )
            ).scalar_one()

            if existing != 0:
                raise RuntimeError(
                    f"Table warehouse.{name} already contains "
                    f"{existing} rows. Import stopped. "
                    f"No existing data was deleted."
                )

        print("All 14 target tables are empty.")

        for name in TABLES:
            table = Base.metadata.tables[f"warehouse.{name}"]
            rows = datasets[name]

            connection.execute(table.insert(), rows)

            print(f"Imported {name}: {len(rows):,} rows")

            # Synchronize PostgreSQL-generated ID sequences
            # after importing explicit primary keys.
            for pk in table.primary_key.columns:
                if not isinstance(pk.type, Integer):
                    continue

                sequence = connection.execute(
                    text(
                        "SELECT pg_get_serial_sequence("
                        ":table_name, :column_name)"
                    ),
                    {
                        "table_name": f"warehouse.{name}",
                        "column_name": pk.name,
                    },
                ).scalar_one_or_none()

                if sequence:
                    max_id = max(
                        row[pk.name] for row in rows
                    )

                    connection.execute(
                        text(
                            "SELECT setval("
                            "CAST(:sequence AS regclass), "
                            ":max_id, true)"
                        ),
                        {
                            "sequence": sequence,
                            "max_id": max_id,
                        },
                    )

    print("\nSUCCESS: PostgreSQL import committed.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Import the validated CSV files into PostgreSQL",
    )

    args = parser.parse_args()

    print("EduInsight AI - Warehouse ETL")
    print("=" * 40)

    datasets = {}

    for name in TABLES:
        datasets[name] = read_dataset(name)
        print(f"{name}: {len(datasets[name]):,} rows")

    validate_data(datasets)

    total = sum(len(rows) for rows in datasets.values())

    print(f"\nTotal validated rows: {total:,}")

    if args.apply:
        load_database(datasets)
    else:
        print("\nCHECK PASSED.")
        print("PostgreSQL was not modified.")
        print("To import, rerun with --apply.")


if __name__ == "__main__":
    main()
