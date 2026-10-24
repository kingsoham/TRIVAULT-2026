# TriVault — notes for agents working in this repo

TriVault is a two-process app: FastAPI backend (`backend/`) + Vite/React SPA (`frontend/`).
It uses SQLite and local disk shards only — **there are no external services and no
third-party credentials to provide**.

## Running it (Base44 sandbox)

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

* `web` — host port **3000** → Vite dev server on 5173 (the preview entry point).
* `api` — host port **8000** → uvicorn `--reload`, Swagger at `/docs`, health at `/health`.
* `dbviewer` — host port **8010** → `sqlite-web` in read-only mode against the live `/data/app.db`
  (lets you browse usernames/emails/metadata in the browser; password hashes are visible but unreadable).

Both services bind-mount the repo (`/app`) and run dev servers, so edits apply without
rebuilding images. Only `backend/requirements.txt` changes need a rebuild (baked into
`.base44/Dockerfile.api`); `frontend` dependencies are installed from the mounted
`package-lock.json` on every container start.

## Non-obvious setup facts

* **Two boot-required keys.** `app/config.py` (pydantic-settings) refuses to start unless
  `JWT_SECRET_KEY` is ≥32 chars and `FERNET_ENCRYPTION_KEY` is a valid Fernet key
  (32 url-safe base64 bytes). Committed **development placeholders** live in
  `.env.base44-defaults`; the platform secret file `/run/base44/app.env` is listed after it in
  `env_file:`, so a value set on the Secrets page always wins.
  Do **not** move these keys into compose `environment:` — that would permanently outrank the
  dashboard. Changing `FERNET_ENCRYPTION_KEY` makes already-stored shards undecryptable.
* **Data lives in the `trivault_data` volume** (`/data/app.db`, `/data/storage`), not in the repo,
  so uploads and the SQLite DB survive restarts and never get committed.
* **Two origins.** The SPA stores its JWT in `localStorage` and sends `Authorization: Bearer`,
  so the API is exposed separately on port 8000 and CORS is opened for the SPA origin via
  `ALLOWED_ORIGINS` (built from `$BASE44_PUBLIC_HOST_SUFFIX`, never hardcoded).
* **Vite host allowlist.** Vite 5.4.21 rejects unknown `Host` headers, and the preview proxy
  reaches the dev server as `<port>-<sandbox id>.$BASE44_SANDBOX_HOST_DOMAIN`. `frontend/vite.config.ts`
  appends `.${BASE44_SANDBOX_HOST_DOMAIN}` and `.${BASE44_PUBLIC_HOST_SUFFIX}` to `server.allowedHosts`
  **only** when `BASE44_PREVIEW_MODE === "1"`; with the flag unset the config is unchanged.
* **Repo-root `storage/`** holds leftover demo shards with no matching database row; the running
  app uses the volume path above and never writes there.

## Verifying changes

```bash
# API smoke test
curl -s localhost:8000/health

# Backend test suite (41 tests, isolated in-memory DB + temp storage)
docker compose -f docker-compose.base44.yml exec api python -m pytest backend/tests -q

# Frontend type-check + production build
docker compose -f docker-compose.base44.yml exec web npm run build
```

End-to-end in the UI: register a user on the login page, upload a file from the vault, open the
shard inspector, then download/rename/delete it.

## Conventions

* No commit-message or PR-title convention is configured in the repo; use Conventional Commits.
