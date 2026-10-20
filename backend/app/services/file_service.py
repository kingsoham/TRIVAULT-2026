import hashlib
import json
import os
import shutil
import uuid
from pathlib import Path
from typing import Dict, List, Tuple, Any

from app.config import get_settings
from app.security.encryption import encrypt_data, decrypt_data, DecryptionError
from app.security.sharding import split_data, combine_shards, ShardingError


class StorageServiceError(Exception):
    """Base exception for file storage operations."""
    pass


class StorageNotFoundError(StorageServiceError):
    """Raised when a storage directory, shard, or manifest is not found."""
    pass


class StorageIntegrityError(StorageServiceError):
    """Raised when shard integrity or manifest validation fails."""
    pass


def _calculate_sha256(data: bytes) -> str:
    """Calculate SHA-256 hex digest for given bytes."""
    return hashlib.sha256(data).hexdigest()


def _get_validated_storage_dir(storage_id: str) -> Path:
    """
    Safely resolve the directory path for a given storage_id.
    Guarantees that the resolved path is strictly within the configured storage root,
    preventing directory traversal attacks.
    """
    settings = get_settings()
    storage_root = settings.storage_path

    # Disallow path separators in storage_id
    if not storage_id or "/" in storage_id or "\\" in storage_id or ".." in storage_id:
        raise StorageServiceError("Invalid storage identifier.")

    target_dir = (storage_root / storage_id).resolve()
    try:
        # Check that target_dir is strictly inside storage_root
        target_dir.relative_to(storage_root)
    except ValueError:
        raise StorageServiceError("Directory traversal attempt detected.")

    return target_dir


class FileService:
    @staticmethod
    def process_and_store_file(file_bytes: bytes, original_filename: str) -> Tuple[str, Dict[str, Any]]:
        """
        Processes an uploaded file through the TriVault pipeline:
        1. Encrypt plaintext bytes using Fernet.
        2. Split the resulting ciphertext into exactly 3 ordered shards.
        3. Persist shards and non-secret manifest into a unique storage directory.
        4. If an error occurs, cleanly remove the incomplete directory.
        
        Returns (storage_id, manifest_dict).
        """
        settings = get_settings()
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise StorageServiceError(
                f"File size ({len(file_bytes)} bytes) exceeds the maximum allowed limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes."
            )

        # 1. Authenticated Encryption
        encrypted_data = encrypt_data(file_bytes)

        # 2. Split ciphertext into 3 shards
        shards = split_data(encrypted_data, number_of_shards=3)

        # 3. Create unique storage directory
        storage_id = f"file_{uuid.uuid4().hex}"
        storage_dir = _get_validated_storage_dir(storage_id)

        try:
            storage_dir.mkdir(parents=True, exist_ok=False)

            shard_records: List[Dict[str, Any]] = []

            for idx, shard_bytes in enumerate(shards, start=1):
                shard_filename = f"shard_{idx}.enc"
                shard_path = storage_dir / shard_filename
                shard_sha256 = _calculate_sha256(shard_bytes)
                shard_size = len(shard_bytes)

                # Write shard to filesystem
                with open(shard_path, "wb") as f:
                    f.write(shard_bytes)

                shard_records.append({
                    "index": idx,
                    "filename": shard_filename,
                    "size_bytes": shard_size,
                    "sha256": shard_sha256,
                })

            manifest = {
                "storage_id": storage_id,
                "expected_shard_count": 3,
                "shard_order": [1, 2, 3],
                "shards": shard_records,
                "original_filename": original_filename,
            }

            manifest_path = storage_dir / "manifest.json"
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)

            return storage_id, manifest

        except Exception as exc:
            # Atomic cleanup on failure: ensure no dangling partial shards
            if storage_dir.exists():
                shutil.rmtree(storage_dir, ignore_errors=True)
            raise StorageServiceError(f"Failed to persist file shards: {str(exc)}") from exc

    @staticmethod
    def load_and_reassemble_file(storage_id: str) -> bytes:
        """
        Reconstructs the original plaintext bytes from persisted shards:
        1. Validates storage directory and manifest.json.
        2. Validates shard existence, sizes, and SHA-256 integrity checksums.
        3. Reassembles the 3 shards in strict sequential order.
        4. Decrypts the combined ciphertext using Fernet.
        5. Returns original file bytes.
        """
        storage_dir = _get_validated_storage_dir(storage_id)
        if not storage_dir.exists() or not storage_dir.is_dir():
            raise StorageNotFoundError(f"Storage directory for '{storage_id}' was not found.")

        manifest_path = storage_dir / "manifest.json"
        if not manifest_path.exists():
            raise StorageIntegrityError("Manifest file is missing.")

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception as exc:
            raise StorageIntegrityError("Manifest file is corrupted or not valid JSON.") from exc

        if manifest.get("expected_shard_count") != 3:
            raise StorageIntegrityError("Manifest specifies invalid shard count.")

        shard_records = manifest.get("shards", [])
        if len(shard_records) != 3:
            raise StorageIntegrityError("Manifest does not contain exactly 3 shard entries.")

        # Sort shards by index to ensure strict ordering
        sorted_records = sorted(shard_records, key=lambda x: x.get("index", 0))

        shards_bytes: List[bytes] = []

        for record in sorted_records:
            shard_filename = record.get("filename")
            expected_hash = record.get("sha256")
            expected_size = record.get("size_bytes")

            if not shard_filename or expected_hash is None or expected_size is None:
                raise StorageIntegrityError("Manifest entry is missing required fields.")

            shard_path = storage_dir / shard_filename
            if not shard_path.exists():
                raise StorageIntegrityError(f"Required shard file '{shard_filename}' is missing from storage.")

            with open(shard_path, "rb") as f:
                shard_content = f.read()

            if len(shard_content) != expected_size:
                raise StorageIntegrityError(
                    f"Shard '{shard_filename}' size mismatch: expected {expected_size}, got {len(shard_content)}."
                )

            actual_hash = _calculate_sha256(shard_content)
            if actual_hash != expected_hash:
                raise StorageIntegrityError(
                    f"Shard '{shard_filename}' integrity failure: checksum mismatch."
                )

            shards_bytes.append(shard_content)

        # Reassemble the encrypted shards
        try:
            reconstructed_encrypted = combine_shards(shards_bytes)
        except ShardingError as exc:
            raise StorageIntegrityError("Failed to reassemble shards.") from exc

        # Decrypt ciphertext
        try:
            original_bytes = decrypt_data(reconstructed_encrypted)
        except DecryptionError as exc:
            raise StorageIntegrityError("Decryption failed during file reassembly.") from exc

        return original_bytes

    @staticmethod
    def get_shard_manifest_info(storage_id: str) -> List[Dict[str, Any]]:
        """
        Reads safe shard metadata (sizes, indices, sha256) for inspection in UI or tests.
        Never reveals absolute paths or encryption keys.
        """
        storage_dir = _get_validated_storage_dir(storage_id)
        manifest_path = storage_dir / "manifest.json"
        if not manifest_path.exists():
            return []

        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            return manifest.get("shards", [])
        except Exception:
            return []

    @staticmethod
    def delete_storage(storage_id: str) -> bool:
        """
        Safely removes the shard directory and all contained files.
        Returns True if deleted or did not exist, or raises StorageServiceError on failure.
        """
        try:
            storage_dir = _get_validated_storage_dir(storage_id)
            if storage_dir.exists() and storage_dir.is_dir():
                shutil.rmtree(storage_dir)
            return True
        except Exception as exc:
            raise StorageServiceError(f"Failed to delete storage directory: {str(exc)}") from exc
