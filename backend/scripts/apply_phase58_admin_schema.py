"""Idempotent Phase 5.8.1 schema installer; no DROP or Warehouse updates."""
from pathlib import Path
from sqlalchemy import text
from app.core.database import engine

EXPECTED=("CREATE SCHEMA IF NOT EXISTS auth","CREATE TABLE IF NOT EXISTS auth.demo_admin_accounts",
          "CREATE TABLE IF NOT EXISTS auth.demo_admin_sessions",
          "CREATE INDEX IF NOT EXISTS idx_admin_sessions_account",
          "CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry")

def statements():
    src=Path(__file__).with_name('phase58_admin_schema.sql').read_text(encoding='utf-8-sig')
    without_comments='\n'.join(line.split('--',1)[0] for line in src.splitlines())
    commands=[part.strip() for part in without_comments.split(';') if part.strip()]
    assert len(commands)==len(EXPECTED) and all(cmd.startswith(prefix) for cmd,prefix in zip(commands,EXPECTED)), 'Unexpected SQL schema content'
    return commands

def main():
    with engine.begin() as conn:
        for sql in statements():conn.execute(text(sql))
    print('Phase 5.8.1 admin tables initialized; existing learning data unchanged.')

if __name__=='__main__':main()
