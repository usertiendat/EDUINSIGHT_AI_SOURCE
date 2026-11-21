
from sqlalchemy import text

from app.core.database import engine


DATABASE_SCHEMAS = (
    "auth",
    "staging",
    "warehouse",
    "analytics",
    "audit",
)


def create_database_schemas() -> None:
    """Create application schemas if they do not already exist."""
    with engine.begin() as connection:
        for schema in DATABASE_SCHEMAS:
            connection.execute(
                text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"')
            )
