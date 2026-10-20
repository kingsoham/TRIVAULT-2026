# API Guide & Endpoint Reference — TriVault

**Base URL:** `http://127.0.0.1:8000`  
**Interactive Swagger UI:** `http://127.0.0.1:8000/docs`  
**ReDoc Documentation:** `http://127.0.0.1:8000/redoc`  

---

## 1. General & Health Endpoints

### 1.1 Root Service Information
- **Route:** `GET /`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "name": "TriVault API",
  "tagline": "Split into Three. Secured as One.",
  "status": "online",
  "version": "1.0.0",
  "docs_url": "/docs"
}
```

### 1.2 Health Check
- **Route:** `GET /health`
- **Auth Required:** No
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "database": "connected",
  "storage": "accessible"
}
```

---

## 2. Authentication Endpoints

### 2.1 Register New Account
- **Route:** `POST /auth/register`
- **Auth Required:** No
- **Request Body (JSON):**
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "StrongPassword123!"
}
```
- **Response (201 Created):**
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2026-10-20T10:00:00Z"
}
```
- **Error Responses:**
  - `409 Conflict`: `{"detail": "A user with this username already exists."}`
  - `422 Unprocessable Entity`: Validation failure (e.g. short password or invalid email format).

### 2.2 User Login
- **Route:** `POST /auth/login`
- **Auth Required:** No
- **Request Body (JSON):**
```json
{
  "username": "alice",
  "password": "StrongPassword123!"
}
```
*(Accepts either username or registered email).*
- **Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2026-10-20T10:00:00Z"
  }
}
```
- **Error Response:**
  - `401 Unauthorized`: `{"detail": "Invalid username or password."}`

### 2.3 Get Current User Profile
- **Route:** `GET /auth/me`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response (200 OK):**
```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2026-10-20T10:00:00Z"
}
```

---

## 3. File Management Endpoints

### 3.1 Upload File
- **Route:** `POST /files/upload`
- **Auth Required:** Yes (`Bearer <token>`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `file` (Binary file, max 25 MB)
- **Response (201 Created):**
```json
{
  "id": 1,
  "filename": "confidential_research.pdf",
  "size": 1048576,
  "created_at": "2026-10-20T10:05:00Z",
  "shard_count": 3,
  "content_type": "application/pdf",
  "user_id": 1
}
```

### 3.2 List Owned Files
- **Route:** `GET /files`
- **Auth Required:** Yes (`Bearer <token>`)
- **Query Parameters (Optional):**
  - `search` (string): Filename substring filter.
- **Response (200 OK):**
```json
{
  "files": [
    {
      "id": 1,
      "filename": "confidential_research.pdf",
      "size": 1048576,
      "created_at": "2026-10-20T10:05:00Z",
      "shard_count": 3,
      "content_type": "application/pdf",
      "user_id": 1
    }
  ],
  "total_count": 1,
  "total_size_bytes": 1048576
}
```

### 3.3 Get File Details & Shard Manifest
- **Route:** `GET /files/{file_id}`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response (200 OK):**
```json
{
  "id": 1,
  "filename": "confidential_research.pdf",
  "size": 1048576,
  "created_at": "2026-10-20T10:05:00Z",
  "shard_count": 3,
  "content_type": "application/pdf",
  "user_id": 1,
  "shards": [
    {
      "shard_index": 1,
      "size_bytes": 350000,
      "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    },
    {
      "shard_index": 2,
      "size_bytes": 350000,
      "sha256_hash": "a1b2c3d4..."
    },
    {
      "shard_index": 3,
      "size_bytes": 348576,
      "sha256_hash": "f5e6d7c8..."
    }
  ]
}
```

### 3.4 Download & Decrypt File
- **Route:** `GET /files/{file_id}/download`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response (200 OK):** Binary file stream with headers:
  - `Content-Disposition: attachment; filename="name.ext"; filename*=UTF-8''name.ext`
  - `Content-Length: <original_size>`

### 3.5 Rename File
- **Route:** `PATCH /files/{file_id}/rename`
- **Auth Required:** Yes (`Bearer <token>`)
- **Request Body (JSON):**
```json
{
  "new_filename": "updated_research_2026.pdf"
}
```
- **Response (200 OK):** Updated `FileResponse` object.

### 3.6 Delete File & Erase Shards
- **Route:** `DELETE /files/{file_id}`
- **Auth Required:** Yes (`Bearer <token>`)
- **Response (204 No Content):** Empty body. All 3 shards and database records are removed.
