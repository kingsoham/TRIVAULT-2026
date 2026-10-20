from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class ShardInfo(BaseModel):
    shard_index: int
    size_bytes: int
    sha256_hash: str


class FileResponse(BaseModel):
    id: int
    filename: str
    size: int
    created_at: datetime
    shard_count: int
    content_type: str
    user_id: int

    model_config = ConfigDict(from_attributes=True)


class FileDetailResponse(BaseModel):
    id: int
    filename: str
    size: int
    created_at: datetime
    shard_count: int
    content_type: str
    user_id: int
    shards: List[ShardInfo] = []

    model_config = ConfigDict(from_attributes=True)


class FileListResponse(BaseModel):
    files: List[FileResponse]
    total_count: int
    total_size_bytes: int


class FileRenameRequest(BaseModel):
    new_filename: str = Field(..., min_length=1, max_length=255, description="New display name for file")

    @field_validator("new_filename")
    @classmethod
    def validate_filename(cls, v: str) -> str:
        clean = v.strip()
        # Prevent path traversal and dangerous characters
        if not clean or any(c in clean for c in ['/', '\\', '\0', '..']):
            raise ValueError("Invalid filename. Path traversal characters are not permitted.")
        return clean
