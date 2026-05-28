"""Application configuration loaded from environment variables via Pydantic Settings."""

from __future__ import annotations

from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the HexaGon Theory backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # MongoDB
    mongodb_uri: str = (
        "mongodb+srv://ionzahid0987_db_user:3by3swGWwD8b8kBS"
        "@diana0.z0qqua8.mongodb.net/?appName=Diana0"
    )
    db_name: str = "hexagon_db"

    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    # CORS
    cors_origins: str = "https://hexagon-theory.vercel.app,http://localhost:3000"

    # Uploads
    max_upload_size_mb: int = 50
    upload_dir: str = "./uploads"

    # Rate limiting
    rate_limit_per_minute: int = 60

    # ---------- helpers ----------
    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
