import os
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    """
    Application Settings for TriVault.
    Validates all environment variables on startup.
    Never exposes secrets in logs or responses.
    """
    APP_ENV: str = Field(default="development", description="Application environment: development, testing, production")
    APP_HOST: str = Field(default="127.0.0.1", description="FastAPI host binding")
    APP_PORT: int = Field(default=8000, description="FastAPI port binding")
    DATABASE_URL: str = Field(default="sqlite:///./app.db", description="Database connection URL")

    # Security Keys
    JWT_SECRET_KEY: str = Field(
        ...,
        description="Cryptographic secret key for signing JWT tokens (min 32 chars)"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=1440,
        description="JWT expiration time in minutes (default: 24 hours)"
    )

    FERNET_ENCRYPTION_KEY: str = Field(
        ...,
        description="Fernet 32-byte url-safe base64-encoded encryption key"
    )

    # Storage Settings
    STORAGE_ROOT: str = Field(
        default="./storage",
        description="Path to local filesystem storage root directory"
    )
    MAX_UPLOAD_SIZE_BYTES: int = Field(
        default=26214400, # 25 MB
        description="Maximum allowed upload file size in bytes"
    )

    # CORS Configuration
    ALLOWED_ORIGINS: Union[str, List[str]] = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        description="Comma-separated or list of allowed CORS origins"
    )

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", "../backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or len(v.strip()) < 32:
            raise ValueError("JWT_SECRET_KEY must be a strong secret of at least 32 characters.")
        return v.strip()

    @field_validator("FERNET_ENCRYPTION_KEY")
    @classmethod
    def validate_fernet_key(cls, v: str) -> str:
        if not v:
            raise ValueError("FERNET_ENCRYPTION_KEY is required.")
        v_clean = v.strip()
        try:
            # Validate Fernet key format: 32 urlsafe base64 bytes
            Fernet(v_clean.encode())
        except Exception as e:
            raise ValueError(f"FERNET_ENCRYPTION_KEY is invalid for cryptography Fernet: {e}")
        return v_clean

    @property
    def cors_origins(self) -> List[str]:
        if isinstance(self.ALLOWED_ORIGINS, list):
            return self.ALLOWED_ORIGINS
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def storage_path(self) -> Path:
        resolved = Path(self.STORAGE_ROOT).resolve()
        resolved.mkdir(parents=True, exist_ok=True)
        return resolved


# Global settings instance created via lazy getter or singleton
_settings: Settings | None = None


def get_settings() -> Settings:
    """Return cached settings instance or load from environment."""
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
