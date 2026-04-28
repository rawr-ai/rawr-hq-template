from __future__ import annotations

from collections import defaultdict
from typing import Any

from .extraction import stable_id
from .io import read_json, read_jsonl, write_json
from .paths import AUTHORITY_ONTOLOGY, CONTENT_ONTOLOGY
from .semantica_adapter import generate_semantica_ontology


def load_definitions() -> tuple[dict[str, Any], dict[str, Any]]:
    return read_json(CONTENT_ONTOLOGY), read_json(AUTHORITY_ONTOLOGY)


def normalize_run(run_dir) -> dict[str, Any]:
    content, authority = load_definitions()
    allowed_types = {item["id"] for item in content["entity_types"]}
    allowed_relations = {item["id"] for item in content["relation_types"]}
    allowed_statuses = {item["id"] for item in authority["authority_statuses"]}

    seeds = read_json(run_dir / "seeds.json")
    rows = read_jsonl(run_dir / "extraction.jsonl")
    entities: dict[str, dict[str, Any]] = {}
    relations: dict[str, dict[str, Any]] = {}
    claims: dict[str, dict[str, Any]] = {}
    diagnostics: list[dict[str, Any]] = []
    source_index: dict[str, set[str]] = defaultdict(set)

    for seed in seeds.get("seeds", []):
        entity = normalize_seed_entity(seed, allowed_types, allowed_statuses)
        entities[entity["id"]] = entity
        for prov in entity.get("provenance", []):
            source_index[entity["id"]].add(prov["source_id"])

    for relation in seeds.get("relations", []):
        add_relation(relations, diagnostics, relation, allowed_relations, entities, relation.get("provenance", {}))

    for row in rows:
        chunk = row["chunk"]
        prov = provenance_from_dict(chunk)
        for raw in row.get("claims", []):
            claim = normalize_claim(raw, allowed_statuses, prov)
            claims[claim["id"]] = claim

        for raw in row.get("entity_mentions", []):
            entity_id = str(raw.get("entity_id") or "")
            name = str(raw.get("name") or "").strip()
            if not entity_id or not name:
                continue
            entity_type = str(raw.get("type") or "Concept")
            if entity_type not in allowed_types:
                entity_type = "Concept"
            status = str(raw.get("authority_status") or chunk.get("status") or "observed")
            if status not in allowed_statuses:
                status = "observed"
            if entity_type == "ForbiddenPattern" and status == "canonical":
                status = "forbidden"
            if entity_id not in entities:
                entities[entity_id] = {
                    "id": entity_id,
                    "name": name,
                    "type": entity_type,
                    "aliases": [],
                    "summary": "",
                    "authority_status": status,
                    "authority_rank": int(raw.get("authority_rank") or chunk.get("authority_rank") or 99),
                    "authority_scope": str(raw.get("authority_scope") or chunk.get("authority_scope") or "unspecified"),
                    "resolution_status": raw.get("resolution_status", "candidate"),
                    "confidence": float(raw.get("confidence") or 0.0),
                    "provenance": [],
                    "sources": [],
                }
            entities[entity_id]["confidence"] = max(entities[entity_id]["confidence"], float(raw.get("confidence") or 0.0))
            entities[entity_id]["provenance"].append(prov)
            source_index[entity_id].add(chunk["source_id"])

        for raw in row.get("relations", []):
            add_relation(relations, diagnostics, raw, allowed_relations, entities, prov)

        for diagnostic in row.get("diagnostics", []):
            diagnostics.append({"kind": "extraction", "message": str(diagnostic), "provenance": prov})

    for key, sources in source_index.items():
        if key in entities:
            entities[key]["sources"] = sorted(sources)

    ontology = {
        "version": 2,
        "content_ontology": content["id"],
        "authority_overlay": authority["id"],
        "entities": sorted(entities.values(), key=lambda item: (item["type"], item["name"].lower())),
        "relations": sorted(relations.values(), key=lambda item: item["id"]),
        "claims": sorted(claims.values(), key=lambda item: item["id"]),
        "diagnostics": diagnostics,
        "summary": {
            "entity_count": len(entities),
            "relation_count": len(relations),
            "claim_count": len(claims),
            "shared_entity_count": sum(1 for item in entities.values() if len(item.get("sources", [])) > 1),
            "diagnostic_count": len(diagnostics),
            "seed_entity_count": len(seeds.get("seeds", [])),
            "seed_relation_count": len(seeds.get("relations", [])),
        },
    }
    classes = sorted({item["type"] for item in ontology["entities"]})
    properties = sorted({item["predicate"] for item in ontology["relations"]})
    ontology["semantica"] = generate_semantica_ontology(classes, properties)
    write_json(run_dir / "ontology.json", ontology)
    return ontology


def normalize_seed_entity(seed: dict[str, Any], allowed_types: set[str], allowed_statuses: set[str]) -> dict[str, Any]:
    entity_type = str(seed.get("type") or "Concept")
    if entity_type not in allowed_types:
        entity_type = "Concept"
    status = str(seed.get("authority_status") or "observed")
    if status not in allowed_statuses:
        status = "observed"
    if entity_type == "ForbiddenPattern" and status == "canonical":
        status = "forbidden"
    return {
        "id": str(seed["id"]),
        "name": str(seed["name"]),
        "type": entity_type,
        "aliases": seed.get("aliases", []),
        "summary": str(seed.get("summary") or ""),
        "authority_status": status,
        "authority_rank": int(seed.get("authority_rank") or 99),
        "authority_scope": str(seed.get("authority_scope") or "unspecified"),
        "resolution_status": "seeded",
        "seed_kind": str(seed.get("seed_kind") or "seed"),
        "confidence": float(seed.get("confidence") or 1.0),
        "provenance": seed.get("provenance", []),
        "sources": sorted({prov["source_id"] for prov in seed.get("provenance", []) if "source_id" in prov}),
    }


def normalize_claim(raw: dict[str, Any], allowed_statuses: set[str], prov: dict[str, Any]) -> dict[str, Any]:
    status = str(raw.get("authority_status") or "observed")
    if status not in allowed_statuses:
        status = "observed"
    claim_prov = dict(prov)
    claim_prov["line_start"] = int(raw.get("line_start") or prov["line_start"])
    claim_prov["line_end"] = int(raw.get("line_end") or prov["line_end"])
    return {
        "id": str(raw.get("id") or stable_id("claim", str(raw.get("text") or ""), prov["source_id"])),
        "text": str(raw.get("text") or ""),
        "claim_type": str(raw.get("claim_type") or "candidate"),
        "authority_status": status,
        "authority_rank": int(raw.get("authority_rank") or prov.get("authority_rank") or 99),
        "authority_scope": str(raw.get("authority_scope") or prov.get("authority_scope") or "unspecified"),
        "confidence": float(raw.get("confidence") or 0.0),
        "provenance": claim_prov,
    }


def add_relation(
    relations: dict[str, dict[str, Any]],
    diagnostics: list[dict[str, Any]],
    raw: dict[str, Any],
    allowed_relations: set[str],
    entities: dict[str, dict[str, Any]],
    fallback_prov: dict[str, Any],
) -> None:
    predicate = str(raw.get("predicate") or "")
    subject_id = str(raw.get("subject_id") or "")
    object_id = str(raw.get("object_id") or "")
    prov = raw.get("provenance") or fallback_prov
    if predicate == "mentions" or predicate not in allowed_relations:
        diagnostics.append(
            {
                "kind": "rejected_relation_predicate",
                "predicate": predicate,
                "subject_id": subject_id,
                "object_id": object_id,
                "provenance": prov,
            }
        )
        return
    if predicate == "replaces" and raw.get("claim_id"):
        diagnostics.append(
            {
                "kind": "rejected_inferred_replacement",
                "predicate": predicate,
                "subject_id": subject_id,
                "object_id": object_id,
                "claim_id": raw.get("claim_id"),
                "provenance": prov,
            }
        )
        return
    if subject_id not in entities or object_id not in entities:
        diagnostics.append(
            {
                "kind": "unresolved_relation_endpoint",
                "predicate": predicate,
                "subject_id": subject_id,
                "object_id": object_id,
                "provenance": prov,
            }
        )
        return
    key = str(raw.get("id") or stable_id("normalized-relation", subject_id, predicate, object_id, str(raw.get("claim_id") or "")))
    relations[key] = {
        "id": key,
        "subject_id": subject_id,
        "subject": entities[subject_id]["name"],
        "predicate": predicate,
        "object_id": object_id,
        "object": entities[object_id]["name"],
        "claim_id": raw.get("claim_id"),
        "confidence": float(raw.get("confidence") or 0.0),
        "authority_rank": int(raw.get("authority_rank") or prov.get("authority_rank") or 99),
        "authority_scope": str(raw.get("authority_scope") or prov.get("authority_scope") or "unspecified"),
        "qualifiers": raw.get("qualifiers", {}),
        "provenance": prov,
    }


def provenance_from_dict(chunk: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_id": chunk["source_id"],
        "path": chunk["source_path"],
        "line_start": chunk["line_start"],
        "line_end": chunk["line_end"],
        "heading_path": chunk.get("heading_path", []),
        "authority_rank": int(chunk.get("authority_rank") or 99),
        "authority_scope": chunk.get("authority_scope", "unspecified"),
        "source_authority": chunk.get("authority", "supporting"),
    }
