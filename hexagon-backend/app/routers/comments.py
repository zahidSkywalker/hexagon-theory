"""Comments router — threaded comment tree CRUD for ideas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_database
from app.dependencies import get_current_user
from app.schemas.comment import (
    CommentAuthorResponse,
    CommentCreateRequest,
    CommentListResponse,
    CommentResponse,
    CommentUpdateRequest,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _comment_to_response(comment: Dict) -> CommentResponse:
    """Convert a raw MongoDB comment document to a ``CommentResponse``."""
    return CommentResponse(
        id=str(comment["_id"]),
        user_id=str(comment["user_id"]),
        idea_id=str(comment["idea_id"]),
        parent_id=str(comment["parent_id"]) if comment.get("parent_id") else None,
        content=comment["content"],
        is_suggestion=comment.get("is_suggestion", False),
        is_edited=comment.get("is_edited", False),
        created_at=comment["created_at"].isoformat() if isinstance(comment["created_at"], datetime) else str(comment["created_at"]),
        updated_at=comment["updated_at"].isoformat() if isinstance(comment["updated_at"], datetime) else str(comment["updated_at"]),
        author=comment.get("author"),
        replies=[],
    )


async def _enrich_comment_with_author(db, comment: Dict) -> Dict:
    """Attach author info to a comment document."""
    author_doc = await db.users.find_one(
        {"_id": comment["user_id"]},
        {"username": 1, "full_name": 1, "avatar_url": 1},
    )
    if author_doc:
        comment["author"] = CommentAuthorResponse(
            id=str(author_doc["_id"]),
            username=author_doc["username"],
            full_name=author_doc.get("full_name"),
            avatar_url=author_doc.get("avatar_url"),
        ).model_dump()
    else:
        comment["author"] = None
    return comment


def _build_comment_tree(comments: List[Dict]) -> List[Dict]:
    """Build a nested comment tree from a flat list of comment dicts.

    Top-level comments have ``parent_id=None``; replies reference
    their parent's ``_id``.  Returns a list of ``CommentResponse``
    model_dump dicts with nested ``replies`` lists.
    """
    comment_map: Dict[str, Dict] = {}
    for c in comments:
        c_id = str(c["_id"])
        c_response = _comment_to_response(c)
        comment_map[c_id] = c_response

    roots: List[Dict] = []
    for c in comments:
        c_id = str(c["_id"])
        parent_id = str(c["parent_id"]) if c.get("parent_id") else None

        if parent_id and parent_id in comment_map:
            comment_map[parent_id]["replies"].append(comment_map[c_id])
        else:
            roots.append(comment_map[c_id])

    # Sort each level by created_at descending (newest first)
    for node in roots:
        node.replies.sort(key=lambda r: r.created_at, reverse=True)
    roots.sort(key=lambda r: r.created_at, reverse=True)

    return [r.model_dump() for r in roots]


# ---------------------------------------------------------------------------
# GET — list comment tree
# ---------------------------------------------------------------------------
@router.get("/", response_model=CommentListResponse)
async def list_comments(
    idea_id: str,
    is_suggestion: Optional[bool] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: Optional[Dict] = Depends(get_current_user),
):
    """Return the comment tree for an idea, optionally filtered by ``is_suggestion``."""
    db = get_database()

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    # Verify idea exists
    idea = await db.ideas.find_one({"_id": idea_oid})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found.",
        )

    query: Dict = {"idea_id": idea_oid}
    if is_suggestion is not None:
        query["is_suggestion"] = is_suggestion

    cursor = db.comments.find(query).sort("created_at", -1)
    raw_comments = await cursor.to_list(length=500)

    # Enrich with author info
    enriched: List[Dict] = []
    for c in raw_comments:
        c = await _enrich_comment_with_author(db, c)
        enriched.append(c)

    total = len(enriched)
    tree = _build_comment_tree(enriched)

    return CommentListResponse(items=tree, total=total)


# ---------------------------------------------------------------------------
# POST — create comment / reply
# ---------------------------------------------------------------------------
@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    idea_id: str,
    payload: CommentCreateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Create a top-level comment or a reply to an existing comment."""
    db = get_database()

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    # Verify idea exists
    idea = await db.ideas.find_one({"_id": idea_oid})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found.",
        )

    # Validate parent_id if provided
    parent_oid = None
    if payload.parent_id:
        try:
            parent_oid = ObjectId(payload.parent_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid parent comment ID format.",
            )
        parent = await db.comments.find_one({"_id": parent_oid, "idea_id": idea_oid})
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent comment not found.",
            )

    now = datetime.now(timezone.utc)
    comment_doc = {
        "user_id": current_user["_id"],
        "idea_id": idea_oid,
        "parent_id": parent_oid,
        "content": payload.content,
        "is_suggestion": payload.is_suggestion,
        "is_edited": False,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.comments.insert_one(comment_doc)
    comment_doc["_id"] = result.inserted_id
    comment_doc = await _enrich_comment_with_author(db, comment_doc)
    return _comment_to_response(comment_doc)


# ---------------------------------------------------------------------------
# PUT — edit comment
# ---------------------------------------------------------------------------
@router.put("/{comment_id}", response_model=CommentResponse)
async def edit_comment(
    idea_id: str,
    comment_id: str,
    payload: CommentUpdateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Edit an existing comment (content only)."""
    db = get_database()

    try:
        comment_oid = ObjectId(comment_id)
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid ID format.",
        )

    comment = await db.comments.find_one({"_id": comment_oid, "idea_id": idea_oid})
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        )

    # Ownership check
    if str(comment["user_id"]) != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own comments.",
        )

    await db.comments.update_one(
        {"_id": comment_oid},
        {"$set": {
            "content": payload.content,
            "is_edited": True,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    updated = await db.comments.find_one({"_id": comment_oid})
    updated = await _enrich_comment_with_author(db, updated)
    return _comment_to_response(updated)


# ---------------------------------------------------------------------------
# DELETE — delete comment
# ---------------------------------------------------------------------------
@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    idea_id: str,
    comment_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Delete a comment and all its nested replies."""
    db = get_database()

    try:
        comment_oid = ObjectId(comment_id)
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid ID format.",
        )

    comment = await db.comments.find_one({"_id": comment_oid, "idea_id": idea_oid})
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found.",
        )

    # Ownership or admin
    if str(comment["user_id"]) != str(current_user["_id"]) and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments.",
        )

    # Recursively delete all child replies
    async def _delete_tree(parent_id: ObjectId):
        children = await db.comments.find({"parent_id": parent_id}, {"_id": 1}).to_list(length=500)
        for child in children:
            await _delete_tree(child["_id"])
        await db.comments.delete_one({"_id": parent_id})

    await _delete_tree(comment_oid)
