"""Install only the additive Phase 5.8.2 audit schema."""
from pathlib import Path
from sqlalchemy import text
from app.core.database import engine


def main():
    sql=Path(__file__).with_name('phase582_account_audit.sql').read_text(encoding='utf-8-sig')
    statements=[part.strip() for part in '\n'.join(
        line.split('--',1)[0] for line in sql.splitlines()).split(';') if part.strip()]
    expected=('CREATE TABLE IF NOT EXISTS auth.demo_admin_account_audit',
              'CREATE INDEX IF NOT EXISTS idx_admin_account_audit_created')
    if len(statements)!=len(expected) or any(not stmt.startswith(prefix) for stmt,prefix in zip(statements,expected)):
        raise ValueError('Unexpected schema content: refusing to execute')
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
    print('Phase 5.8.2 account audit schema ready; Warehouse unchanged.')

if __name__=='__main__':main()
