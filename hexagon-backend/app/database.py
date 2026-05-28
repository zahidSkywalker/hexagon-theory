"""Motor (async MongoDB) client singleton and helpers."""

from __future__ import annotations

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    """Return the global Motor client, creating it on first call."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    """Return the application database."""
    return get_client()[settings.db_name]


async def close_client() -> None:
    """Close the Motor client connection (call on shutdown)."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


async def ping_db() -> bool:
    """Verify that MongoDB is reachable by running a ping command."""
    try:
        db = get_database()
        await db.command("ping")
        return True
    except Exception:
        return False
