# Testing Strategy & Automated Results — TriVault

**Tagline:** Split into Three. Secured as One.  
**Project:** Secure File Storage Using Encryption and Three-Shard Storage  

---

## 1. Test Strategy & Architecture

TriVault enforces a strict automated quality assurance pipeline:
1. **Isolated Test Environments:** Automated tests run against an in-memory SQLite database (`StaticPool`) and a temporary filesystem directory (`tempfile.mkdtemp`), completely isolated from developer and production data.
2. **Deterministic Cryptographic Checks:** Validates round-trip encryption, tampered payload rejection, and exact 3-shard splits.
3. **Cross-User Isolation Tests:** Confirms that User B cannot download, read metadata for, rename, or delete User A's files under any circumstance.
4. **Failure Injection & Tamper Auditing:** Explicitly injects missing shard files, altered byte content, and malformed manifests to prove that TriVault detects corruption and prevents delivery of compromised files.

---

## 2. Test Execution Commands (Windows PowerShell)

To execute the complete test suite:

```powershell
# Activate backend virtual environment
.\backend\venv\Scripts\Activate.ps1

# Run pytest with verbose reporting
pytest backend/tests -v
```

To run the real-world end-to-end pipeline verification script:

```powershell
python backend/verify_e2e.py
```

---

## 3. Actual Test Suite Results

### 3.1 Pytest Execution Summary
- **Execution Date:** 2026-10-20
- **Platform:** Windows (Python 3.13.7, pytest 9.1.1)
- **Status:** **41 PASSED, 0 FAILED** (Duration: 9.34 seconds)

```
============================= test session starts =============================
backend/tests/test_auth.py::test_register_user_success PASSED            [  2%]
backend/tests/test_auth.py::test_register_duplicate_username PASSED      [  4%]
backend/tests/test_auth.py::test_register_duplicate_email PASSED         [  7%]
backend/tests/test_auth.py::test_login_success PASSED                    [  9%]
backend/tests/test_auth.py::test_login_with_email_success PASSED         [ 12%]
backend/tests/test_auth.py::test_login_incorrect_password PASSED         [ 14%]
backend/tests/test_auth.py::test_login_nonexistent_user PASSED           [ 17%]
backend/tests/test_auth.py::test_get_me_success PASSED                   [ 19%]
backend/tests/test_auth.py::test_get_me_missing_token PASSED             [ 21%]
backend/tests/test_auth.py::test_get_me_invalid_token PASSED             [ 24%]
backend/tests/test_files.py::test_upload_file_success PASSED             [ 26%]
backend/tests/test_files.py::test_download_file_success PASSED           [ 29%]
backend/tests/test_files.py::test_empty_file_upload_and_download PASSED  [ 31%]
backend/tests/test_files.py::test_duplicate_original_filename PASSED     [ 34%]
backend/tests/test_files.py::test_unauthenticated_requests_denied PASSED [ 36%]
backend/tests/test_files.py::test_cross_user_isolation PASSED            [ 39%]
backend/tests/test_files.py::test_file_rename_success PASSED             [ 41%]
backend/tests/test_files.py::test_delete_file_cleans_up_storage PASSED   [ 43%]
backend/tests/test_files.py::test_missing_shard_fails_integrity PASSED   [ 46%]
backend/tests/test_files.py::test_corrupted_shard_checksum_mismatch PASSED [ 48%]
backend/tests/test_files.py::test_corrupted_manifest_fails_download PASSED [ 51%]
backend/tests/test_files.py::test_list_files_and_search PASSED           [ 53%]
backend/tests/test_security.py::TestEncryption::test_encrypt_decrypt_round_trip PASSED [ 56%]
backend/tests/test_security.py::TestEncryption::test_encrypt_empty_bytes PASSED [ 58%]
backend/tests/test_security.py::TestEncryption::test_encrypt_large_payload PASSED [ 60%]
backend/tests/test_security.py::TestEncryption::test_tampered_ciphertext_fails PASSED [ 63%]
backend/tests/test_security.py::TestEncryption::test_invalid_type_raises_type_error PASSED [ 65%]
backend/tests/test_security.py::TestSharding::test_split_returns_exactly_three_shards PASSED [ 68%]
backend/tests/test_security.py::TestSharding::test_split_empty_data PASSED [ 70%]
backend/tests/test_security.py::TestSharding::test_split_single_byte PASSED [ 73%]
backend/tests/test_security.py::TestSharding::test_split_two_bytes PASSED [ 75%]
backend/tests/test_security.py::TestSharding::test_split_uneven_lengths PASSED [ 78%]
backend/tests/test_security.py::TestSharding::test_invalid_shard_count_rejected PASSED [ 80%]
backend/tests/test_security.py::TestSharding::test_combine_wrong_shard_count_raises PASSED [ 82%]
backend/tests/test_security.py::TestSharding::test_combine_non_bytes_raises_type_error PASSED [ 85%]
backend/tests/test_security.py::TestPasswords::test_hash_and_verify PASSED [ 87%]
backend/tests/test_security.py::TestPasswords::test_empty_password_raises PASSED [ 90%]
backend/tests/test_security.py::TestPasswords::test_exceeding_max_length_raises PASSED [ 92%]
backend/tests/test_security.py::TestTokens::test_create_and_decode_token PASSED [ 95%]
backend/tests/test_security.py::TestTokens::test_expired_token_raises_error PASSED [ 97%]
backend/tests/test_security.py::TestTokens::test_tampered_token_signature_fails PASSED [100%]
======================== 41 passed, 1 warning in 9.34s ========================
```

---

## 4. End-to-End Pipeline Verification (`verify_e2e.py`)

A live runtime script validates the 11-step lifecycle against real SQLite storage:
1. `[Step 1]` Core Health Check: Verified online, SQLite connected, storage folder accessible.
2. `[Step 2]` User Registration: Created test account with salted bcrypt hash.
3. `[Step 3]` JWT Login: Issued valid HS256 token.
4. `[Step 4]` File Upload: Processed 70-byte secret payload.
5. `[Step 5 & 6]` Disk & Encryption Check: Verified `shard_1.enc` (62B), `shard_2.enc` (61B), `shard_3.enc` (61B), and `manifest.json`. Verified 0% plaintext presence.
6. `[Step 7]` Metadata Verification: Confirmed SQLite record fields.
7. `[Step 8 & 9]` Reassembly & Decryption: Downloaded and compared bytes (100% exact match).
8. `[Step 10]` Cross-User Denial: Secondary user received `HTTP 404`.
9. `[Step 11]` Clean Deletion: Erased physical folder and database record. Subsequent download returned `HTTP 404`.

**Result:** `ALL 11 REAL-TIME END-TO-END PIPELINE CHECKS PASSED!`
