"""Ideas router — CRUD, search, file uploads, version history."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status

from app.database import get_database
from app.dependencies import get_current_user
from app.schemas.idea import (
    IdeaAuthorResponse,
    IdeaCreateRequest,
    IdeaDetailResponse,
    IdeaListResponse,
    IdeaResponse,
    IdeaUpdateRequest,
    IdeaVersionResponse,
    FileInfoResponse,
    VersionEntryResponse,
)
from app.services.file_service import delete_file, save_upload_file
from app.utils.slugify import generate_unique_slug

router = APIRouter()

# Valid categories and statuses
VALID_CATEGORIES = {
    "Infrastructure", "Health", "Education", "Tech",
    "Economy", "Social", "Environment",
}
VALID_STATUSES = {"draft", "published", "archived", "reviewing"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _get_idea_by_slug(db, slug: str) -> Optional[Dict]:
    """Fetch a single idea by slug, or ``None``."""
    return await db.ideas.find_one({"slug": slug})


async def _enrich_idea_with_author(db, idea: Dict) -> Dict:
    """Add an ``author`` key with the user's public info."""
    author_doc = await db.users.find_one(
        {"_id": idea["user_id"]},
        {"username": 1, "full_name": 1, "avatar_url": 1},
    )
    if author_doc:
        idea["author"] = IdeaAuthorResponse(
            id=str(author_doc["_id"]),
            username=author_doc["username"],
            full_name=author_doc.get("full_name"),
            avatar_url=author_doc.get("avatar_url"),
        ).model_dump()
    else:
        idea["author"] = None
    return idea


def _idea_to_response(idea: Dict) -> IdeaResponse:
    """Convert a MongoDB idea document to an ``IdeaResponse``."""
    files = [
        FileInfoResponse(
            file_name=f["file_name"],
            file_type=f["file_type"],
            file_path=f["file_path"],
            file_size=f["file_size"],
            uploaded_at=f["uploaded_at"].isoformat() if isinstance(f["uploaded_at"], datetime) else str(f["uploaded_at"]),
        ).model_dump()
        for f in idea.get("files", [])
    ]
    return IdeaResponse(
        id=str(idea["_id"]),
        user_id=str(idea["user_id"]),
        author=idea.get("author"),
        title=idea["title"],
        slug=idea["slug"],
        problem_statement=idea["problem_statement"],
        description=idea["description"],
        category=idea.get("category", "Tech"),
        target_region=idea.get("target_region"),
        target_community=idea.get("target_community"),
        expected_impact=idea.get("expected_impact"),
        cost_benefit_summary=idea.get("cost_benefit_summary"),
        status=idea.get("status", "draft"),
        video_url=idea.get("video_url"),
        version=idea.get("version", 1),
        view_count=idea.get("view_count", 0),
        files=files,
        created_at=idea["created_at"].isoformat() if isinstance(idea["created_at"], datetime) else str(idea["created_at"]),
        updated_at=idea["updated_at"].isoformat() if isinstance(idea["updated_at"], datetime) else str(idea["updated_at"]),
        published_at=idea["published_at"].isoformat() if idea.get("published_at") and isinstance(idea["published_at"], datetime) else None,
    )


def _idea_to_detail_response(idea: Dict) -> IdeaDetailResponse:
    """Convert a MongoDB idea document to an ``IdeaDetailResponse`` (with versions)."""
    base = _idea_to_response(idea)
    versions = [
        VersionEntryResponse(
            version=v["version"],
            title=v["title"],
            description=v["description"],
            problem_statement=v["problem_statement"],
            changed_by=v["changed_by"],
            change_summary=v["change_summary"],
            created_at=v["created_at"].isoformat() if isinstance(v["created_at"], datetime) else str(v["created_at"]),
        ).model_dump()
        for v in idea.get("versions", [])
    ]
    return IdeaDetailResponse(
        **base.model_dump(),
        versions=versions,
    )


# ---------------------------------------------------------------------------
# List ideas (with filter, sort, pagination)
# ---------------------------------------------------------------------------
@router.get("/", response_model=IdeaListResponse)
async def list_ideas(
    category: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    author: Optional[str] = Query(default=None),
    sort: str = Query(default="recent"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[Dict] = Depends(get_current_user),
):
    """List published ideas with optional filtering, sorting, and pagination."""
    db = get_database()

    # Build filter
    query: Dict = {"status": {"$ne": "draft"}}
    if category and category in VALID_CATEGORIES:
        query["category"] = category
    if status_filter and status_filter in VALID_STATUSES:
        query["status"] = status_filter
    if author:
        author_doc = await db.users.find_one({"username": author}, {"_id": 1})
        if author_doc:
            query["user_id"] = author_doc["_id"]

    # Build sort
    sort_key, sort_dir = ("created_at", -1)  # recent
    if sort == "trending":
        sort_key, sort_dir = ("view_count", -1)
    elif sort == "popular":
        # Use an aggregation pipeline for vote-score-based sorting
        pipeline = [
            {"$match": query},
            {"$lookup": {
                "from": "votes",
                "localField": "_id",
                "foreignField": "idea_id",
                "as": "votes",
            }},
            {"$addFields": {
                "vote_score": {
                    "$sum": {
                        "$map": {
                            "input": "$votes",
                            "as": "v",
                            "in": {"$cond": [{"$eq": ["$$v.vote_type", "upvote"]}, 1, -1]},
                        }
                    }
                }
            }},
            {"$sort": {"vote_score": -1}},
            {"$skip": offset},
            {"$limit": limit},
        ]
        count_result = await db.ideas.count_documents(query)
        raw_ideas = await db.ideas.aggregate(pipeline).to_list(length=limit)
        items = []
        for idea in raw_ideas:
            idea = await _enrich_idea_with_author(db, idea)
            items.append(_idea_to_response(idea))
        return IdeaListResponse(items=items, total=count_result, limit=limit, offset=offset)

    cursor = db.ideas.find(query).sort(sort_key, sort_dir).skip(offset).limit(limit)
    raw_ideas = await cursor.to_list(length=limit)
    total = await db.ideas.count_documents(query)

    items = []
    for idea in raw_ideas:
        idea = await _enrich_idea_with_author(db, idea)
        items.append(_idea_to_response(idea))

    return IdeaListResponse(items=items, total=total, limit=limit, offset=offset)


# ---------------------------------------------------------------------------
# Search ideas
# ---------------------------------------------------------------------------
@router.get("/search", response_model=IdeaListResponse)
async def search_ideas(
    q: str = Query(min_length=3, description="Search query (minimum 3 characters)"),
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[Dict] = Depends(get_current_user),
):
    """Full-text search across idea titles and problem statements."""
    db = get_database()

    # Build regex query for case-insensitive search
    regex = re.escape(q)
    query: Dict = {
        "status": {"$ne": "draft"},
        "$or": [
            {"title": {"$regex": regex, "$options": "i"}},
            {"problem_statement": {"$regex": regex, "$options": "i"}},
            {"description": {"$regex": regex, "$options": "i"}},
        ],
    }
    if category and category in VALID_CATEGORIES:
        query["category"] = category

    cursor = db.ideas.find(query).sort("created_at", -1).skip(offset).limit(limit)
    raw_ideas = await cursor.to_list(length=limit)
    total = await db.ideas.count_documents(query)

    items = []
    for idea in raw_ideas:
        idea = await _enrich_idea_with_author(db, idea)
        items.append(_idea_to_response(idea))

    return IdeaListResponse(items=items, total=total, limit=limit, offset=offset)


# ---------------------------------------------------------------------------
# Get single idea by slug
# ---------------------------------------------------------------------------
@router.get("/{slug}", response_model=IdeaDetailResponse)
async def get_idea(slug: str):
    """Fetch a single idea by its slug. Increments ``view_count``."""
    db = get_database()
    idea = await _get_idea_by_slug(db, slug)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found.")

    # Increment view count
    await db.ideas.update_one({"_id": idea["_id"]}, {"$inc": {"view_count": 1}})
    idea["view_count"] = idea.get("view_count", 0) + 1

    idea = await _enrich_idea_with_author(db, idea)
    return _idea_to_detail_response(idea)


# ---------------------------------------------------------------------------
# Create idea
# ---------------------------------------------------------------------------
@router.post("/", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    payload: IdeaCreateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Create a new idea (defaults to draft status)."""
    db = get_database()

    if payload.category and payload.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
        )
    if payload.status and payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    # Generate a unique slug
    existing_slugs = {
        doc["slug"]
        async for doc in db.ideas.find({}, {"slug": 1})
    }
    slug = generate_unique_slug(payload.title, existing_slugs)

    now = datetime.now(timezone.utc)
    idea_doc = {
        "user_id": current_user["_id"],
        "title": payload.title,
        "slug": slug,
        "problem_statement": payload.problem_statement,
        "description": payload.description,
        "category": payload.category,
        "target_region": payload.target_region,
        "target_community": payload.target_community,
        "expected_impact": payload.expected_impact,
        "cost_benefit_summary": payload.cost_benefit_summary,
        "status": payload.status,
        "video_url": payload.video_url,
        "version": 1,
        "view_count": 0,
        "files": [],
        "versions": [],
        "created_at": now,
        "updated_at": now,
        "published_at": now if payload.status == "published" else None,
    }

    result = await db.ideas.insert_one(idea_doc)
    idea_doc["_id"] = result.inserted_id

    idea_doc = await _enrich_idea_with_author(db, idea_doc)
    return _idea_to_response(idea_doc)


# ---------------------------------------------------------------------------
# Update idea
# ---------------------------------------------------------------------------
@router.put("/{slug}", response_model=IdeaDetailResponse)
async def update_idea(
    slug: str,
    payload: IdeaUpdateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Update an existing idea and record a version entry."""
    db = get_database()
    idea = await _get_idea_by_slug(db, slug)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found.")

    # Ownership check
    if str(idea["user_id"]) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own ideas.",
        )

    # Validate category
    if payload.category and payload.category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid category. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
        )

    # Record version before updating
    version_entry = {
        "version": idea.get("version", 1),
        "title": idea["title"],
        "description": idea["description"],
        "problem_statement": idea["problem_statement"],
        "changed_by": str(current_user["_id"]),
        "change_summary": payload.change_summary or "Updated idea",
        "created_at": datetime.now(timezone.utc),
    }

    # Build update
    update_fields: Dict = {"updated_at": datetime.now(timezone.utc)}
    new_version = idea.get("version", 1) + 1
    update_fields["version"] = new_version

    if payload.title is not None:
        update_fields["title"] = payload.title
    if payload.problem_statement is not None:
        update_fields["problem_statement"] = payload.problem_statement
    if payload.description is not None:
        update_fields["description"] = payload.description
    if payload.category is not None:
        update_fields["category"] = payload.category
    if payload.target_region is not None:
        update_fields["target_region"] = payload.target_region
    if payload.target_community is not None:
        update_fields["target_community"] = payload.target_community
    if payload.expected_impact is not None:
        update_fields["expected_impact"] = payload.expected_impact
    if payload.cost_benefit_summary is not None:
        update_fields["cost_benefit_summary"] = payload.cost_benefit_summary
    if payload.video_url is not None:
        update_fields["video_url"] = payload.video_url
    if payload.status is not None:
        if payload.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
            )
        update_fields["status"] = payload.status
        # Set published_at if transitioning to published for the first time
        if payload.status == "published" and not idea.get("published_at"):
            update_fields["published_at"] = datetime.now(timezone.utc)

    # Update slug if title changed
    if payload.title is not None and payload.title != idea["title"]:
        existing_slugs = {
            doc["slug"]
            async for doc in db.ideas.find({"_id": {"$ne": idea["_id"]}}, {"slug": 1})
        }
        update_fields["slug"] = generate_unique_slug(payload.title, existing_slugs)

    await db.ideas.update_one(
        {"_id": idea["_id"]},
        {"$set": update_fields, "$push": {"versions": version_entry}},
    )

    updated = await db.ideas.find_one({"_id": idea["_id"]})
    updated = await _enrich_idea_with_author(db, updated)
    return _idea_to_detail_response(updated)


# ---------------------------------------------------------------------------
# Delete idea
# ---------------------------------------------------------------------------
@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    slug: str,
    current_user: Dict = Depends(get_current_user),
):
    """Delete an idea and its associated data (votes, comments, files)."""
    db = get_database()
    idea = await _get_idea_by_slug(db, slug)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found.")

    # Ownership check (or admin)
    if str(idea["user_id"]) != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own ideas.",
        )

    idea_id = idea["_id"]

    # Delete associated files from disk
    for f in idea.get("files", []):
        await delete_file(f["file_path"])

    # Delete associated votes, comments, institutional interests
    await db.votes.delete_many({"idea_id": idea_id})
    await db.comments.delete_many({"idea_id": idea_id})
    await db.institutional_interests.delete_many({"idea_id": idea_id})

    # Delete the idea itself
    await db.ideas.delete_one({"_id": idea_id})


# ---------------------------------------------------------------------------
# File upload
# ---------------------------------------------------------------------------
@router.post("/{slug}/files", response_model=IdeaResponse)
async def upload_file(
    slug: str,
    file: UploadFile = File(...),
    current_user: Dict = Depends(get_current_user),
):
    """Upload a file attachment to an idea."""
    db = get_database()
    idea = await _get_idea_by_slug(db, slug)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found.")

    if str(idea["user_id"]) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload files to your own ideas.",
        )

    # Save the file
    file_path, file_type, file_size = await save_upload_file(file, subdirectory=f"ideas/{str(idea['_id'])}")

    file_entry = {
        "file_name": file.filename or "unnamed",
        "file_type": file_type,
        "file_path": file_path,
        "file_size": file_size,
        "uploaded_at": datetime.now(timezone.utc),
    }

    await db.ideas.update_one(
        {"_id": idea["_id"]},
        {"$push": {"files": file_entry}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )

    updated = await db.ideas.find_one({"_id": idea["_id"]})
    updated = await _enrich_idea_with_author(db, updated)
    return _idea_to_response(updated)


# ---------------------------------------------------------------------------
# Version history
# ---------------------------------------------------------------------------
@router.get("/{slug}/versions", response_model=IdeaVersionResponse)
async def get_idea_versions(slug: str):
    """Return the version history for an idea."""
    db = get_database()
    idea = await _get_idea_by_slug(db, slug)
    if not idea:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Idea not found.")

    versions = [
        VersionEntryResponse(
            version=v["version"],
            title=v["title"],
            description=v["description"],
            problem_statement=v["problem_statement"],
            changed_by=v["changed_by"],
            change_summary=v["change_summary"],
            created_at=v["created_at"].isoformat() if isinstance(v["created_at"], datetime) else str(v["created_at"]),
        ).model_dump()
        for v in idea.get("versions", [])
    ]

    return IdeaVersionResponse(
        idea_id=str(idea["_id"]),
        slug=idea["slug"],
        versions=versions,
    )
