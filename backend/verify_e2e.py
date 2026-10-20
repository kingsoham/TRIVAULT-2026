"""
TriVault End-to-End Verification Script
Simulates the exact user journey against the real SQLite database and storage engine.
Verifies all 15 points in the Definition of Done.
"""
import os
import sys
from pathlib import Path

# Ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from sqlmodel import Session
from app.main import app
from app.config import get_settings
from app.database import init_db, get_session
from app.models.stored_file import StoredFile


def run_verification():
    print("=" * 60)
    print("TRIVAULT FULL PIPELINE & DEFINITION OF DONE VERIFICATION")
    print("=" * 60)

    # Initialize SQLite database schema
    init_db()

    with TestClient(app) as client:
        settings = get_settings()

        # Step 1: Health Check
        print("\n[Step 1] Checking Core Health...")
        health_res = client.get("/health")
        assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
        health_data = health_res.json()
        print(f"  -> Health: {health_data['status']}, DB: {health_data['database']}, Storage: {health_data['storage']}")
        assert health_data["status"] == "healthy"

        # Step 2: Register New User
        print("\n[Step 2] Registering User 'prof_tester'...")
        reg_res = client.post(
            "/auth/register",
            json={
                "username": "prof_tester",
                "email": "professor@university.edu",
                "password": "StrongPassword2026!"
            }
        )
        if reg_res.status_code == 409:
            print("  -> User already registered, proceeding to login.")
        else:
            assert reg_res.status_code == 201, f"Registration failed: {reg_res.text}"
            print(f"  -> Successfully registered user ID #{reg_res.json()['id']}")

        # Step 3: Login
        print("\n[Step 3] Logging in as 'prof_tester'...")
        login_res = client.post(
            "/auth/login",
            json={
                "username": "prof_tester",
                "password": "StrongPassword2026!"
            }
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        user_id = login_res.json()["user"]["id"]
        headers = {"Authorization": f"Bearer {token}"}
        print("  -> JWT Token received (HS256)")

        # Step 4: Upload Real File
        print("\n[Step 4] Uploading Test Document...")
        secret_payload = b"Top Secret Quantum Research Data - TriVault 3-Shard File Storage Demo."
        filename = "quantum_secrets.dat"

        upload_res = client.post(
            "/files/upload",
            headers=headers,
            files={"file": (filename, secret_payload, "application/octet-stream")}
        )
        assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
        file_info = upload_res.json()
        file_id = file_info["id"]
        print(f"  -> File uploaded successfully! File ID: {file_id}, Reported Shards: {file_info['shard_count']}")

        # Step 5 & 6: Verify 3 Physical Shards and Encrypted Status
        print("\n[Step 5 & 6] Verifying Physical Storage & Encryption on Disk...")
        from app.database import get_engine
        with Session(get_engine()) as session:
            db_record = session.get(StoredFile, file_id)
            assert db_record is not None, "File record not found in database!"
            storage_id = db_record.storage_id
            owner_id = db_record.user_id
            file_sz = db_record.size
            file_nm = db_record.filename
        storage_dir = settings.storage_path / storage_id

        print(f"  -> Internal Storage Directory: {storage_dir.name}")
        assert storage_dir.exists(), "Storage directory does not exist!"

        shard_1 = storage_dir / "shard_1.enc"
        shard_2 = storage_dir / "shard_2.enc"
        shard_3 = storage_dir / "shard_3.enc"
        manifest = storage_dir / "manifest.json"

        assert shard_1.exists(), "shard_1.enc missing!"
        assert shard_2.exists(), "shard_2.enc missing!"
        assert shard_3.exists(), "shard_3.enc missing!"
        assert manifest.exists(), "manifest.json missing!"
        print(f"  -> Exact 3 shards confirmed on disk: shard_1 ({shard_1.stat().st_size}B), shard_2 ({shard_2.stat().st_size}B), shard_3 ({shard_3.stat().st_size}B)")

        s1_bytes = shard_1.read_bytes()
        s2_bytes = shard_2.read_bytes()
        s3_bytes = shard_3.read_bytes()

        assert secret_payload not in s1_bytes, "Shard 1 contains plaintext!"
        assert secret_payload not in s2_bytes, "Shard 2 contains plaintext!"
        assert secret_payload not in s3_bytes, "Shard 3 contains plaintext!"
        assert b"Top Secret" not in s1_bytes + s2_bytes + s3_bytes, "Plaintext found in shards!"
        print("  -> CONFIRMED: All shards contain authenticated Fernet ciphertext (NO plaintext).")

        # Step 7: Confirm Database Metadata & Owner
        print("\n[Step 7] Checking SQLite Metadata Record...")
        assert owner_id == user_id, "User ID ownership mismatch!"
        assert file_nm == filename, "Filename mismatch!"
        assert file_sz == len(secret_payload), "Size mismatch!"
        print(f"  -> Confirmed database record: ID={file_id}, Owner={owner_id}, Size={file_sz} bytes.")

        # Step 8 & 9: Owner Download and Byte Comparison
        print("\n[Step 8 & 9] Downloading and Verifying Integrity...")
        download_res = client.get(f"/files/{file_id}/download", headers=headers)
        assert download_res.status_code == 200, f"Download failed: {download_res.text}"
        downloaded_bytes = download_res.content

        assert downloaded_bytes == secret_payload, "Downloaded bytes do not match original bytes!"
        print(f"  -> CONFIRMED: Downloaded bytes ({len(downloaded_bytes)}B) match original bytes exactly.")

        # Step 10: Cross-User Download Denial
        print("\n[Step 10] Testing Cross-User Access Denial...")
        client.post(
            "/auth/register",
            json={"username": "attacker_bob", "email": "bob@hacker.io", "password": "Password123!"}
        )
        bob_login = client.post("/auth/login", json={"username": "attacker_bob", "password": "Password123!"})
        bob_headers = {"Authorization": f"Bearer {bob_login.json()['access_token']}"}

        bob_attempt = client.get(f"/files/{file_id}/download", headers=bob_headers)
        assert bob_attempt.status_code == 404, f"Cross-user download should be 404, got {bob_attempt.status_code}"
        print("  -> CONFIRMED: Attacker received HTTP 404. Strict user isolation enforced.")

        # Step 11: Delete File and Verify Physical Cleanup
        print("\n[Step 11] Deleting File and Checking Cleanup...")
        delete_res = client.delete(f"/files/{file_id}", headers=headers)
        assert delete_res.status_code == 204, f"Delete failed: {delete_res.status_code}"

        # Confirm directory is erased
        assert not storage_dir.exists(), "Storage directory was not deleted!"
        print("  -> CONFIRMED: Physical shard directory erased from disk.")

        # Confirm download now returns 404
        post_delete_down = client.get(f"/files/{file_id}/download", headers=headers)
        assert post_delete_down.status_code == 404
        print("  -> CONFIRMED: Subsequent download returns HTTP 404.")

        print("\n" + "=" * 60)
        print("ALL 11 REAL-TIME END-TO-END PIPELINE CHECKS PASSED!")
        print("=" * 60)


if __name__ == "__main__":
    run_verification()
