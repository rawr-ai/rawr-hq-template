from __future__ import annotations

from pathlib import Path
from typing import Any

from .io import rel
from .semantic_evidence import build_semantic_indexes, classify_claim_text, resolve_line_terms
from .source_model import stripped_line_span


def semantica_extraction_pilot(document: Path, graph: dict[str, Any], candidate_queue: dict[str, Any]) -> dict[str, Any]:
    if not document.is_absolute():
        from .paths import REPO_ROOT

        document = REPO_ROOT / document
    text = document.read_text(encoding="utf-8")
    indexes = build_semantic_indexes(graph, candidate_queue)
    status = semantica_extraction_status()
    raw_items: list[dict[str, Any]] = []
    diagnostics: list[dict[str, str]] = []

    if status["non_llm_available"]:
        try:
            from semantica.semantic_extract import TripletExtractor

            triplets = TripletExtractor(method="pattern", include_provenance=True).extract_triplets(text)
            raw_items = [triplet_to_dict(triplet) for triplet in triplets]
        except Exception as exc:
            diagnostics.append({"kind": "semantica_triplet_extraction_failed", "error": str(exc)})
    else:
        diagnostics.append({"kind": "semantica_triplet_extraction_unavailable", "error": status.get("error", "")})

    evidence_claims = []
    for index, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        if not stripped:
            continue
        stripped_span = stripped_line_span(line)
        matches = resolve_line_terms(stripped, indexes)
        if not any(matches.values()):
            continue
        classification = classify_claim_text(stripped, heading_path_at_line(text, index), matched=True)
        evidence_claims.append(
            {
                "source_path": rel(document),
                "line_start": index,
                "line_end": index,
                "char_start": stripped_span.char_start,
                "char_end": stripped_span.char_end,
                "char_span_kind": "line-offset",
                "heading_path": heading_path_at_line(text, index),
                "text": stripped,
                "polarity": classification["polarity"],
                "modality": classification["modality"],
                "assertion_scope": classification["assertion_scope"],
                "authority_context": classification["authority_context"],
                "resolved_ids": {
                    "canonical": [item["id"] for item in matches.get("canonical", [])],
                    "deprecated_terms": [item["id"] for item in matches.get("deprecated_terms", [])],
                    "prohibited_patterns": [item["id"] for item in matches.get("prohibited_patterns", [])],
                    "verification_policy": [item["id"] for item in matches.get("verification_policy", [])],
                    "candidates": [item["id"] for item in matches.get("candidates", [])],
                },
                "extractor": "semantica-pilot-pattern-v1",
                "confidence": 0.5,
                "review_state": "evidence-only",
                "promotion_allowed": False,
            }
        )

    return {
        "schema_version": "rawr-semantica-extraction-pilot-v1",
        "document": rel(document),
        "status": status,
        "summary": {
            "raw_item_count": len(raw_items),
            "evidence_claim_count": len(evidence_claims),
            "decision_grade_source": "rawr-semantic-heuristic-v1",
            "promotion_allowed": False,
            "adapter_mode": "semantica-triplet-proof-with-rawr-evidence-line-adapter",
        },
        "raw_items": raw_items,
        "evidence_claims": evidence_claims,
        "diagnostics": diagnostics,
        "fallback": {
            "deterministic_oracle": "rawr-semantic-heuristic-v1",
            "removal_trigger": "Use semantica extraction for decision-grade comparison only after fixture parity and provider/span gates pass.",
        },
        "limitations": [
            "Pilot evidence claims are produced by RAWR line resolution and claim classification, not directly from semantica triplets.",
            "semantica triplets are retained as raw evidence items until a direct triplet-to-claim adapter is proven.",
        ],
    }


def semantica_extraction_status() -> dict[str, Any]:
    optional = optional_dependency_status()
    try:
        from semantica import semantic_extract

        return {
            "available": True,
            "classification": "pilot",
            "non_llm_available": hasattr(semantic_extract, "TripletExtractor"),
            "llm_available": hasattr(semantic_extract, "LLMExtraction") and any(optional[name]["available"] for name in ["openai", "anthropic", "litellm", "ollama"]),
            "optional_dependencies": optional,
            "limitation": "Pattern extraction is evidence-only and does not preserve RAWR claim semantics without the adapter.",
        }
    except Exception as exc:
        return {
            "available": False,
            "classification": "blocked",
            "non_llm_available": False,
            "llm_available": False,
            "optional_dependencies": optional,
            "error": str(exc),
        }


def optional_dependency_status() -> dict[str, dict[str, Any]]:
    import importlib.metadata

    result: dict[str, dict[str, Any]] = {}
    for name in ["openai", "anthropic", "litellm", "ollama"]:
        try:
            result[name] = {"available": True, "version": importlib.metadata.version(name)}
        except Exception as exc:
            result[name] = {"available": False, "error": str(exc)}
    return result


def triplet_to_dict(triplet: Any) -> dict[str, Any]:
    return {
        "subject": str(getattr(triplet, "subject", "")),
        "predicate": str(getattr(triplet, "predicate", "")),
        "object": str(getattr(triplet, "object", "")),
        "confidence": float(getattr(triplet, "confidence", 0.0) or 0.0),
        "metadata": getattr(triplet, "metadata", {}) or {},
    }


def heading_path_at_line(text: str, line_number: int) -> list[str]:
    import re

    headings: list[str] = []
    for current_line, line in enumerate(text.splitlines(), start=1):
        if current_line > line_number:
            break
        match = re.match(r"^(#{1,6})\s+(.+)$", line.strip())
        if match:
            level = len(match.group(1))
            headings = headings[: level - 1] + [match.group(2).strip()]
    return headings
