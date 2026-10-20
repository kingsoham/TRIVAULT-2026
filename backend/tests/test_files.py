import io
import json
from pathlib import Path
from fastapi.testclient import TestClient
from sqlmodel import Session
from app.config import get_settings
from app.models.stored_file import StoredFile


def test_upload_file_success(client: TestClient, auth_headers: dict, session: Session):
    file_content = b"Hello, TriVault! This is secret project documentation."
    filename = "confidential_project.txt"

    response = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": (filename, io.BytesIO(file_content), "text/plain")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == filename
    assert data["size"] == len(file_content)
    assert data["shard_count"] == 3
    file_id = data["id"]

    # 1. Verify Database Record
    db_file = session.get(StoredFile, file_id)
    assert db_file is not None
    assert db_file.storage_id is not None

    # 2. Verify Storage on Disk
    settings = get_settings()
    storage_dir = settings.storage_path / db_file.storage_id
    assert storage_dir.exists()
    assert (storage_dir / "shard_1.enc").exists()
    assert (storage_dir / "shard_2.enc").exists()
    assert (storage_dir / "shard_3.enc").exists()
    assert (storage_dir / "manifest.json").exists()

    # 3. Verify Shards are Encrypted (not plaintext)
    shard_1_bytes = (storage_dir / "shard_1.enc").read_bytes()
    assert file_content not in shard_1_bytes
    assert b"Hello, TriVault!" not in shard_1_bytes


def test_download_file_success(client: TestClient, auth_headers: dict):
    original_data = b"Arbitrary binary content: \x00\x01\x02\xFF\xFE\xFD and text!"
    filename = "sample.bin"

    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": (filename, io.BytesIO(original_data), "application/octet-stream")}
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    download_res = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert download_res.status_code == 200
    assert download_res.content == original_data
    assert 'attachment;' in download_res.headers["content-disposition"]


def test_empty_file_upload_and_download(client: TestClient, auth_headers: dict):
    empty_data = b""
    filename = "empty.txt"

    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": (filename, io.BytesIO(empty_data), "text/plain")}
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    download_res = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert download_res.status_code == 200
    assert download_res.content == empty_data


def test_duplicate_original_filename(client: TestClient, auth_headers: dict):
    file_a = b"First version"
    file_b = b"Second version with different content"

    res_a = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("report.pdf", io.BytesIO(file_a), "application/pdf")}
    )
    res_b = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("report.pdf", io.BytesIO(file_b), "application/pdf")}
    )
    assert res_a.status_code == 201
    assert res_b.status_code == 201
    id_a = res_a.json()["id"]
    id_b = res_b.json()["id"]
    assert id_a != id_b

    # Verify both can be independently downloaded
    down_a = client.get(f"/files/{id_a}/download", headers={"Authorization": auth_headers["Authorization"]})
    down_b = client.get(f"/files/{id_b}/download", headers={"Authorization": auth_headers["Authorization"]})
    assert down_a.content == file_a
    assert down_b.content == file_b


def test_unauthenticated_requests_denied(client: TestClient):
    # Upload without token
    res_upload = client.post(
        "/files/upload",
        files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")}
    )
    assert res_upload.status_code == 401

    # Download without token
    res_download = client.get("/files/1/download")
    assert res_download.status_code == 401


def test_cross_user_isolation(
    client: TestClient,
    auth_headers: dict,
    secondary_auth_headers: dict
):
    # Alice uploads a file
    alice_data = b"Alice's confidential secrets."
    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("alice_secret.txt", io.BytesIO(alice_data), "text/plain")}
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["id"]

    # Bob tries to download Alice's file -> 404
    bob_down = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": secondary_auth_headers["Authorization"]}
    )
    assert bob_down.status_code == 404

    # Bob tries to get metadata for Alice's file -> 404
    bob_meta = client.get(
        f"/files/{file_id}",
        headers={"Authorization": secondary_auth_headers["Authorization"]}
    )
    assert bob_meta.status_code == 404

    # Bob tries to rename Alice's file -> 404
    bob_rename = client.patch(
        f"/files/{file_id}/rename",
        headers={"Authorization": secondary_auth_headers["Authorization"]},
        json={"new_filename": "hacked.txt"}
    )
    assert bob_rename.status_code == 404

    # Bob tries to delete Alice's file -> 404
    bob_del = client.delete(
        f"/files/{file_id}",
        headers={"Authorization": secondary_auth_headers["Authorization"]}
    )
    assert bob_del.status_code == 404

    # Alice can still download her file
    alice_down = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert alice_down.status_code == 200
    assert alice_down.content == alice_data


def test_file_rename_success(client: TestClient, auth_headers: dict):
    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("old_name.txt", io.BytesIO(b"text"), "text/plain")}
    )
    file_id = upload_res.json()["id"]

    rename_res = client.patch(
        f"/files/{file_id}/rename",
        headers={"Authorization": auth_headers["Authorization"]},
        json={"new_filename": "new_name.txt"}
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["filename"] == "new_name.txt"

    # Verify download preserves new filename in Content-Disposition
    down_res = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert "new_name.txt" in down_res.headers["content-disposition"]


def test_delete_file_cleans_up_storage(
    client: TestClient,
    auth_headers: dict,
    session: Session
):
    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("to_delete.txt", io.BytesIO(b"disposable content"), "text/plain")}
    )
    file_id = upload_res.json()["id"]

    db_file = session.get(StoredFile, file_id)
    storage_id = db_file.storage_id
    settings = get_settings()
    storage_dir = settings.storage_path / storage_id
    assert storage_dir.exists()

    # Delete file
    del_res = client.delete(
        f"/files/{file_id}",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert del_res.status_code == 204

    # Verify database record is gone
    session.expire_all()
    assert session.get(StoredFile, file_id) is None

    # Verify storage directory is deleted from disk
    assert not storage_dir.exists()


def test_missing_shard_fails_integrity(
    client: TestClient,
    auth_headers: dict,
    session: Session
):
    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("fragile.txt", io.BytesIO(b"sharded bytes"), "text/plain")}
    )
    file_id = upload_res.json()["id"]

    db_file = session.get(StoredFile, file_id)
    settings = get_settings()
    shard_2_path = settings.storage_path / db_file.storage_id / "shard_2.enc"
    assert shard_2_path.exists()

    # Simulate disk corruption by removing shard 2
    shard_2_path.unlink()

    down_res = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert down_res.status_code == 500
    assert "missing from storage" in down_res.json()["detail"].lower()


def test_corrupted_shard_checksum_mismatch(
    client: TestClient,
    auth_headers: dict,
    session: Session
):
    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("integrity.txt", io.BytesIO(b"authentic payload"), "text/plain")}
    )
    file_id = upload_res.json()["id"]

    db_file = session.get(StoredFile, file_id)
    settings = get_settings()
    shard_1_path = settings.storage_path / db_file.storage_id / "shard_1.enc"

    # Tamper with bytes in shard 1 while preserving file size
    shard_data = bytearray(shard_1_path.read_bytes())
    if len(shard_data) > 0:
        shard_data[0] ^= 0xFF
        shard_1_path.write_bytes(bytes(shard_data))

    down_res = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert down_res.status_code == 500
    assert "checksum mismatch" in down_res.json()["detail"].lower()


def test_corrupted_manifest_fails_download(
    client: TestClient,
    auth_headers: dict,
    session: Session
):
    upload_res = client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("bad_manifest.txt", io.BytesIO(b"data"), "text/plain")}
    )
    file_id = upload_res.json()["id"]

    db_file = session.get(StoredFile, file_id)
    settings = get_settings()
    manifest_path = settings.storage_path / db_file.storage_id / "manifest.json"

    # Write corrupt JSON to manifest
    manifest_path.write_text("{ corrupt json ...", encoding="utf-8")

    down_res = client.get(
        f"/files/{file_id}/download",
        headers={"Authorization": auth_headers["Authorization"]}
    )
    assert down_res.status_code == 500
    assert "manifest file is corrupted" in down_res.json()["detail"].lower()


def test_list_files_and_search(client: TestClient, auth_headers: dict):
    client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("budget_2026.xlsx", io.BytesIO(b"budget sheet data"), "application/vnd.ms-excel")}
    )
    client.post(
        "/files/upload",
        headers={"Authorization": auth_headers["Authorization"]},
        files={"file": ("vacation_photos.zip", io.BytesIO(b"photo zip archive"), "application/zip")}
    )

    # List all
    res_all = client.get("/files", headers={"Authorization": auth_headers["Authorization"]})
    assert res_all.status_code == 200
    data_all = res_all.json()
    assert data_all["total_count"] >= 2

    # Filter with search term
    res_search = client.get("/files?search=budget", headers={"Authorization": auth_headers["Authorization"]})
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert len(data_search["files"]) == 1
    assert data_search["files"][0]["filename"] == "budget_2026.xlsx"
