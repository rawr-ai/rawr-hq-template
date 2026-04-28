from __future__ import annotations

from collections import Counter
from typing import Any


def semantica_graph_probe(graph: dict[str, Any], candidate_queue: dict[str, Any], allowed_predicates: set[str] | None = None) -> dict[str, Any]:
    status = semantica_graph_status()
    target_ids = {entity["id"] for entity in graph.get("target_architecture_view", {}).get("entities", [])}
    candidate_ids = {candidate["id"] for candidate in candidate_queue.get("candidates", []) if candidate.get("id")}
    evidence_like_types = {"EvidenceClaim", "ReviewFinding", "CandidateEntity"}
    target_entities = graph.get("target_architecture_view", {}).get("entities", [])
    target_relations = graph.get("target_architecture_view", {}).get("relations", [])
    duplicate_labels = duplicate_label_groups(graph.get("entities", []))
    controlled_predicates = allowed_predicates or {relation["predicate"] for relation in graph.get("relations", [])}

    proof: dict[str, Any] = {
        "schema_version": "rawr-semantica-graph-proof-v1",
        "status": status,
        "summary": {
            "entity_count": len(graph.get("entities", [])),
            "relation_count": len(graph.get("relations", [])),
            "target_entity_count": len(target_entities),
            "target_relation_count": len(target_relations),
            "candidate_count": len(candidate_ids),
            "duplicate_label_group_count": len(duplicate_labels),
        },
        "rawr_guards": {
            "stable_ids_preserved": all(entity.get("id") for entity in graph.get("entities", [])),
            "controlled_predicates_preserved": all(relation.get("predicate") in controlled_predicates for relation in graph.get("relations", [])),
            "candidate_ids_excluded_from_target": not bool(target_ids & candidate_ids),
            "evidence_types_excluded_from_target": not any(entity.get("type") in evidence_like_types for entity in target_entities),
            "target_relations_resolve_inside_target": all(
                relation.get("subject") in target_ids and relation.get("object") in target_ids for relation in target_relations
            ),
        },
        "candidate_handling": {
            "candidate_ids": sorted(candidate_ids),
            "classification": "candidate-queue-only",
            "promotion_allowed": False,
        },
        "normalization": {
            "duplicate_label_groups": duplicate_labels,
            "action": "review-only",
        },
        "fallback": {
            "rawr_id_authority": True,
            "rawr_predicate_authority": True,
            "removal_trigger": "Use semantica normalization/dedup for graph mutation only after stable IDs, predicates, and target-view leakage tests pass.",
        },
    }
    try:
        from semantica.kg import GraphAnalyzer, KnowledgeGraph

        kg = KnowledgeGraph(
            entities=[{"id": entity["id"], "type": entity.get("type"), "label": entity.get("label")} for entity in graph.get("entities", [])],
            relationships=[
                {
                    "id": relation["id"],
                    "source": relation.get("subject"),
                    "target": relation.get("object"),
                    "type": relation.get("predicate"),
                }
                for relation in graph.get("relations", [])
            ],
            metadata={"source": "rawr-reviewed-ontology", "truth_model": "rawr-owned"},
        )
        proof["semantica"] = {
            "knowledge_graph_constructible": True,
            "kg_entity_count": len(kg.entities),
            "kg_relationship_count": len(kg.relationships),
        }
        try:
            analysis = GraphAnalyzer().analyze({"entities": kg.entities, "relationships": kg.relationships})
            proof["semantica"]["graph_analyzer"] = {"ok": True, "keys": sorted(analysis.keys())}
        except Exception as exc:
            proof["semantica"]["graph_analyzer"] = {"ok": False, "error": str(exc)}
    except Exception as exc:
        proof["semantica"] = {"knowledge_graph_constructible": False, "error": str(exc)}
    return proof


def semantica_graph_status() -> dict[str, Any]:
    try:
        from semantica import deduplication, kg, normalize

        return {
            "available": True,
            "classification": "proof-ready",
            "kg_available": hasattr(kg, "KnowledgeGraph"),
            "graph_builder_available": hasattr(kg, "GraphBuilder"),
            "normalizer_available": hasattr(normalize, "EntityNormalizer"),
            "dedup_available": hasattr(deduplication, "DuplicateDetector"),
            "limitation": "RAWR IDs, predicates, candidate queues, and target views remain authoritative.",
        }
    except Exception as exc:
        return {
            "available": False,
            "classification": "blocked",
            "error": str(exc),
        }


def duplicate_label_groups(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    labels = Counter(str(entity.get("label") or "").strip().lower() for entity in entities if str(entity.get("label") or "").strip())
    duplicate_labels = {label for label, count in labels.items() if count > 1}
    rows = []
    for label in sorted(duplicate_labels):
        rows.append(
            {
                "label": label,
                "ids": sorted(entity["id"] for entity in entities if str(entity.get("label") or "").strip().lower() == label),
            }
        )
    return rows
