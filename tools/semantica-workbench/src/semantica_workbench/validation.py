from __future__ import annotations

from collections import Counter
from typing import Any


FORBIDDEN_NAMES = {
    "packages/runtime/*",
    "packages/hq-sdk",
    "@rawr/hq-sdk",
    "@rawr/runtime",
    "startAppRole(...)",
    "startAppRoles(...)",
    "RuntimeView",
    "ProcessView",
    "RoleView",
    "Shutdown",
}


def validate_graph(ontology: dict[str, Any]) -> dict[str, Any]:
    entities_by_id = {entity["id"]: entity for entity in ontology["entities"]}
    claims_by_id = {claim["id"]: claim for claim in ontology["claims"]}
    issues: list[dict[str, Any]] = []

    for claim in ontology["claims"]:
        prov = claim.get("provenance", {})
        if not claim.get("id") or not prov.get("path") or not prov.get("line_start") or not claim.get("authority_rank"):
            issues.append({"kind": "claim_missing_provenance", "claim_id": claim.get("id")})

    for relation in ontology["relations"]:
        if relation["predicate"] == "mentions":
            issues.append({"kind": "mentions_edge_in_decision_graph", "relation_id": relation["id"]})
        if relation["subject_id"] not in entities_by_id or relation["object_id"] not in entities_by_id:
            issues.append({"kind": "unresolved_relation_endpoint", "relation_id": relation["id"]})
        if relation.get("claim_id") and relation["claim_id"] not in claims_by_id:
            # Seeded edges are allowed to omit claim ids; generated edges must resolve.
            issues.append(
                {"kind": "missing_relation_claim", "relation_id": relation["id"], "claim_id": relation["claim_id"]}
            )
        prov = relation.get("provenance", {})
        if not prov.get("path") or not prov.get("line_start") or not relation.get("authority_rank"):
            issues.append({"kind": "relation_missing_provenance", "relation_id": relation["id"]})

    forbidden_entities = [
        entity
        for entity in ontology["entities"]
        if entity["name"] in FORBIDDEN_NAMES or entity.get("type") == "ForbiddenPattern"
    ]
    canonical_forbidden = [
        entity
        for entity in forbidden_entities
        if entity.get("authority_status") == "canonical" and entity.get("type") == "ForbiddenPattern"
    ]
    for entity in canonical_forbidden:
        issues.append({"kind": "forbidden_pattern_marked_canonical", "entity_id": entity["id"], "name": entity["name"]})

    predicate_counts = Counter(relation["predicate"] for relation in ontology["relations"])
    source_counts = Counter(
        prov["source_id"] for entity in ontology["entities"] for prov in entity.get("provenance", [])
    )
    replacement_rules = [relation for relation in ontology["relations"] if relation["predicate"] == "replaces"]
    forbidden_edges = [relation for relation in ontology["relations"] if relation["predicate"] == "forbids"]
    component_contract_entities = [
        entity
        for entity in ontology["entities"]
        if entity.get("seed_kind") == "component-contract" and entity["type"] == "RuntimeArtifact"
    ]

    packet_has_alignment_authority = "alignment-authority" in source_counts
    packet_has_runtime_spec = "runtime-realization-spec" in source_counts
    checks = {
        "claim_provenance_complete": not any(issue["kind"] == "claim_missing_provenance" for issue in issues),
        "relation_endpoints_resolved": not any(issue["kind"] == "unresolved_relation_endpoint" for issue in issues),
        "no_mentions_edges": predicate_counts.get("mentions", 0) == 0,
        "forbidden_terms_not_canonical": not canonical_forbidden,
        "replacement_rules_present": bool(replacement_rules) if packet_has_alignment_authority else True,
        "forbidden_edges_present": bool(forbidden_edges) if packet_has_alignment_authority else True,
        "component_contracts_seeded": bool(component_contract_entities) if packet_has_runtime_spec else True,
    }

    return {
        "version": 1,
        "checks": checks,
        "issue_count": len(issues),
        "issues": issues[:100],
        "predicate_counts": dict(sorted(predicate_counts.items())),
        "source_counts": dict(sorted(source_counts.items())),
        "replacement_rule_count": len(replacement_rules),
        "forbidden_edge_count": len(forbidden_edges),
        "component_contract_count": len(component_contract_entities),
    }
