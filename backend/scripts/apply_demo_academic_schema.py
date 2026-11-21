"""Safely install a narrowly scoped schema for the isolated demo student."""
from pathlib import Path
from sqlalchemy import text
from app.core.database import engine

SQL_FILE = Path(__file__).with_name("demo_academic_schema.sql")


def main():
    # SQL comments are removed first to avoid semicolons embedded inside comments.
    sql = "\n".join(line for line in SQL_FILE.read_text(encoding="utf-8").splitlines()
                    if not line.lstrip().startswith("--"))
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    if len(statements) != 5 or not all(s.startswith(("CREATE SCHEMA IF NOT EXISTS auth", "CREATE TABLE IF NOT EXISTS auth.demo_academic_")) for s in statements):
        raise RuntimeError("Unexpected schema statements; refusing to apply")
    with engine.begin() as connection:
        # Required base auth tables must already exist.
        exists = connection.execute(text("SELECT to_regclass('auth.demo_accounts')")).scalar_one()
        if exists is None:
            raise RuntimeError("Missing auth.demo_accounts: apply the existing Phase 5 schema first")
        for statement in statements:
            connection.exec_driver_sql(statement)
    print("Demo academic schema installed; warehouse facts untouched.")

if __name__ == "__main__":
    main()
