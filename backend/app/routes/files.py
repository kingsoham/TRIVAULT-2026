import re
import urllib.parse
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User
from app.models.stored_file import StoredFile
from app.schemas.files import (
    FileResponse,
    FileDetailResponse,
    FileListResponse,
    FileRenameRequest,
    ShardInfo,
)
from app.security.dependencies import get_current_user
from app.services.file_service import (
    FileService,
    StorageServiceError,
    StorageNotFoundError,
    StorageIntegrityError,
)
from app.config import get_settings

router = APIRouter(prefix="/files", tags=["Files"])


def _sanitize_filename(name: Optional[str]) -> str:
    """Strip directory traversal attempts, null bytes, and newline injection."""
    if not name:
        return "unnamed_file"
    base = Path(name).name
    # Remove control characters, quotes, and newlines
    clean = re.sub(r'[\r\n\t\x00-\x1f"]', '', base).strip()
    return clean if clean else "unnamed_file"


@router.post(
    "/upload",
    response_model=FileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload, encrypt, and store a file across 3 shards"
)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Encrypts file contents using Fernet authenticated encryption,
    splits ciphertext into 3 shards, records checksums in manifest.json,
    and persists metadata linked to the authenticated user.
    """
    settings = get_settings()

    # Read uploaded file contents into memory (bounded by MAX_UPLOAD_SIZE_BYTES)
    file_bytes = await file.read()
    if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024):.1f} MB."
        )

    clean_filename = _sanitize_filename(file.filename)
    content_type = file.content_type or "application/octet-stream"

    # Execute encryption and 3-shard persistence
    try:
        storage_id, _ = FileService.process_and_store_file(
            file_bytes=file_bytes,
            original_filename=clean_filename
        )
    except StorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage operation failed: {str(exc)}"
        )

    # Persist database record
    stored_file = StoredFile(
        filename=clean_filename,
        storage_id=storage_id,
        size=len(file_bytes),
        user_id=current_user.id,
        shard_count=3,
        content_type=content_type,
    )

    try:
        session.add(stored_file)
        session.commit()
        session.refresh(stored_file)
    except Exception as exc:
        session.rollback()
        # Clean up shards if database persistence fails
        FileService.delete_storage(storage_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record file metadata in database."
        ) from exc

    return stored_file


@router.get(
    "",
    response_model=FileListResponse,
    summary="List files owned by current user"
)
def list_files(
    search: Optional[str] = Query(None, description="Filter by filename substring"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Retrieves all file metadata records belonging to the authenticated user.
    Enforces strict ownership isolation.
    """
    query = select(StoredFile).where(StoredFile.user_id == current_user.id)
    if search:
        query = query.where(StoredFile.filename.contains(search.strip()))

    query = query.order_by(StoredFile.created_at.desc())
    files = session.exec(query).all()

    total_size = sum(f.size for f in files)

    return FileListResponse(
        files=[FileResponse.model_validate(f) for f in files],
        total_count=len(files),
        total_size_bytes=total_size
    )


@router.get(
    "/{file_id}",
    response_model=FileDetailResponse,
    summary="Get safe metadata and shard details for a file"
)
def get_file_metadata(
    file_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Returns metadata and non-secret shard information (sizes and SHA-256 hashes).
    Cross-user access returns 404 to prevent resource enumeration.
    """
    stored_file = session.get(StoredFile, file_id)
    if not stored_file or stored_file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )

    shards_raw = FileService.get_shard_manifest_info(stored_file.storage_id)
    shards_info = [
        ShardInfo(
            shard_index=s.get("index", idx + 1),
            size_bytes=s.get("size_bytes", 0),
            sha256_hash=s.get("sha256", "")
        )
        for idx, s in enumerate(shards_raw)
    ]

    return FileDetailResponse(
        id=stored_file.id,
        filename=stored_file.filename,
        size=stored_file.size,
        created_at=stored_file.created_at,
        shard_count=stored_file.shard_count,
        content_type=stored_file.content_type,
        user_id=stored_file.user_id,
        shards=shards_info
    )


@router.get(
    "/{file_id}/download",
    summary="Reassemble, decrypt, and download a file"
)
def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Reconstructs the original plaintext file:
    1. Validates user ownership.
    2. Reads and verifies 3 shards against manifest checksums.
    3. Concatenates shards and decrypts with Fernet.
    4. Delivers download with safe RFC-compliant Content-Disposition header.
    """
    stored_file = session.get(StoredFile, file_id)
    if not stored_file or stored_file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )

    try:
        original_bytes = FileService.load_and_reassemble_file(stored_file.storage_id)
    except StorageNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File storage was not found on disk."
        )
    except StorageIntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Integrity check failed: {str(exc)}"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while reconstructing the file."
        )

    # Encode filename for RFC 5987 / RFC 6266 compliance
    encoded_filename = urllib.parse.quote(stored_file.filename)
    # Simple ASCII-safe fallback
    ascii_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', stored_file.filename)

    headers = {
        "Content-Disposition": f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}',
        "Content-Length": str(len(original_bytes)),
    }

    return Response(
        content=original_bytes,
        media_type=stored_file.content_type,
        headers=headers
    )


@router.delete(
    "/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a file and its 3 shards"
)
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Deletes the 3 shards from disk and removes file metadata from the database.
    Denies cross-user deletions.
    """
    stored_file = session.get(StoredFile, file_id)
    if not stored_file or stored_file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )

    storage_id = stored_file.storage_id

    # 1. Delete shards from filesystem
    try:
        FileService.delete_storage(storage_id)
    except StorageServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete storage shards: {str(exc)}"
        )

    # 2. Delete database record
    session.delete(stored_file)
    session.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{file_id}/rename",
    response_model=FileResponse,
    summary="Rename original filename in metadata"
)
def rename_file(
    file_id: int,
    request: FileRenameRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Renames the file's user-facing display name in metadata only.
    Internal storage directories remain safely decoupled from filenames.
    """
    stored_file = session.get(StoredFile, file_id)
    if not stored_file or stored_file.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found."
        )

    clean_name = _sanitize_filename(request.new_filename)
    stored_file.filename = clean_name
    session.add(stored_file)
    session.commit()
    session.refresh(stored_file)

    return stored_file
