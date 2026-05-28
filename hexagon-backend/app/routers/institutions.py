"""Institutional interests router — manage institutional interest in ideas."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pymongo.errors import DuplicateKeyError

from app.database import get_database
from app.dependencies import get_current_user
from app.schemas.institutional import (
    DashboardStatsResponse,
    InstitutionalInterestCreateRequest,
    InstitutionalInterestListResponse,
    InstitutionalInterestResponse,
    InstitutionalInterestUpdateRequest,
)

router = APIRouter()

VALID_STATUSES = {"interested", "under_review", "implemented"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _interest_to_response(doc: Dict, institution_name: Optional[str] = None) -> InstitutionalInterestResponse:
    """Convert a MongoDB institutional_interests doc to a response schema."""
    return InstitutionalInterestResponse(
        id=str(doc["_id"]),
        institution_id=str(doc["institution_id"]),
        idea_id=str(doc["idea_id"]),
        status=doc.get("status", "interested"),
        notes=doc.get("notes"),
        created_at=doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else str(doc["created_at"]),
        updated_at=doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else str(doc["updated_at"]),
        institution_name=institution_name,
    )


# ---------------------------------------------------------------------------
# GET — list interests for an idea
# ---------------------------------------------------------------------------
@router.get("/ideas/{idea_id}/interests", response_model=InstitutionalInterestListResponse)
async def list_interests(
    idea_id: str,
    current_user: Optional[Dict] = Depends(get_current_user),
):
    """List all institutional interests registered for a given idea."""
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

    cursor = db.institutional_interests.find({"idea_id": idea_oid}).sort("created_at", -1)
    raw = await cursor.to_list(length=200)

    items: List[InstitutionalInterestResponse] = []
    for doc in raw:
        # Fetch institution name
        inst_doc = await db.users.find_one(
            {"_id": doc["institution_id"]},
            {"username": 1, "full_name": 1},
        )
        inst_name = inst_doc.get("full_name") or inst_doc.get("username") if inst_doc else None
        items.append(_interest_to_response(doc, institution_name=inst_name))

    return InstitutionalInterestListResponse(items=items, total=len(items))


# ---------------------------------------------------------------------------
# POST — register interest
# ---------------------------------------------------------------------------
@router.post("/ideas/{idea_id}/interests", response_model=InstitutionalInterestResponse, status_code=status.HTTP_201_CREATED)
async def create_interest(
    idea_id: str,
    payload: InstitutionalInterestCreateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Register institutional interest in an idea. The current user must have role 'institution' or 'admin'."""
    db = get_database()

    if current_user.get("role") not in ("institution", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institutional or admin users can register interest.",
        )

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    idea = await db.ideas.find_one({"_id": idea_oid})
    if not idea:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Idea not found.",
        )

    if payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    now = datetime.now(timezone.utc)
    doc = {
        "institution_id": current_user["_id"],
        "idea_id": idea_oid,
        "status": payload.status,
        "notes": payload.notes,
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = await db.institutional_interests.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interest already registered for this idea.",
        )

    doc["_id"] = result.inserted_id
    inst_name = current_user.get("full_name") or current_user.get("username")
    return _interest_to_response(doc, institution_name=inst_name)


# ---------------------------------------------------------------------------
# PUT — update interest
# ---------------------------------------------------------------------------
@router.put("/ideas/{idea_id}/interests", response_model=InstitutionalInterestResponse)
async def update_interest(
    idea_id: str,
    payload: InstitutionalInterestUpdateRequest,
    current_user: Dict = Depends(get_current_user),
):
    """Update an existing institutional interest record."""
    db = get_database()

    if current_user.get("role") not in ("institution", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institutional or admin users can update interest records.",
        )

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    if payload.status is not None and payload.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    update_fields: Dict = {"updated_at": datetime.now(timezone.utc)}
    if payload.status is not None:
        update_fields["status"] = payload.status
    if payload.notes is not None:
        update_fields["notes"] = payload.notes

    result = await db.institutional_interests.update_one(
        {"institution_id": current_user["_id"], "idea_id": idea_oid},
        {"$set": update_fields},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest record not found for this idea.",
        )

    doc = await db.institutional_interests.find_one({
        "institution_id": current_user["_id"],
        "idea_id": idea_oid,
    })
    inst_name = current_user.get("full_name") or current_user.get("username")
    return _interest_to_response(doc, institution_name=inst_name)


# ---------------------------------------------------------------------------
# DELETE — remove interest
# ---------------------------------------------------------------------------
@router.delete("/ideas/{idea_id}/interests", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interest(
    idea_id: str,
    current_user: Dict = Depends(get_current_user),
):
    """Remove an institutional interest record."""
    db = get_database()

    if current_user.get("role") not in ("institution", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institutional or admin users can remove interest records.",
        )

    try:
        idea_oid = ObjectId(idea_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid idea ID format.",
        )

    result = await db.institutional_interests.delete_one({
        "institution_id": current_user["_id"],
        "idea_id": idea_oid,
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest record not found for this idea.",
        )


# ---------------------------------------------------------------------------
# GET — institutional dashboard
# ---------------------------------------------------------------------------
@router.get("/dashboard", response_model=DashboardStatsResponse)
async def dashboard(
    current_user: Dict = Depends(get_current_user),
):
    """Return aggregated dashboard statistics for the current institutional user."""
    db = get_database()

    if current_user.get("role") not in ("institution", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only institutional or admin users can access the dashboard.",
        )

    inst_id = current_user["_id"]

    # Count by status
    pipeline = [
        {"$match": {"institution_id": inst_id}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    agg_results = await db.institutional_interests.aggregate(pipeline).to_list(length=10)

    counts = {"interested": 0, "under_review": 0, "implemented": 0}
    for r in agg_results:
        if r["_id"] in counts:
            counts[r["_id"]] = r["count"]
    total = sum(counts.values())

    # Recent interests (last 10)
    recent_cursor = db.institutional_interests.find(
        {"institution_id": inst_id},
    ).sort("created_at", -1).limit(10)
    recent_raw = await recent_cursor.to_list(length=10)

    recent_items: List[InstitutionalInterestResponse] = []
    for doc in recent_raw:
        inst_name = current_user.get("full_name") or current_user.get("username")
        recent_items.append(_interest_to_response(doc, institution_name=inst_name))

    return DashboardStatsResponse(
        total_interests=total,
        interested=counts["interested"],
        under_review=counts["under_review"],
        implemented=counts["implemented"],
        recent_interests=recent_items,
    )
