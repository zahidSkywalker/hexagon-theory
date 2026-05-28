"""HexaGon Theory — FastAPI application entry point.

Creates the app, registers routers, sets up CORS / rate-limiting, and
creates MongoDB indexes on startup via the lifespan context-manager.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.database import close_client, get_database, ping_db


# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


# ---------------------------------------------------------------------------
# Lifespan — index creation, upload directory, ping check
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create upload dir, ensure indexes, verify connection."""
    # Ensure upload directory exists
    upload_dir = settings.upload_dir
    os.makedirs(upload_dir, exist_ok=True)

    db = get_database()

    # --- Users collection indexes ---
    await db.users.create_index("email", unique=True, name="idx_users_email")
    await db.users.create_index("username", unique=True, name="idx_users_username")
    await db.users.create_index("role", name="idx_users_role")

    # --- Ideas collection indexes ---
    await db.ideas.create_index("slug", unique=True, name="idx_ideas_slug")
    await db.ideas.create_index("category", name="idx_ideas_category")
    await db.ideas.create_index("status", name="idx_ideas_status")
    await db.ideas.create_index("user_id", name="idx_ideas_user_id")
    await db.ideas.create_index("created_at", name="idx_ideas_created_at")

    # --- Votes collection indexes ---
    await db.votes.create_index(
        [("user_id", 1), ("idea_id", 1)],
        unique=True,
        name="idx_votes_user_idea_unique",
    )
    await db.votes.create_index("user_id", name="idx_votes_user_id")
    await db.votes.create_index("idea_id", name="idx_votes_idea_id")

    # --- Comments collection indexes ---
    await db.comments.create_index("idea_id", name="idx_comments_idea_id")
    await db.comments.create_index("user_id", name="idx_comments_user_id")
    await db.comments.create_index("parent_id", name="idx_comments_parent_id")

    # --- Institutional interests collection indexes ---
    await db.institutional_interests.create_index(
        [("institution_id", 1), ("idea_id", 1)],
        unique=True,
        name="idx_institutional_inst_idea_unique",
    )
    await db.institutional_interests.create_index("institution_id", name="idx_institutional_inst_id")
    await db.institutional_interests.create_index("idea_id", name="idx_institutional_idea_id")

    # Verify connectivity
    await ping_db()

    yield

    # Shutdown
    await close_client()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="HexaGon Theory API",
    description="Crowdsourced intelligence platform backend — migrated to MongoDB.",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global exception handlers for ObjectId / validation errors
# ---------------------------------------------------------------------------
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )


# ---------------------------------------------------------------------------
# System endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["System"])
async def api_info():
    """Return basic API metadata."""
    return {
        "name": "HexaGon Theory API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Verify application and database health."""
    db_ok = await ping_db()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
from app.routers import auth, users, ideas, votes, comments, institutions  # noqa: E402

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(ideas.router, prefix="/api/ideas", tags=["Ideas"])
app.include_router(votes.router, prefix="/api/ideas/{idea_id}/votes", tags=["Votes"])
app.include_router(comments.router, prefix="/api/ideas/{idea_id}/comments", tags=["Comments"])
app.include_router(institutions.router, prefix="/api/institutional", tags=["Institutional"])
