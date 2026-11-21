"""Create Phase 5 demo auth tables without changing warehouse data.

Usage (from backend/): python -m scripts.apply_phase5_schema
"""
from pathlib import Path
import re

from app.core.database import engine

SCHEMA = Path(__file__).with_name("phase5_schema.sql")


def load_statements() -> list[str]:
    sql = SCHEMA.read_text(encoding="utf-8-sig")
    # Phase 5 schema has only ordinary SQL statements and full-line comments.
    # Strip comments *before* separating on semicolons; comments may contain ';'.
    sql = "\n".join(
        line for line in sql.splitlines()
        if not line.lstrip().startswith("--")
    )
    statements = [part.strip() for part in sql.split(";") if part.strip()]
    statements = [
        statement for statement in statements
        if statement.upper() not in {"BEGIN", "COMMIT"}
    ]
    allowed = re.compile(
        r"^(?:CREATE\s+SCHEMA\s+IF\s+NOT\s+EXISTS\s+auth\b|"
        r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+auth\.demo_(?:accounts|sessions)\b|"
        r"CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_demo_sessions_(?:account|expiry)\b)",
        flags=re.IGNORECASE,
    )
    if len(statements) != 5 or any(not allowed.match(stmt) for stmt in statements):
        raise ValueError("Unexpected Phase 5 schema contents. No database changes were made.")
    return statements


def main() -> None:
    statements = load_statements()
    with engine.begin() as conn:
        for statement in statements:
            conn.exec_driver_sql(statement)
    print("Phase 5 auth schema initialized. Warehouse rows unchanged.")


if __name__ == "__main__":
    main()
