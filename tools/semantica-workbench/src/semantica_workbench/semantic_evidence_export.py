from __future__ import annotations

from typing import Any

from .semantica_adapter import (
    WORKBENCH_EVIDENCE_NAMESPACE,
    WORKBENCH_ONTOLOGY_NAMESPACE,
    iri_fragment,
    turtle_literal,
)


def semantic_compare_turtle(compare: dict[str, Any]) -> str:
    lines = [
        f"@prefix workbench: <{WORKBENCH_ONTOLOGY_NAMESPACE}> .",
        f"@prefix evidence: <{WORKBENCH_EVIDENCE_NAMESPACE}> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    for claim in compare.get("claims", []):
        node = iri_fragment(claim["id"])
        lines.append(f"evidence:{node} a workbench:EvidenceClaim ;")
        lines.append(f"  rdfs:label {turtle_literal(claim['text'])} ;")
        lines.append(f"  workbench:polarity {turtle_literal(claim['polarity'])} ;")
        lines.append(f"  workbench:modality {turtle_literal(claim['modality'])} ;")
        lines.append(f"  workbench:assertionScope {turtle_literal(claim['assertion_scope'])} .")
        lines.append("")
    for item in compare.get("findings", []):
        node = iri_fragment(item["id"])
        claim = iri_fragment(item["claim_id"])
        lines.append(f"evidence:{node} a workbench:ReviewFinding ;")
        lines.append(f"  workbench:findingKind {turtle_literal(item['kind'])} ;")
        lines.append(f"  workbench:derivedFrom evidence:{claim} ;")
        if item.get("entity_id"):
            lines.append(f"  workbench:resolvedTarget workbench:{iri_fragment(item['entity_id'])} ;")
        if item.get("ambiguity_bucket"):
            lines.append(f"  workbench:ambiguityBucket {turtle_literal(item['ambiguity_bucket'])} ;")
        if item.get("review_action"):
            lines.append(f"  workbench:reviewAction {turtle_literal(item['review_action'])} ;")
        lines.append(f"  workbench:rule {turtle_literal(item.get('rule') or '')} .")
        lines.append("")
    return "\n".join(lines)
