# ABOUTME: Tests for database URL handling.
# ABOUTME: Railway's postgresql:// URL must use the installed psycopg2 driver.

from sqlalchemy.engine import make_url

from app.database import engine_url


def test_postgres_urls_use_psycopg2():
    for url in ("postgresql://u:p@host:5432/db", "postgres://u:p@host:5432/db"):
        assert make_url(engine_url(url)).get_dialect().driver == "psycopg2"
    assert engine_url("postgresql+psycopg2://u:p@h/db") == "postgresql+psycopg2://u:p@h/db"
    assert engine_url("sqlite:///data/x.db") == "sqlite:///data/x.db"
