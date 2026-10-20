from typing import Generator
from sqlmodel import SQLModel, Session, create_engine
from app.config import get_settings

# SQLite connection args to allow multi-threaded access in FastAPI
connect_args = {"check_same_thread": False}

_engine = None


def get_engine():
    """Create or return the SQLite database engine."""
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(
            settings.DATABASE_URL,
            echo=False,
            connect_args=connect_args
        )
    return _engine


def init_db() -> None:
    """Initialize database tables for SQLModel entities."""
    # Ensure all models are imported before creating tables
    from app.models.user import User  # noqa: F401
    from app.models.stored_file import StoredFile  # noqa: F401

    engine = get_engine()
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Dependency that provides a database session for requests."""
    engine = get_engine()
    with Session(engine) as session:
        yield session
