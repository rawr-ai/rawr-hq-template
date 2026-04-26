from __future__ import annotations

from collections import defaultdict
from typing import Any

from .io import read_json, write_json
from .validation import validate_graph


def build_diff(run_dir) -> dict[str, Any]:
    ontology = read_json(run_dir / "ontology.json")
    entities = ontology["entities"]
    relations = ontology["relations"]
    claims = ontology["claims"]
    validation = validate_graph(ontology)

    shared = [
        {
            "entity_id": entity["id"],
            "name": entity["name"],
            "type": entity["type"],
            "sources": entity.get("sources", []),
            "authority_status": entity["authority_status"],
            "authority_rank": entity["authority_rank"],
            "authority_scope": entity["authority_scope"],
        }
        for entity in entities
        if len(entity.get("sources", [])) > 1
    ]

    status_by_name: dict[str, set[str]] = defaultdict(set)
    for entity in entities:
        status_by_name[entity["name"].lower()].add(entity["authority_status"])

    authority_conflicts = [
        {"kind": "entity", "name": name, "statuses": sorted(statuses)}
        for name, statuses in sorted(status_by_name.items())
        if len(statuses) > 1
    ]

    replacement_rules = [relation for relation in relations if relation["predicate"] == "replaces"]
    forbidden_terms = [
        entity
        for entity in entities
        if entity["type"] == "ForbiddenPattern"
        or (entity["authority_status"] == "forbidden" and entity["authority_scope"] == "alignment-authority")
    ]
    supersession_edges = [relation for relation in relations if relation["predicate"] == "supersedes"]
    ownership_edges = [
        relation
        for relation in relations
        if relation["predicate"] in {"owns", "does_not_own"}
        and (not relation.get("claim_id") or relation["authority_rank"] == 1)
    ]
    lifecycle_edges = [relation for relation in relations if relation["predicate"] == "precedes"]
    stale_overlap_candidates = [
        claim
        for claim in claims
        if claim["authority_status"] in {"superseded", "legacy", "forbidden"}
        or (claim["authority_scope"] == "broad-architecture-non-overlap" and claim["claim_type"] in {"candidate", "placement"})
    ]
    preserved_broad_concepts = [
        entity
        for entity in entities
        if entity["authority_scope"] == "broad-architecture-non-overlap"
        and entity["authority_status"] in {"candidate", "observed", "canonical"}
        and entity["type"] in {"ArchitectureKind", "Role", "Surface", "ResourceCapability", "Provider"}
    ]

    diff = {
        "version": 2,
        "summary": {
            "shared_concept_count": len(shared),
            "authority_conflict_count": len(authority_conflicts),
            "replacement_rule_count": len(replacement_rules),
            "forbidden_term_count": len(forbidden_terms),
            "supersession_edge_count": len(supersession_edges),
            "ownership_edge_count": len(ownership_edges),
            "lifecycle_edge_count": len(lifecycle_edges),
            "stale_overlap_candidate_count": len(stale_overlap_candidates),
            "preserved_broad_concept_count": len(preserved_broad_concepts),
            "validation_issue_count": validation["issue_count"],
        },
        "shared_concepts": shared[:100],
        "authority_conflicts": authority_conflicts[:100],
        "replacement_rules": relation_view(replacement_rules)[:100],
        "forbidden_terms": entity_view(forbidden_terms)[:100],
        "supersession_edges": relation_view(supersession_edges)[:100],
        "ownership_edges": relation_view(ownership_edges)[:100],
        "lifecycle_edges": relation_view(lifecycle_edges)[:100],
        "stale_overlap_candidates": claim_view(stale_overlap_candidates)[:100],
        "preserved_broad_concepts": entity_view(preserved_broad_concepts)[:100],
        "validation": validation,
        "recommended_next_actions": recommended_actions(validation),
    }
    write_json(run_dir / "semantic-diff.json", diff)
    return diff


def relation_view(relations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": relation["id"],
            "subject": relation["subject"],
            "predicate": relation["predicate"],
            "object": relation["object"],
            "claim_id": relation.get("claim_id"),
            "authority_rank": relation["authority_rank"],
            "authority_scope": relation["authority_scope"],
            "provenance": relation["provenance"],
        }
        for relation in relations
    ]


def entity_view(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": entity["id"],
            "name": entity["name"],
            "type": entity["type"],
            "authority_status": entity["authority_status"],
            "authority_rank": entity["authority_rank"],
            "authority_scope": entity["authority_scope"],
            "sources": entity.get("sources", []),
        }
        for entity in entities
    ]


def claim_view(claims: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": claim["id"],
            "text": claim["text"],
            "claim_type": claim["claim_type"],
            "authority_status": claim["authority_status"],
            "authority_rank": claim["authority_rank"],
            "authority_scope": claim["authority_scope"],
            "provenance": claim["provenance"],
        }
        for claim in claims
    ]


def recommended_actions(validation: dict[str, Any]) -> list[str]:
    actions = [
        "Review supersession_edges and replacement_rules before using the graph to update architecture docs.",
        "Use stale_overlap_candidates as candidate edit targets in the under-revision integrated architecture document.",
        "Use preserved_broad_concepts as guardrails so runtime detail does not flatten valid broad architecture.",
    ]
    if validation["issue_count"]:
        actions.insert(0, "Resolve validation issues before treating the graph as decision-grade.")
    return actions
