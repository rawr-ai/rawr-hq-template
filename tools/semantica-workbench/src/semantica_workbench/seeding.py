from __future__ import annotations

from typing import Any

from .extraction import stable_id
from .manifest import Manifest, Source

def build_seed_graph(manifest: Manifest) -> dict[str, Any]:
    seeds: dict[str, dict[str, Any]] = {}
    relations: dict[str, dict[str, Any]] = {}

    for source in manifest.sources:
        document_id = seed_entity(
            seeds,
            source,
            source.title,
            "Document",
            source.status,
            "source-document",
            1,
            1,
            aliases=[source.id],
            summary=f"Manifest source {source.title}",
        )
        authority_id = seed_entity(
            seeds,
            source,
            source.authority,
            "AuthoritySource",
            source.status,
            "authority-source",
            1,
            1,
            aliases=[source.role],
            summary=f"Authority source for {source.title}",
        )
        seed_relation(
            relations,
            authority_id,
            "is_authority_for",
            document_id,
            source,
            None,
            1,
            1,
            confidence=1.0,
            qualifiers={"scope": source.authority_scope},
        )

    return {
        "version": 1,
        "manifest": {
            "project": manifest.project,
            "path": str(manifest.path),
            "source_count": len(manifest.sources),
        },
        "seeds": sorted(seeds.values(), key=lambda item: (item["type"], item["name"].lower())),
        "relations": sorted(relations.values(), key=lambda item: item["id"]),
        "summary": {"seed_count": len(seeds), "relation_count": len(relations)},
    }


def entity_id(entity_type: str, name: str) -> str:
    return stable_id("seed-entity", entity_type.lower(), normalize_name(name))


def seed_entity(
    seeds: dict[str, dict[str, Any]],
    source: Source,
    name: str,
    entity_type: str,
    authority_status: str,
    seed_kind: str,
    line_start: int,
    line_end: int,
    aliases: list[str] | None = None,
    summary: str = "",
) -> str:
    clean = normalize_display_name(name)
    if not clean:
        return ""
    key = entity_id(entity_type, clean)
    existing = seeds.get(key)
    prov = source_provenance(source, line_start, line_end)
    if existing:
        existing["aliases"] = sorted(set(existing.get("aliases", []) + (aliases or [])))
        existing["provenance"].append(prov)
        existing["authority_rank"] = min(existing["authority_rank"], source.authority_rank)
        return key
    seeds[key] = {
        "id": key,
        "name": clean,
        "type": entity_type,
        "aliases": sorted(set(aliases or [])),
        "summary": summary or f"Seeded {entity_type} from {source.title}.",
        "authority_status": authority_status,
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
        "seed_kind": seed_kind,
        "confidence": 1.0,
        "provenance": [prov],
        "sources": [source.id],
    }
    return key


def seed_relation(
    relations: dict[str, dict[str, Any]],
    subject_id: str,
    predicate: str,
    object_id: str,
    source: Source,
    claim_id: str | None,
    line_start: int,
    line_end: int,
    confidence: float,
    qualifiers: dict[str, Any] | None = None,
) -> None:
    if not subject_id or not object_id:
        return
    key = stable_id("seed-relation", subject_id, predicate, object_id, source.id, str(line_start), str(line_end))
    relations[key] = {
        "id": key,
        "subject_id": subject_id,
        "predicate": predicate,
        "object_id": object_id,
        "claim_id": claim_id,
        "confidence": confidence,
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
        "qualifiers": qualifiers or {},
        "provenance": source_provenance(source, line_start, line_end),
    }


def source_provenance(source: Source, line_start: int, line_end: int) -> dict[str, Any]:
    return {
        "source_id": source.id,
        "path": source.rel_path,
        "line_start": line_start,
        "line_end": line_end,
        "heading_path": [],
        "authority_rank": source.authority_rank,
        "authority_scope": source.authority_scope,
        "source_authority": source.authority,
    }


def normalize_name(value: str) -> str:
    return normalize_display_name(value).lower()


def normalize_display_name(value: str) -> str:
    return " ".join(str(value).strip().strip("`").split())
