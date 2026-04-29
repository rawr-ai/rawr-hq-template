from __future__ import annotations

from pathlib import Path
from typing import Any

from .core_config import CORE_GRAPH_FILENAMES
from .io import read_json, rel, write_json
from .semantic_evidence import stable_id
from .semantica_llm_extraction import (
    bounded_confidence,
    call_semantica_llm_methods,
    entity_to_dict,
    llm_extractor_version,
    semantica_llm_status,
    triplet_to_dict,
)

LLM_AUGMENTATION_SCHEMA_VERSION = "rawr-sweep-llm-evidence-augmentation-v1"

SELECTED_KINDS = {"ambiguous", "candidate-new"}
SELECTED_BUCKETS = {"unresolved-target", "weak-modality", "subordinate-policy-gap"}


def write_llm_evidence_augmentation(
    run_dir: Path,
    *,
    provider: str = "openai",
    model: str | None = None,
    limit: int = 20,
    max_text_length: int | None = None,
) -> dict[str, Any]:
    artifact = build_llm_evidence_augmentation(
        run_dir,
        provider=provider,
        model=model,
        limit=limit,
        max_text_length=max_text_length,
    )
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_llm_evidence_augmentation"], artifact)
    return artifact


def build_llm_evidence_augmentation(
    run_dir: Path,
    *,
    provider: str = "openai",
    model: str | None = None,
    limit: int = 20,
    max_text_length: int | None = None,
) -> dict[str, Any]:
    index_path = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]
    if not index_path.exists():
        raise FileNotFoundError(
            "LLM evidence augmentation requires a corpus sweep evidence index. "
            f"No artifact exists at {rel(index_path)}. Run `bun run semantica:doc:sweep` or `bun run semantica:doc:index -- --run <run>` first."
        )
    index = read_json(index_path)
    selected = select_augmentation_rows(index, limit=limit)
    status = augmentation_status(provider, model)
    suggestions: list[dict[str, Any]] = []
    diagnostics: list[dict[str, Any]] = []

    if status["actual_mode"] == "mock":
        suggestions = [mock_suggestion(index, row, provider=provider, model=model) for row in selected]
    elif status["available"]:
        for row in selected:
            try:
                status["llm_call_attempted"] = True
                entities, triplets = call_semantica_llm_methods(
                    str(row.get("text") or ""),
                    provider=provider,
                    model=model,
                    max_text_length=max_text_length,
                )
            except Exception as exc:
                status["available"] = False
                status["actual_mode"] = "blocked"
                status["blocked_reason"] = "blocked-llm-call-failed"
                status["error"] = str(exc)
                diagnostics.append({"kind": "llm-call-failed", "row": row_ref(row), "error": str(exc)})
                suggestions = []
                break
            if not entities and not triplets:
                diagnostics.append({"kind": "llm-empty-output", "row": row_ref(row)})
                continue
            suggestions.append(llm_suggestion(index, row, provider=provider, model=model, entities=entities, triplets=triplets))

    return {
        "schema_version": LLM_AUGMENTATION_SCHEMA_VERSION,
        "run": rel(run_dir),
        "run_id": index.get("run_id"),
        "source_index": rel(index_path),
        "authority_boundary": {
            **index.get("authority_boundary", {}),
            "augmentation_is_truth": False,
            "alters_deterministic_index": False,
            "alters_deterministic_verdicts": False,
            "promotion_allowed": False,
        },
        "status": status,
        "selection": {
            "limit": limit,
            "selected_count": len(selected),
            "selected_kinds": sorted(SELECTED_KINDS),
            "selected_buckets": sorted(SELECTED_BUCKETS),
        },
        "summary": {
            "suggestion_count": len(suggestions),
            "blocked_reason": status.get("blocked_reason"),
            "provider": provider,
            "model": model,
        },
        "selected_rows": [row_ref(row) for row in selected],
        "suggestions": suggestions,
        "diagnostics": diagnostics,
    }


def augmentation_status(provider: str, model: str | None) -> dict[str, Any]:
    if provider == "mock":
        return {
            "available": True,
            "actual_mode": "mock",
            "provider": provider,
            "model": model or "mock-model",
            "provider_available": True,
            "llm_call_attempted": False,
            "blocked_reason": None,
            "extraction_method": "mock-llm-evidence-augmentation-v1",
        }
    status = semantica_llm_status(provider, model)
    return {
        **status,
        "actual_mode": "semantica-llm-augmentation" if status.get("available") else "blocked",
        "extraction_method": "semantica-llm-evidence-augmentation-v1",
    }


def select_augmentation_rows(index: dict[str, Any], *, limit: int) -> list[dict[str, Any]]:
    rows = [
        row
        for row in index.get("findings", [])
        if row.get("kind") in SELECTED_KINDS
        or row.get("resolution_state") == "unresolved"
        or row.get("ambiguity_bucket") in SELECTED_BUCKETS
    ]
    return sorted(rows, key=selection_sort_key)[: max(0, limit)]


def selection_sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
    priority = 0
    if row.get("kind") == "candidate-new":
        priority = -3
    elif row.get("ambiguity_bucket") == "unresolved-target" or row.get("resolution_state") == "unresolved":
        priority = -2
    elif row.get("ambiguity_bucket") == "subordinate-policy-gap":
        priority = -1
    return (
        priority,
        str(row.get("sweep_document_path") or row.get("document_path") or ""),
        row.get("line_start") or 0,
        str(row.get("index_id") or row.get("finding_id") or ""),
    )


def mock_suggestion(index: dict[str, Any], row: dict[str, Any], *, provider: str, model: str | None) -> dict[str, Any]:
    suggestion_kind = "candidate-mapping" if row.get("kind") == "candidate-new" else "ambiguity-clarification"
    return {
        "id": stable_id("llm-augmentation", str(index.get("run_id") or "run"), str(row.get("index_id") or row.get("finding_id") or ""), provider),
        "source_row": row_ref(row),
        "suggestion_kind": suggestion_kind,
        "suggested_label": row.get("label") or row.get("entity_id") or row.get("subject") or "unresolved concept",
        "suggested_action": "review-candidate-mapping" if suggestion_kind == "candidate-mapping" else "review-assertion-scope",
        "rationale": "Mock LLM augmentation for deterministic schema validation; not model evidence.",
        "confidence": bounded_confidence(float(row.get("confidence") or 0.5) * 0.8),
        "extraction": {
            "provider": provider,
            "model": model or "mock-model",
            "method": "mock-llm-evidence-augmentation-v1",
        },
        "review_state": "evidence-only",
        "promotion_allowed": False,
        "decision_grade": False,
    }


def llm_suggestion(
    index: dict[str, Any],
    row: dict[str, Any],
    *,
    provider: str,
    model: str | None,
    entities: list[Any],
    triplets: list[Any],
) -> dict[str, Any]:
    raw_entities = [entity_to_dict(entity) for entity in entities]
    raw_triplets = [triplet_to_dict(triplet) for triplet in triplets]
    return {
        "id": stable_id("llm-augmentation", str(index.get("run_id") or "run"), str(row.get("index_id") or row.get("finding_id") or ""), provider, model or ""),
        "source_row": row_ref(row),
        "suggestion_kind": "semantic-expansion",
        "suggested_label": first_label(raw_entities, row),
        "suggested_action": "review-llm-augmentation",
        "rationale": "Semantica LLM extraction over selected evidence text. Treat as evidence-only until reviewed.",
        "confidence": aggregate_confidence(raw_entities, raw_triplets, row),
        "extraction": {
            "provider": provider,
            "model": model,
            "method": llm_extractor_version(provider),
            "raw_entity_count": len(raw_entities),
            "raw_triplet_count": len(raw_triplets),
            "raw_entities": raw_entities[:10],
            "raw_triplets": raw_triplets[:10],
        },
        "review_state": "evidence-only",
        "promotion_allowed": False,
        "decision_grade": False,
    }


def row_ref(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "index_id": row.get("index_id"),
        "finding_id": row.get("finding_id"),
        "claim_id": row.get("claim_id"),
        "kind": row.get("kind"),
        "rule": row.get("rule"),
        "source_path": row.get("source_path"),
        "document_path": row.get("document_path"),
        "sweep_document_path": row.get("sweep_document_path"),
        "line_start": row.get("line_start"),
        "line_end": row.get("line_end"),
        "char_start": row.get("char_start"),
        "char_end": row.get("char_end"),
        "char_span_kind": row.get("char_span_kind"),
        "heading_path": row.get("heading_path", []),
        "text": row.get("text"),
        "confidence": row.get("confidence"),
        "review_action": row.get("review_action"),
        "source_span": row.get("source_span"),
    }


def first_label(raw_entities: list[dict[str, Any]], row: dict[str, Any]) -> str:
    return next((item.get("text") for item in raw_entities if item.get("text")), None) or str(row.get("label") or row.get("entity_id") or "llm evidence")


def aggregate_confidence(raw_entities: list[dict[str, Any]], raw_triplets: list[dict[str, Any]], row: dict[str, Any]) -> float:
    values = [item.get("confidence") for item in [*raw_entities, *raw_triplets] if item.get("confidence") is not None]
    if not values:
        return bounded_confidence(row.get("confidence") or 0.5)
    return bounded_confidence(sum(float(value) for value in values) / len(values))
