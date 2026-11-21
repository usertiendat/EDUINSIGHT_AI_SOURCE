import sys
from pathlib import Path

from alembic import context

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"

sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import Base, engine, DATABASE_URL

import app.models

config = context.config

# Đưa URL vào cấu hình Alembic, xử lý ký tự % trong mật khẩu.
database_url = DATABASE_URL.render_as_string(
    hide_password=False
).replace("%", "%%")

config.set_main_option("sqlalchemy.url", database_url)

# Metadata của toàn bộ SQLAlchemy models.
target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_schemas=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    with engine.connect() as connection:
        context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        include_schemas=True,
    )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
