import os
import shutil
import tempfile
import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool
from cryptography.fernet import Fernet

# Set test environment variables before importing app modules
test_fernet_key = Fernet.generate_key().decode()
test_jwt_secret = "test_jwt_secret_key_minimum_thirty_two_characters_long_for_safety"

os.environ["APP_ENV"] = "testing"
os.environ["JWT_SECRET_KEY"] = test_jwt_secret
os.environ["FERNET_ENCRYPTION_KEY"] = test_fernet_key
os.environ["DATABASE_URL"] = "sqlite://"

from app.config import get_settings
from app.database import get_session
from app.main import app
from app.models.user import User
from app.models.stored_file import StoredFile
from app.security.passwords import get_password_hash
from app.security.tokens import create_access_token


@pytest.fixture(scope="session")
def test_temp_dir() -> Generator[str, None, None]:
    """Create a temporary storage directory for testing that gets destroyed afterwards."""
    temp_dir = tempfile.mkdtemp(prefix="trivault_test_storage_")
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(name="session")
def session_fixture(test_temp_dir: str) -> Generator[Session, None, None]:
    """
    Create a fresh in-memory SQLite database using StaticPool so tables persist across threads,
    and configure storage root to point to the temporary directory.
    """
    settings = get_settings()
    settings.STORAGE_ROOT = test_temp_dir

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        yield session

    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """
    FastAPI TestClient with overridden get_session dependency yielding test session.
    """
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(session: Session) -> dict:
    """Helper fixture providing authentication headers for a registered test user."""
    user = User(
        username="alice_test",
        email="alice@example.com",
        password_hash=get_password_hash("Password123!")
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}", "User-Id": str(user.id)}


@pytest.fixture
def secondary_auth_headers(session: Session) -> dict:
    """Helper fixture providing authentication headers for a secondary user to test isolation."""
    user = User(
        username="bob_test",
        email="bob@example.com",
        password_hash=get_password_hash("Password456!")
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}", "User-Id": str(user.id)}
