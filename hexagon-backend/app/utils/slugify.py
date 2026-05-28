"""Slug generation utilities."""

from __future__ import annotations

import re

from slugify import slugify


def generate_unique_slug(title: str, existing_slugs: set[str], max_length: int = 80) -> str:
    """Create a URL-safe slug from *title*, ensuring uniqueness against *existing_slugs*.

    If ``my-idea`` already exists the function appends ``-1``, ``-2``, etc.
    """
    base = slugify(title, max_length=max_length)
    if base not in existing_slugs:
        return base

    counter = 1
    while True:
        candidate = f"{base}-{counter}"
        if candidate not in existing_slugs:
            return candidate
        counter += 1
