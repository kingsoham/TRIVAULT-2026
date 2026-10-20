# Security Architecture & Threat Model — TriVault

**Tagline:** Split into Three. Secured as One.  
**Project:** Secure File Storage Using Encryption and Three-Shard Storage  

---

## 1. Password Security & Storage

TriVault utilizes `bcrypt` for password credential verification:
- **Salt Generation:** Every password hash is generated with a unique, cryptographically random salt using `bcrypt.gensalt(rounds=12)`.
- **Work Factor (Cost):** 12 rounds require $2^{12} = 4096$ iterations, making brute-force dictionary attacks computationally expensive on modern GPU clusters.
- **Hashing vs. Encryption:** Passwords are never encrypted; they are **one-way hashed**. TriVault can verify whether a submitted password matches the hash, but the application server can never invert the hash to recover the plaintext password.

---

## 2. Authentication & Authorization

### 2.1 JSON Web Tokens (JWT)
- **Algorithm:** HMAC-SHA256 (`HS256`) signed with a dedicated server secret key (`JWT_SECRET_KEY`) separate from the file encryption key.
- **Claims:** Includes standard claims: `sub` (User ID), `iat` (Issued At), and `exp` (Expiration Timestamp, default 24 hours).
- **Stateless Verification:** The server verifies token authenticity via cryptographic signature verification without performing repeated session lookups in external caches.

### 2.2 Ownership & Isolation
- **Source of Truth:** Ownership is strictly bound to the authenticated `User.id` resolved from the cryptographically verified JWT.
- **Rejection of Client-Supplied IDs:** API endpoints do not accept client-provided `user_id` query or body parameters.
- **Resource Enumeration Prevention:** If User B attempts to access, download, rename, or delete User A's file, the API responds with `HTTP 404 Not Found` rather than `403 Forbidden` to prevent unauthorized resource enumeration.

---

## 3. Cryptographic Storage Pipeline

### 3.1 Fernet Authenticated Encryption
File bytes are encrypted using the official Fernet specification (`cryptography.fernet`):
1. **Symmetric Cipher:** 128-bit AES in Cipher Block Chaining (CBC) mode with PKCS7 padding.
2. **Initialization Vector (IV):** A 16-byte cryptographically secure random IV is generated for every encryption operation.
3. **Authentication Tag:** A 32-byte HMAC-SHA256 tag covers the version, timestamp, IV, and ciphertext.
4. **Tamper Rejection:** Any alteration of the encrypted payload causes `InvalidToken` during decryption, aborting before any compromised bytes can be read.

### 3.2 3-Shard Splitting
- Ciphertext bytes are divided into exactly 3 ordered sequential partitions ($S_1, S_2, S_3$).
- **Important Academic Clarification:** Sharding is **not** encryption, and basic sharding is **not** an erasure code or backup mechanism. All three shards are required to reassemble the ciphertext. Sharding provides partitioned physical storage, while Fernet provides confidentiality and authenticity.

### 3.3 Checksum Integrity Auditing
Each shard directory contains a `manifest.json` recording:
- Shard index and expected byte size.
- Precomputed SHA-256 hash digests.
Before reassembly, TriVault re-computes the SHA-256 digest of each physical file on disk. Any discrepancy immediately halts reconstruction with `StorageIntegrityError`.

---

## 4. Path Traversal & Injection Defenses

1. **Path Traversal Protection:** Internal storage paths are constructed from generated UUIDs (`file_<uuid>`), never from user-supplied filenames.
2. **Relative Path Enforcement:** `FileService` enforces `resolved_path.relative_to(storage_root)`. Any path containing `..`, null bytes (`\0`), or absolute paths is rejected.
3. **HTTP Header Injection Defense:** The `Content-Disposition` header encodes filenames using RFC 5987 / RFC 6266 `filename*=UTF-8''` syntax, stripping newline characters (`\r`, `\n`) and double quotes.

---

## 5. Security Limitations & Non-Goals

Honest documentation of security boundaries is a vital component of engineering ethics:

1. **Local Filesystem Colocation:** In this field project implementation, all three shards are stored in subdirectories on the same physical host machine. They are not geographically distributed across separate servers.
2. **No Redundancy (Fault Tolerance):** Losing any single shard prevents file recovery. The system does not employ Reed-Solomon erasure coding or Shamir's Secret Sharing.
3. **Key Management Tradeoffs:** A single static symmetric key (`FERNET_ENCRYPTION_KEY`) is configured via environment variables. If this master key is lost, all previously uploaded files become permanently unrecoverable.
4. **Threats Not Protected Against:**
   - **Root / OS Compromise:** If an attacker gains administrative access to the operating system hosting TriVault, they can read the `.env` file and inspect storage files.
   - **Client-Side XSS:** In web browsers, storing JWT tokens in `localStorage` makes them susceptible to exfiltration if a Cross-Site Scripting (XSS) vulnerability exists.
