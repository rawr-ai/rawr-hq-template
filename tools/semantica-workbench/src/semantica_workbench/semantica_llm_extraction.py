from __future__ import annotations

import importlib.metadata
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .io import rel
from .semantic_evidence import stable_id
from .source_model import anchor_quote_to_source, span_from_offsets

LLM_SCHEMA_VERSION = "rawr-semantica-llm-extraction-v1"
LLM_EXTRACTOR_VERSION = "semantica-llm-openai-v1"


@dataclass(frozen=True)
class SourceBlock:
    index: int
    text: str
    line_start: int
    line_end: int
    heading_path: list[str]


def semantica_llm_status(provider: str = "openai", model: str | None = None) -> dict[str, Any]:
    optional = optional_provider_dependency_status(provider)
    status = {
        "available": False,
        "classification": "blocked",
        "provider": provider,
        "model": model,
        "provider_available": False,
        "llm_call_attempted": False,
        "fallback_used": False,
        "blocked_reason": None,
        "optional_dependency": optional,
    }
    if not optional["available"]:
        status["blocked_reason"] = "blocked-missing-extra"
        return status
    if not model:
        status["blocked_reason"] = "blocked-requires-model"
        return status
    try:
        from semantica.semantic_extract.providers import create_provider

        llm = create_provider(provider, model=model, use_pool=False)
        if not llm.is_available():
            status["blocked_reason"] = "blocked-provider-unavailable"
            if provider.lower() == "openai" and not os.environ.get("OPENAI_API_KEY"):
                status["blocked_reason"] = "blocked-no-api-key"
            return status
    except Exception as exc:
        status["blocked_reason"] = "blocked-provider-error"
        status["error"] = str(exc)
        return status
    status["available"] = True
    status["classification"] = "ready"
    status["provider_available"] = True
    status["blocked_reason"] = None
    return status


def optional_provider_dependency_status(provider: str) -> dict[str, Any]:
    package = {
        "openai": "openai",
        "anthropic": "anthropic",
        "litellm": "litellm",
        "ollama": "ollama",
        "groq": "groq",
    }.get(provider.lower(), provider.lower())
    try:
        return {"package": package, "available": True, "version": importlib.metadata.version(package)}
    except Exception as exc:
        return {"package": package, "available": False, "error": str(exc)}


def semantica_llm_extraction(
    document: Path,
    *,
    provider: str = "openai",
    model: str | None = None,
    max_text_length: int | None = None,
) -> dict[str, Any]:
    if not document.is_absolute():
        from .paths import REPO_ROOT

        document = REPO_ROOT / document
    text = document.read_text(encoding="utf-8")
    status = semantica_llm_status(provider, model)
    if not status["available"]:
        return llm_result(document, status, raw_entities=[], raw_triplets=[], evidence_claims=[], diagnostics=[])

    diagnostics: list[dict[str, Any]] = []
    block_results: list[tuple[SourceBlock, list[Any], list[Any]]] = []
    try:
        for block in source_blocks(text):
            entities, triplets = call_semantica_llm_methods(
                block.text, provider=provider, model=model, max_text_length=max_text_length
            )
            block_results.append((block, entities, triplets))
        status["llm_call_attempted"] = True
    except Exception as exc:
        status["available"] = False
        status["classification"] = "blocked"
        status["blocked_reason"] = "blocked-llm-call-failed"
        status["llm_call_attempted"] = True
        status["error"] = str(exc)
        diagnostics.append({"kind": "semantica_llm_call_failed", "error": str(exc)})
        return llm_result(
            document, status, raw_entities=[], raw_triplets=[], evidence_claims=[], diagnostics=diagnostics
        )

    raw_entities = [
        entity_to_dict(entity, block) for block, entities, _triplets in block_results for entity in entities
    ]
    raw_triplets = [
        triplet_to_dict(triplet, block) for block, _entities, triplets in block_results for triplet in triplets
    ]
    claims = llm_evidence_claims(document, block_results, provider=provider, model=model, diagnostics=diagnostics)
    return llm_result(
        document,
        status,
        raw_entities=raw_entities,
        raw_triplets=raw_triplets,
        evidence_claims=claims,
        diagnostics=diagnostics,
    )


def call_semantica_llm_methods(
    text: str, *, provider: str, model: str | None, max_text_length: int | None
) -> tuple[list[Any], list[Any]]:
    from semantica.semantic_extract.methods import extract_entities_llm, extract_triplets_llm

    entities = extract_entities_llm(
        text,
        provider=provider,
        model=model,
        silent_fail=False,
        max_text_length=max_text_length,
        entity_types=[
            "ARCHITECTURE_CONCEPT",
            "PACKAGE",
            "RUNTIME_COMPONENT",
            "PROJECTION_LANE",
            "POLICY",
            "RESOURCE_PROVIDER",
        ],
    )
    triplets = extract_triplets_llm(
        text,
        entities=entities,
        provider=provider,
        model=model,
        silent_fail=False,
        max_text_length=max_text_length,
        triplet_types=[
            "owns",
            "provides",
            "requires",
            "forbids",
            "replaces",
            "depends_on",
            "implements",
            "extends",
        ],
    )
    return list(entities), list(triplets)


def llm_evidence_claims(
    document: Path,
    block_results: list[tuple[SourceBlock, list[Any], list[Any]]],
    *,
    provider: str,
    model: str | None,
    diagnostics: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    claims: list[dict[str, Any]] = []
    for block, entities, triplets in block_results:
        for index, triplet in enumerate(triplets, start=1):
            subject = str(getattr(triplet, "subject", "") or "")
            predicate = str(getattr(triplet, "predicate", "") or "mentions")
            obj = str(getattr(triplet, "object", "") or "")
            quote = triplet_source_quote(triplet) or subject or obj
            anchored = translate_block_span(block, anchor_quote_to_source(block.text, quote))
            if anchored is None:
                diagnostics.append(
                    {
                        "kind": "span-unresolved",
                        "item": "triplet",
                        "block": block.index,
                        "subject": subject,
                        "predicate": predicate,
                        "object": obj,
                    }
                )
                continue
            claims.append(
                llm_claim(
                    document,
                    block,
                    anchored,
                    claim_id_parts=["triplet", str(block.index), str(index), subject, predicate, obj],
                    text=quote,
                    claim_kind="llm-semantic-triplet",
                    subject=subject or quote,
                    predicate=predicate,
                    obj=obj or None,
                    confidence=bounded_confidence(getattr(triplet, "confidence", 0.5)),
                    provider=provider,
                    model=model,
                )
            )
        for index, entity in enumerate(entities, start=1):
            entity_text = str(getattr(entity, "text", "") or "")
            start_value = getattr(entity, "start_char", None)
            end_value = getattr(entity, "end_char", None)
            start_char = int(start_value) if start_value is not None else -1
            end_char = int(end_value) if end_value is not None else -1
            anchored = translate_block_span(
                block,
                span_from_offsets(block.text, start_char, end_char)
                if start_char >= 0 and end_char >= start_char
                else anchor_quote_to_source(block.text, entity_text),
            )
            if anchored is None:
                diagnostics.append(
                    {"kind": "span-unresolved", "item": "entity", "block": block.index, "text": entity_text}
                )
                continue
            claims.append(
                llm_claim(
                    document,
                    block,
                    anchored,
                    claim_id_parts=["entity", str(block.index), str(index), entity_text],
                    text=entity_text,
                    claim_kind="llm-semantic-entity",
                    subject=entity_text,
                    predicate="mentions",
                    obj=str(getattr(entity, "label", "") or None),
                    confidence=bounded_confidence(getattr(entity, "confidence", 0.5)),
                    provider=provider,
                    model=model,
                )
            )
    return claims


def llm_claim(
    document: Path,
    block: SourceBlock,
    anchored: Any,
    *,
    claim_id_parts: list[str],
    text: str,
    claim_kind: str,
    subject: str,
    predicate: str,
    obj: str | None,
    confidence: float,
    provider: str,
    model: str | None,
) -> dict[str, Any]:
    return {
        "id": stable_id("llm-claim", rel(document), *claim_id_parts),
        "source_path": rel(document),
        "line_start": anchored.line_start,
        "line_end": anchored.line_end,
        "char_start": anchored.char_start,
        "char_end": anchored.char_end,
        "char_span_kind": anchored.char_span_kind,
        "heading_path": block.heading_path,
        "text": text,
        "claim_kind": claim_kind,
        "resolution_state": "unresolved",
        "subject": subject,
        "predicate": predicate,
        "object": obj,
        "polarity": "unknown",
        "modality": "unknown",
        "assertion_scope": "unknown",
        "authority_context": "comparison-document",
        "confidence": confidence,
        "extractor": llm_extractor_version(provider),
        "model": model,
        "provider": provider,
        "resolved_ids": empty_resolved_ids(),
        "review_state": "evidence-only",
        "promotion_allowed": False,
    }


def source_blocks(text: str, *, max_chars: int = 6000) -> list[SourceBlock]:
    blocks: list[SourceBlock] = []
    heading_path: list[str] = []
    buffer: list[str] = []
    buffer_start = 1
    buffer_heading: list[str] = []

    def flush(end_line: int) -> None:
        nonlocal buffer, buffer_start, buffer_heading
        payload = "\n".join(buffer).strip("\n")
        if payload.strip():
            blocks.append(SourceBlock(len(blocks) + 1, payload, buffer_start, end_line, buffer_heading.copy()))
        buffer = []
        buffer_start = end_line + 1
        buffer_heading = heading_path.copy()

    for number, line in enumerate(text.splitlines(), start=1):
        stripped = line.strip()
        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            if buffer:
                flush(number - 1)
            level = len(heading.group(1))
            heading_path = heading_path[: level - 1] + [heading.group(2).strip()]
            buffer_start = number + 1
            buffer_heading = heading_path.copy()
            continue
        if not stripped:
            if buffer:
                flush(number - 1)
            buffer_start = number + 1
            buffer_heading = heading_path.copy()
            continue
        if not buffer:
            buffer_start = number
            buffer_heading = heading_path.copy()
        buffer.append(line)
        if sum(len(item) + 1 for item in buffer) >= max_chars:
            flush(number)
    if buffer:
        flush(len(text.splitlines()))
    return blocks


def translate_block_span(block: SourceBlock, span: Any | None) -> Any | None:
    if span is None:
        return None
    from .source_model import SourceSpan

    return SourceSpan(
        line_start=block.line_start + span.line_start - 1,
        line_end=block.line_start + span.line_end - 1,
        char_start=span.char_start,
        char_end=span.char_end,
        char_span_kind=span.char_span_kind,
    )


def llm_result(
    document: Path,
    status: dict[str, Any],
    *,
    raw_entities: list[dict[str, Any]],
    raw_triplets: list[dict[str, Any]],
    evidence_claims: list[dict[str, Any]],
    diagnostics: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "schema_version": LLM_SCHEMA_VERSION,
        "document": rel(document),
        "requested_mode": "semantica-llm",
        "actual_mode": "semantica-llm" if status.get("available") and status.get("llm_call_attempted") else "blocked",
        "status": status,
        "summary": {
            "raw_entity_count": len(raw_entities),
            "raw_triplet_count": len(raw_triplets),
            "evidence_claim_count": len(evidence_claims),
            "extractor": llm_extractor_version(str(status.get("provider") or "openai")),
            "decision_grade_source": "rawr-deterministic-policy-v1",
            "promotion_allowed": False,
            "fallback_used": status.get("fallback_used", False),
            "blocked_reason": status.get("blocked_reason"),
        },
        "raw_entities": raw_entities,
        "raw_triplets": raw_triplets,
        "evidence_claims": evidence_claims,
        "diagnostics": diagnostics,
        "fallback": {
            "deterministic_oracle": "rawr-semantic-heuristic-v1",
            "fallback_used": False,
            "removal_trigger": "None; explicit LLM mode must fail closed instead of silently substituting deterministic evidence.",
        },
    }


def triplet_source_quote(triplet: Any) -> str | None:
    metadata = getattr(triplet, "metadata", {}) or {}
    for key in ["source_sentence", "source_text", "text", "context"]:
        value = metadata.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def entity_to_dict(entity: Any, block: SourceBlock | None = None) -> dict[str, Any]:
    start_value = getattr(entity, "start_char", None)
    end_value = getattr(entity, "end_char", None)
    return {
        "text": str(getattr(entity, "text", "")),
        "label": str(getattr(entity, "label", "")),
        "start_char": int(start_value) if start_value is not None else -1,
        "end_char": int(end_value) if end_value is not None else -1,
        "confidence": bounded_confidence(getattr(entity, "confidence", 0.0)),
        "metadata": getattr(entity, "metadata", {}) or {},
        "block": block_ref(block),
    }


def triplet_to_dict(triplet: Any, block: SourceBlock | None = None) -> dict[str, Any]:
    return {
        "subject": str(getattr(triplet, "subject", "")),
        "predicate": str(getattr(triplet, "predicate", "")),
        "object": str(getattr(triplet, "object", "")),
        "confidence": bounded_confidence(getattr(triplet, "confidence", 0.0)),
        "metadata": getattr(triplet, "metadata", {}) or {},
        "block": block_ref(block),
    }


def block_ref(block: SourceBlock | None) -> dict[str, Any] | None:
    if block is None:
        return None
    return {
        "index": block.index,
        "line_start": block.line_start,
        "line_end": block.line_end,
        "heading_path": block.heading_path,
    }


def llm_extractor_version(provider: str) -> str:
    return f"semantica-llm-{provider.lower()}-v1"


def bounded_confidence(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.5
    return max(0.0, min(1.0, number))


def empty_resolved_ids() -> dict[str, list[str]]:
    return {
        "canonical": [],
        "deprecated_terms": [],
        "prohibited_patterns": [],
        "verification_policy": [],
        "candidates": [],
    }
