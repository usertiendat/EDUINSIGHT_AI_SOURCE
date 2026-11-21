"""Apply only the Phase 5.8.4 additive security-event schema."""
from pathlib import Path
from sqlalchemy import text
from app.core.database import engine

EXPECTED = (
    'CREATE TABLE IF NOT EXISTS auth.demo_admin_security_events',
    'CREATE INDEX IF NOT EXISTS idx_demo_admin_security_events_id',
    'CREATE INDEX IF NOT EXISTS idx_demo_admin_security_events_type_id',
)

def statements_from_sql(sql: str) -> list[str]:
    cleaned = '\n'.join(line.split('--', 1)[0] for line in sql.splitlines())
    parts = [part.strip() for part in cleaned.split(';') if part.strip()]
    if len(parts) != len(EXPECTED) or any(not stmt.startswith(p) for stmt, p in zip(parts, EXPECTED)):
        raise ValueError('Unexpected SQL; refusing to execute')
    return parts

def main() -> None:
    sql = Path(__file__).with_name('phase584_security_events.sql').read_text(encoding='utf-8-sig')
    with engine.begin() as connection:
        for statement in statements_from_sql(sql):
            connection.execute(text(statement))
    print('Phase 5.8.4 security-event audit schema ready. Warehouse unchanged.')

if __name__ == '__main__':
    main()
