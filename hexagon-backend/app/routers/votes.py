"""Votes router — cast, remove, and summarise votes on ideas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.database import get_database
from app.dependencies import get_current_user
from app.schemas.vote import VoteCreateRequest, VoteSummaryResponse

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def cast_vote(
    idea_id: str,
    payload: VoteCreateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Cast an upvote or downvote on an idea. Upserts if a vote already exists."""
    db = get_database()

    # Validate idea_id is a valid ObjectId
    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    # Verify the idea exists
    idea = await db.ideas.find_one({"_id": idea_oid})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found.",
        )

    now = datetime.now(timezone.utc)
    vote_doc = {
        "user_id": current_user["_id"],
        "idea_id": idea_oid,
        "vote_type": payload.vote_type,
        "created_at": now,
    }

    try:
        await db.votes.update_one(
            {"user_id": current_user["_id"], "idea_id": idea_oid},
            {"$set": {"vote_type": payload.vote_type, "created_at": now}},
            upsert=True,
        )
    except DuplicateKeyError:
        # Another request got there first — just update
        await db.votes.update_one(
            {"user_id": current_user["_id"], "idea_id": idea_oid},
            {"$set": {"vote_type": payload.vote_type}},
        )

    return {"detail": f"Vote ({payload.vote_type}) recorded."}


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def remove_vote(
    idea_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Remove the current user's vote on an idea."""
    db = get_database()

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    result = await db.votes.delete_one({
        "user_id": current_user["_id"],
        "idea_id": idea_oid,
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No vote found for this idea.",
        )


@router.get("/summary", response_model=VoteSummaryResponse)
async def vote_summary(
    idea_id: str,
    current_user: Optional[Dict] = Depends(get_current_user),
):
    """Return aggregated vote counts for an idea, plus the current user's vote if any.

    **Bug fix:** correctly checks ``current_user`` even when the user is
    authenticated — the original code used ``if False``.
    """
    db = get_database()

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    # Verify the idea exists
    idea = await db.ideas.find_one({"_id": idea_oid})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found.",
        )

    # Aggregate counts
    pipeline = [
        {"$match": {"idea_id": idea_oid}},
        {"$group": {
            "_id": "$vote_type",
            "count": {"$sum": 1},
        }},
    ]
    agg_cursor = db.votes.aggregate(pipeline)
    agg_results = await agg_cursor.to_list(length=10)

    upvotes = 0
    downvotes = 0
    for doc in agg_results:
        if doc["_id"] == "upvote":
            upvotes = doc["count"]
        elif doc["_id"] == "downvote":
            downvotes = doc["count"]

    # Determine the current user's vote (BUG FIX: was `if False`)
    current_user_vote: Optional[str] = None
    if current_user is not None:
        user_vote = await db.votes.find_one({
            "user_id": current_user["_id"],
            "idea_id": idea_oid,
        })
        if user_vote:
            current_user_vote = user_vote["vote_type"]

    return VoteSummaryResponse(
        idea_id=idea_id,
        upvotes=upvotes,
        downvotes=downvotes,
        score=upvotes - downvotes,
        current_user_vote=current_user_vote,
    )
