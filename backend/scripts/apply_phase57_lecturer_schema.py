"""Additive lecturer-demo migration. Run from backend/: python -m scripts.apply_phase57_lecturer_schema."""
from pathlib import Path
from sqlalchemy import text
from app.core.database import engine

SQL_PATH = Path(__file__).with_name('phase57_lecturer_schema.sql')
EXPECTED = ('CREATE TABLE IF NOT EXISTS auth.demo_lecturer_accounts',
            'CREATE TABLE IF NOT EXISTS auth.demo_lecturer_sessions',
            'CREATE INDEX IF NOT EXISTS idx_demo_lecturer_sessions_account',
            'CREATE INDEX IF NOT EXISTS idx_demo_lecturer_sessions_expiry')


def parsed_statements(sql: str) -> list[str]:
    lines = [line for line in sql.splitlines() if line.strip() and not line.lstrip().startswith('--')]
    statements = [part.strip() for part in '\n'.join(lines).split(';') if part.strip()]
    if len(statements) != len(EXPECTED) or any(not item.startswith(prefix) for item,prefix in zip(statements,EXPECTED)):
        raise ValueError('Unexpected SQL migration contents; refusing to execute')
    return statements


def main():
    statements = parsed_statements(SQL_PATH.read_text(encoding='utf-8'))
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
    print('Lecturer demo tables available. Student auth and warehouse facts unchanged.')

if __name__ == '__main__':
    main()
