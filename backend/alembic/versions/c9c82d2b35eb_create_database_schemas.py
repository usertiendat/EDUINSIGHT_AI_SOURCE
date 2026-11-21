"""create database schemas

Revision ID: c9c82d2b35eb
Revises: fa000e161645
Create Date: 2026-11-04 13:26:42.746998

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9c82d2b35eb'
down_revision: Union[str, Sequence[str], None] = 'fa000e161645'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('CREATE SCHEMA IF NOT EXISTS "auth"')
    op.execute('CREATE SCHEMA IF NOT EXISTS "staging"')
    op.execute('CREATE SCHEMA IF NOT EXISTS "warehouse"')
    op.execute('CREATE SCHEMA IF NOT EXISTS "analytics"')
    op.execute('CREATE SCHEMA IF NOT EXISTS "audit"')


def downgrade() -> None:
    op.execute('DROP SCHEMA IF EXISTS "audit"')
    op.execute('DROP SCHEMA IF EXISTS "analytics"')
    op.execute('DROP SCHEMA IF EXISTS "warehouse"')
    op.execute('DROP SCHEMA IF EXISTS "staging"')
    op.execute('DROP SCHEMA IF EXISTS "auth"')
