"""File upload service — validates, saves, and cleans up uploaded files."""

from __future__ import annotations

import os
import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile, status

from app.config import settings

# Allowed MIME type groups
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALL_ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_VIDEO_TYPES


async def save_upload_file(
    file: UploadFile,
    subdirectory: str = "ideas",
) -> Tuple[str, str, int]:
    """Save an uploaded file to the upload directory.

    Returns a tuple of ``(file_path, file_type, file_size)``.

    Parameters
    ----------
    file:
        The ``UploadFile`` from FastAPI.
    subdirectory:
        Sub-folder inside the upload directory (e.g. ``"ideas"``).

    Raises
    ------
    HTTPException 413 if the file exceeds the configured size limit.
    HTTPException 415 if the file type is not allowed.
    """
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALL_ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File type '{content_type}' is not allowed.",
        )

    # Read content and check size
    content = await file.read()
    file_size = len(content)
    max_bytes = settings.max_upload_size_bytes

    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size} bytes) exceeds the maximum allowed ({max_bytes} bytes).",
        )

    # Generate unique filename
    ext = os.path.splitext(file.filename or "file")[1] or ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dir_path = os.path.join(settings.upload_dir, subdirectory)
    os.makedirs(dir_path, exist_ok=True)
    full_path = os.path.join(dir_path, unique_name)

    # Write file
    with open(full_path, "wb") as f:
        f.write(content)

    relative_path = f"{subdirectory}/{unique_name}"
    return relative_path, content_type, file_size


async def delete_file(file_path: str) -> bool:
    """Delete a file from the upload directory. Returns ``True`` on success."""
    full_path = os.path.join(settings.upload_dir, file_path)
    try:
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
    except OSError:
        pass
    return False
