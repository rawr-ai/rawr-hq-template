from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from .paths import REPO_ROOT


@dataclass(frozen=True)
class Source:
    id: str
    path: Path
    title: str
    authority: str
    status: str
    role: str
    authority_rank: int
    authority_scope: str

    @property
    def rel_path(self) -> str:
        return str(self.path.relative_to(REPO_ROOT))


@dataclass(frozen=True)
class Manifest:
    path: Path
    project: str
    version: int
    notes: list[str]
    sources: list[Source]


def load_manifest(path: Path) -> Manifest:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Manifest must be a mapping: {path}")

    sources: list[Source] = []
    for raw in data.get("sources", []):
        if not raw.get("include", True):
            continue
        source_path = REPO_ROOT / raw["path"]
        if not source_path.exists():
            raise FileNotFoundError(f"Manifest source does not exist: {source_path}")
        sources.append(
            Source(
                id=str(raw["id"]),
                path=source_path,
                title=str(raw.get("title") or raw["id"]),
                authority=str(raw.get("authority") or "supporting"),
                status=str(raw.get("status") or "observed"),
                role=str(raw.get("role") or "source"),
                authority_rank=int(raw.get("authority_rank") or 99),
                authority_scope=str(raw.get("authority_scope") or "unspecified"),
            )
        )

    if not sources:
        raise ValueError(f"Manifest has no included sources: {path}")

    return Manifest(
        path=path,
        project=str(data.get("project") or "unknown"),
        version=int(data.get("version") or 1),
        notes=[str(note) for note in data.get("notes", [])],
        sources=sources,
    )
