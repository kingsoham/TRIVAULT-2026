from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.stored_file import StoredFile


class User(SQLModel, table=True):
    """
    User entity representing registered account holders.
    Never stores plaintext passwords.
    """
    __tablename__ = "user"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, min_length=3, max_length=50, nullable=False)
    email: str = Field(unique=True, index=True, min_length=5, max_length=255, nullable=False)
    password_hash: str = Field(nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationship to user's stored files
    files: List["StoredFile"] = Relationship(back_populates="owner", cascade_delete=True)
