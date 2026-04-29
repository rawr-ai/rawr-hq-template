from __future__ import annotations

from typing import Any

from .semantica_adapter import iri_fragment, turtle_literal


def semantic_compare_turtle(compare: dict[str, Any]) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix evidence: <https://rawr.dev/evidence/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    for claim in compare.get("claims", []):
        node = iri_fragment(claim["id"])
        lines.append(f"evidence:{node} a rawr:EvidenceClaim ;")
        lines.append(f"  rdfs:label {turtle_literal(claim['text'])} ;")
        lines.append(f"  rawr:polarity {turtle_literal(claim['polarity'])} ;")
        lines.append(f"  rawr:modality {turtle_literal(claim['modality'])} ;")
        lines.append(f"  rawr:assertionScope {turtle_literal(claim['assertion_scope'])} .")
        lines.append("")
    for item in compare.get("findings", []):
        node = iri_fragment(item["id"])
        claim = iri_fragment(item["claim_id"])
        lines.append(f"evidence:{node} a rawr:ReviewFinding ;")
        lines.append(f"  rawr:findingKind {turtle_literal(item['kind'])} ;")
        lines.append(f"  rawr:derivedFrom evidence:{claim} ;")
        if item.get("entity_id"):
            lines.append(f"  rawr:resolvedTarget rawr:{iri_fragment(item['entity_id'])} ;")
        if item.get("ambiguity_bucket"):
            lines.append(f"  rawr:ambiguityBucket {turtle_literal(item['ambiguity_bucket'])} ;")
        if item.get("review_action"):
            lines.append(f"  rawr:reviewAction {turtle_literal(item['review_action'])} ;")
        lines.append(f"  rawr:rule {turtle_literal(item.get('rule') or '')} .")
        lines.append("")
    return "\n".join(lines)
