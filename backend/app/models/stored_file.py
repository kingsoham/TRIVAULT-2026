from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.user import User


class StoredFile(SQLModel, table=True):
    """
    Metadata representation for a file stored across three encrypted shards.
    Never stores original file contents or encryption keys in the database.
    """
    __tablename__ = "stored_file"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(index=True, max_length=255, nullable=False, description="Sanitized original filename")
    storage_id: str = Field(unique=True, index=True, nullable=False, description="Internal unique directory identifier")
    size: int = Field(nullable=False, description="Original unencrypted file size in bytes")
    user_id: int = Field(foreign_key="user.id", index=True, nullable=False, description="Owner ID")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        description="UTC creation timestamp"
    )
    shard_count: int = Field(default=3, nullable=False, description="Number of shards generated (always 3)")
    content_type: str = Field(default="application/octet-stream", max_length=128, nullable=False)

    # Relationship to user
    owner: Optional["User"] = Relationship(back_populates="files")
