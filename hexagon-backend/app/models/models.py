"""MongoDB document models (Pydantic validation, NOT ORM).

These models define the shape of documents stored in each collection.
They include embedded sub-documents and helper methods for serialization.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Embedded sub-documents
# ---------------------------------------------------------------------------
class IdeaFile(BaseModel):
    """Embedded file metadata stored inside an idea document."""

    file_name: str
    file_type: str
    file_path: str
    file_size: int
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IdeaVersion(BaseModel):
    """Embedded version history entry stored inside an idea document."""

    version: int
    title: str
    description: str
    problem_statement: str
    changed_by: str  # ObjectId as string
    change_summary: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Collection models
# ---------------------------------------------------------------------------
class UserModel(BaseModel):
    """Validation model for a user document in the users collection."""

    id: Optional[str] = Field(default=None, alias="_id")
    email: str
    username: str
    password_hash: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"
    email_verified: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "UserModel":
        """Construct a UserModel from a raw MongoDB document."""
        if not doc:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        return cls(**doc)

    def to_mongo(self) -> Dict[str, Any]:
        """Convert to a MongoDB-safe dict (restore ObjectId)."""
        data = self.model_dump(by_alias=True, exclude_none=True)
        if "_id" in data and isinstance(data["_id"], str):
            try:
                data["_id"] = ObjectId(data["_id"])
            except Exception:
                data.pop("_id")
        return data


class IdeaModel(BaseModel):
    """Validation model for an idea document in the ideas collection."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    title: str
    slug: str
    problem_statement: str
    description: str
    category: str = "Tech"
    target_region: Optional[str] = None
    target_community: Optional[str] = None
    expected_impact: Optional[str] = None
    cost_benefit_summary: Optional[str] = None
    status: str = "draft"
    video_url: Optional[str] = None
    version: int = 1
    view_count: int = 0
    files: List[IdeaFile] = Field(default_factory=list)
    versions: List[IdeaVersion] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: Optional[datetime] = None

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "IdeaModel":
        """Construct an IdeaModel from a raw MongoDB document."""
        if not doc:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        # Convert embedded files
        raw_files = doc.get("files", [])
        doc["files"] = [
            IdeaFile(**f) if not isinstance(f, IdeaFile) else f for f in raw_files
        ]
        # Convert embedded versions
        raw_versions = doc.get("versions", [])
        doc["versions"] = [
            IdeaVersion(**v) if not isinstance(v, IdeaVersion) else v for v in raw_versions
        ]
        return cls(**doc)


class VoteModel(BaseModel):
    """Validation model for a vote document in the votes collection."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    idea_id: str
    vote_type: str  # "upvote" or "downvote"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "VoteModel":
        if not doc:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        doc["idea_id"] = str(doc["idea_id"])
        return cls(**doc)


class CommentModel(BaseModel):
    """Validation model for a comment document in the comments collection."""

    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str
    idea_id: str
    parent_id: Optional[str] = None
    content: str
    is_suggestion: bool = False
    is_edited: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "CommentModel":
        if not doc:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        doc["user_id"] = str(doc["user_id"])
        doc["idea_id"] = str(doc["idea_id"])
        if doc.get("parent_id"):
            doc["parent_id"] = str(doc["parent_id"])
        return cls(**doc)


class InstitutionalInterestModel(BaseModel):
    """Validation model for an institutional_interests document."""

    id: Optional[str] = Field(default=None, alias="_id")
    institution_id: str
    idea_id: str
    status: str = "interested"  # interested / under_review / implemented
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}

    @classmethod
    def from_mongo(cls, doc: Dict[str, Any]) -> "InstitutionalInterestModel":
        if not doc:
            return None
        doc = dict(doc)
        doc["_id"] = str(doc["_id"])
        doc["institution_id"] = str(doc["institution_id"])
        doc["idea_id"] = str(doc["idea_id"])
        return cls(**doc)
