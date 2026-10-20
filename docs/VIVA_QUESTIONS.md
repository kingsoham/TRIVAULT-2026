# Academic Viva Voce & Oral Defense Guide — TriVault

**Tagline:** Split into Three. Secured as One.  
**Project:** Secure File Storage Using Encryption and Three-Shard Storage  
**Target Audience:** Second-Year Engineering Students & Faculty Examiners  

This guide provides 28 anticipated oral examination questions with precise, conceptually sound, and implementation-accurate answers.

---

### Q1. What problem does TriVault solve?
**Answer:** TriVault solves the problem of insecure centralized file storage. Traditional systems store files in plaintext on a disk, meaning anyone with disk access or database read permissions can view private user documents. TriVault guarantees confidentiality and partitioned storage by encrypting files using Fernet (AES-128-CBC + HMAC) and dividing the encrypted data into three ordered shards before writing them to the filesystem.

---

### Q2. Why did you choose this project for your field project?
**Answer:** We wanted to build a practical full-stack application that bridges web development and cybersecurity principles. Rather than building a conventional CRUD app (such as a bookstore or todo list), TriVault applies applied cryptography, deterministic byte partitioning, and strict user isolation in an auditable architecture.

---

### Q3. Why did you choose FastAPI over Flask or Django?
**Answer:** FastAPI was selected because:
1. It natively supports modern Python type hinting, which automatically generates validated Pydantic schemas.
2. It offers high performance built on ASGI (`Starlette` and `Uvicorn`).
3. It automatically generates interactive OpenAPI/Swagger documentation at `/docs`, which is ideal for testing and demonstration.
4. Unlike Django, it is lightweight and allows us to build custom modular architectures without heavyweight defaults.

---

### Q4. What is REST and how does TriVault adhere to it?
**Answer:** REST (Representational State Transfer) is an architectural style for network applications that uses standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`) on URI-identified resources. TriVault adheres to REST by:
- Using standard verbs: `POST /files/upload` to create, `GET /files` to retrieve, `PATCH /files/{id}/rename` to update, and `DELETE /files/{id}` to remove.
- Maintaining stateless communication where every request carries authentication credentials via a JWT Bearer header.

---

### Q5. What is a JWT (JSON Web Token) and how is it used in TriVault?
**Answer:** A JWT is a compact, URL-safe standard (RFC 7519) for transmitting claims between parties as a signed JSON object. In TriVault:
- When a user logs in via `/auth/login`, the server generates an HMAC-SHA256 signed token containing the user's ID (`sub`) and an expiration timestamp (`exp`).
- The client stores this token and passes it in the `Authorization: Bearer <token>` header for subsequent requests.
- The server cryptographically verifies the signature without needing to query a session table for every request.

---

### Q6. What is password hashing and how does it differ from encryption?
**Answer:**
- **Encryption** is a two-way reversible process where plaintext is converted into ciphertext using a key and can be decrypted back to plaintext with the appropriate key.
- **Hashing** is a one-way mathematical function that transforms input of arbitrary length into a fixed-length digest. It is mathematically infeasible to reverse.
In TriVault, passwords are never encrypted; they are hashed using `bcrypt` with random salts so that even if the database is leaked, user passwords cannot be retrieved.

---

### Q7. Why did you choose bcrypt instead of standard SHA-256 for password hashing?
**Answer:** Fast cryptographic hash functions like SHA-256 or MD5 are designed for high-throughput checksumming and can be brute-forced at billions of guesses per second on modern GPUs. `bcrypt` is specifically designed for password security: it includes a configurable work factor (TriVault uses 12 rounds, or 4,096 iterations) and automatic per-password salting, making dictionary and rainbow table attacks computationally prohibitive.

---

### Q8. What is Fernet encryption and what underlying algorithms does it use?
**Answer:** Fernet is a specification provided by the Python `cryptography` library for authenticated symmetric encryption. It uses:
1. **AES-128 in CBC mode** for confidentiality.
2. **PKCS7 padding** to align data to 16-byte blocks.
3. **HMAC-SHA256** for message authentication and integrity.
4. A **16-byte random IV** generated per encryption operation.
Fernet guarantees that ciphertext cannot be read or manipulated without detection.

---

### Q9. What is sharding in TriVault?
**Answer:** Sharding in TriVault refers to the deterministic splitting of encrypted file bytes into three sequential chunks ($S_1, S_2, S_3$). Shard sizes are computed using integer division ($\lfloor L / 3 \rfloor$) with any remainder distributed to the first shards. The shards are stored in separate files (`shard_1.enc`, `shard_2.enc`, `shard_3.enc`) inside a dedicated folder.

---

### Q10. Why use exactly three shards?
**Answer:** Three is the optimal number for a second-year engineering demonstration. It demonstrates that the file is not stored as a single monolithic block, proves the deterministic partitioning and reassembly algorithms, and keeps filesystem overhead low without introducing the complexity of large n-shard distributed clusters.

---

### Q11. What is the fundamental difference between encryption and sharding?
**Answer:**
- **Encryption** provides **confidentiality and authentication**. It transforms meaningful data into pseudorandom ciphertext that cannot be understood without the secret key.
- **Sharding** provides **data partitioning**. It divides a byte stream into pieces. Sharding by itself does not protect data from being read if someone inspects a piece; only encryption makes the shards indecipherable.

---

### Q12. Why are file contents and encryption keys not stored in SQLite?
**Answer:**
1. Storing large binary blobs (files) in SQLite causes database bloat, decreases memory cache efficiency, and slows down indexing.
2. Storing encryption keys in the database would violate key management best practices: an attacker gaining SQL injection access or a database backup would obtain both metadata and decryption keys simultaneously. Keys are kept strictly in validated environment configurations.

---

### Q13. How does file ownership verification work?
**Answer:** The user's identity is extracted directly from the verified JWT payload (`sub` claim), which represents `current_user.id`. When a user requests `/files/{file_id}`, the database queries:
`SELECT * FROM stored_file WHERE id = :file_id AND user_id = :current_user_id`
TriVault never trusts an owner ID sent in the request parameters.

---

### Q14. What happens if a malicious user attempts to access another user's file?
**Answer:** The API returns `HTTP 404 Not Found` rather than `403 Forbidden`. This is a deliberate security decision: returning 403 would confirm to an attacker that a file with that ID exists (resource enumeration), whereas 404 reveals nothing about the existence of other users' data.

---

### Q15. What happens if a shard file is missing from the disk?
**Answer:** During the download workflow, `FileService` inspects `manifest.json` and verifies that all three shard files exist on disk before reassembly. If any shard is missing, the server aborts the process and raises a `StorageIntegrityError`, returning `HTTP 500` without attempting to decrypt partial bytes.

---

### Q16. Can an original file be reconstructed with only two shards?
**Answer:** **No.** In TriVault's basic sharding architecture, every byte of the ciphertext is partitioned across the three shards. Because sequential chunking is used rather than redundancy schemes, all three shards ($S_1 + S_2 + S_3$) are strictly required to reassemble the complete ciphertext.

---

### Q17. Does TriVault provide fault tolerance or distributed high availability?
**Answer:** **No**, and we explicitly state this limitation in our documentation. TriVault demonstrates encryption and sharding, but basic sharding does not provide fault tolerance or replication. If one shard is lost, the file cannot be reconstructed.

---

### Q18. What happens if the master encryption key (`FERNET_ENCRYPTION_KEY`) is lost?
**Answer:** If the encryption key is lost, all previously uploaded files become mathematically unrecoverable. Symmetric encryption relies entirely on the possession of the key; without it, Fernet ciphertext cannot be decrypted.

---

### Q19. How does TriVault prevent directory traversal attacks?
**Answer:**
1. Storage directories are named using randomly generated UUIDs (`file_<uuid>`), not user-supplied filenames.
2. When resolving file paths, `FileService` uses `Path.resolve()` and explicitly validates `resolved_path.relative_to(storage_root)`. Any path containing `..`, slashes, or null bytes is rejected before any filesystem call is made.

---

### Q20. How does the download workflow prevent HTTP header injection?
**Answer:** Malicious filenames containing newlines (`\r\n`) can inject arbitrary HTTP headers. TriVault sanitizes filenames on upload and encodes the `Content-Disposition` header using RFC 5987 / RFC 6266 format:
`Content-Disposition: attachment; filename="safe.ext"; filename*=UTF-8''safe.ext`

---

### Q21. What happens if an upload fails midway?
**Answer:** TriVault implements atomic cleanup. If Fernet encryption fails, if shard writing fails, or if the database commit fails, an exception handler immediately deletes the newly created storage folder (`shutil.rmtree`) and rolls back the database transaction. No orphan shards or dangling database records remain.

---

### Q22. How does TriVault detect if a shard has been tampered with?
**Answer:** TriVault employs two layers of tamper detection:
1. **Manifest SHA-256 Checksum:** `manifest.json` stores the SHA-256 hash of each shard. On retrieval, TriVault re-computes the hash of each shard and halts if there is any mismatch.
2. **Fernet HMAC Tag:** Even if the manifest were somehow bypassed, Fernet's 32-byte HMAC-SHA256 signature will fail verification during decryption, raising `InvalidToken`.

---

### Q23. Why did you choose React with Vite and Tailwind CSS for the frontend?
**Answer:**
- **Vite** replaces legacy bundlers like Webpack/CRA, providing instantaneous Hot Module Replacement (HMR) and optimized ES-module builds.
- **React + TypeScript** provides component modularity and compile-time type safety.
- **Tailwind CSS** enables rapid, cohesive UI development using utility classes that implement our dark cybersecurity theme without CSS bloat.

---

### Q24. What are the key limitations of this project?
**Answer:**
1. Shards are stored on the same local filesystem rather than geographically distributed cloud nodes.
2. There is no redundancy (losing one shard loses the file).
3. The server uses a single static encryption key rather than per-user envelope encryption.
4. Files are processed in memory, which enforces an upload size ceiling of 25MB.

---

### Q25. How would you scale TriVault in a future version?
**Answer:**
1. **Redundancy & Secret Sharing:** Implement Shamir's Secret Sharing (k-of-n threshold scheme) or Reed-Solomon erasure coding so a file can be recovered even if one shard is lost.
2. **Distributed Storage:** Distribute the three shards across separate physical cloud object stores (e.g., AWS S3, Google Cloud Storage, Cloudflare R2).
3. **Envelope Encryption:** Generate a unique Data Encryption Key (DEK) per file, encrypted with a Master Key (KEK) using a hardware security module (KMS).
4. **Streaming Encryption:** Use chunked streaming encryption to process multi-gigabyte files without holding the entire payload in RAM.

---

### Q26. Why does logging out on the client not invalidate the JWT on the server?
**Answer:** JWTs are stateless. Once signed, a token remains cryptographically valid until its expiration timestamp (`exp`). Clearing the token from client-side `localStorage` prevents the browser from sending it, but it does not invalidate the token on the server. True server-side revocation would require a token revocation blocklist in Redis or short-lived tokens with rotating refresh tokens.

---

### Q27. How does TriVault handle empty files (0 bytes)?
**Answer:** When a 0-byte file is uploaded:
1. Fernet encrypts `b""` into a valid ~100-byte Fernet token containing an IV, timestamp, PKCS7 padding, and HMAC.
2. The sharding module divides this token into three non-empty shards.
3. Upon download, Fernet strips the padding and returns `b""`.
TriVault has automated unit tests explicitly verifying this behavior.

---

### Q28. What command would you run to prove to an examiner that all tests pass?
**Answer:** In PowerShell, run:
```powershell
pytest backend/tests -v
```
This runs 41 automated tests in ~9 seconds, covering security algorithms, authentication flows, cross-user isolation, and error conditions. To demonstrate a real file lifecycle against SQLite and physical disk, run:
```powershell
python backend/verify_e2e.py
```
