from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db, get_engine
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that validates settings and initializes
    the SQLite database tables on startup, then seeds demo data in
    development mode if the database is empty.
    """
    settings = get_settings()
    # Ensure storage root exists
    _ = settings.storage_path
    # Initialize SQLite tables
    init_db()
    # Auto-seed demo users and files in development (idempotent)
    seed_demo_data()
    yield


settings = get_settings()

app = FastAPI(
    title="TriVault API",
    description="Secure File Storage Using Encryption and Three-Shard Storage. Tagline: Split into Three. Secured as One.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(auth_router)
app.include_router(files_router)


@app.get("/", tags=["General"])
def root():
    """Application root providing service info and documentation links."""
    return {
        "name": "TriVault API",
        "tagline": "Split into Three. Secured as One.",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/health", tags=["General"])
def health_check():
    """Health check endpoint verifying application, database, and storage availability."""
    settings = get_settings()
    storage_accessible = settings.storage_path.exists() and settings.storage_path.is_dir()
    db_accessible = True
    try:
        from sqlmodel import text
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_accessible = False

    overall_status = "healthy" if (storage_accessible and db_accessible) else "degraded"
    return {
        "status": overall_status,
        "database": "connected" if db_accessible else "disconnected",
        "storage": "accessible" if storage_accessible else "unavailable",
    }
