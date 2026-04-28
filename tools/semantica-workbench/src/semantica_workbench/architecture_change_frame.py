from __future__ import annotations

from typing import Any

from .io import read_json
from .paths import ARCHITECTURE_CHANGE_FRAME_SCHEMA

FRAME_SCHEMA_VERSION = "rawr-architecture-change-frame-v1"

REQUIRED_EVIDENCE_REF_FIELDS = {
    "id",
    "source_path",
    "heading_path",
    "context",
    "line_start",
    "line_end",
    "char_start",
    "char_end",
    "char_span_kind",
    "text",
    "extraction_method",
    "confidence",
    "review_state",
    "promotion_allowed",
}


def load_architecture_change_frame_schema() -> dict[str, Any]:
    return read_json(ARCHITECTURE_CHANGE_FRAME_SCHEMA)


def frame_schema_summary() -> dict[str, Any]:
    schema = load_architecture_change_frame_schema()
    defs = schema.get("$defs", {})
    return {
        "schema_version": schema["properties"]["schema_version"]["const"],
        "required_top_level": sorted(schema.get("required", [])),
        "claim_types": defs["claim_type"]["enum"],
        "verdicts": defs["verdict"]["enum"],
        "review_actions": defs["review_action"]["enum"],
        "evidence_ref_required": sorted(defs["evidence_ref"]["required"]),
        "governance_required": sorted(defs["governance"]["required"]),
    }


def validate_frame_policy_shape(frame: dict[str, Any]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    if frame.get("schema_version") != FRAME_SCHEMA_VERSION:
        errors.append({"kind": "frame_schema_version_mismatch", "path": "schema_version"})

    governance = frame.get("governance") or {}
    expected_governance = {
        "truth_authority": "rawr-reviewed-ontology",
        "semantica_output_authoritative": False,
        "requires_human_promotion": True,
        "promotion_allowed": False,
    }
    for key, expected in expected_governance.items():
        if governance.get(key) != expected:
            errors.append({"kind": "frame_governance_violation", "path": f"governance.{key}", "expected": expected})

    extraction = frame.get("extraction") or {}
    if extraction.get("promotion_allowed") is not False:
        errors.append({"kind": "frame_extraction_promotion_allowed", "path": "extraction.promotion_allowed"})

    comparison = frame.get("comparison") or {}
    if comparison.get("status") == "extraction-only":
        if comparison.get("overall_verdict") != "not-evaluated":
            errors.append({"kind": "extraction_only_frame_has_verdict", "path": "comparison.overall_verdict"})
        if comparison.get("recommended_next_action") != "none":
            errors.append({"kind": "extraction_only_frame_has_review_action", "path": "comparison.recommended_next_action"})

    for collection_name in ["claims", "noun_mappings"]:
        for index, item in enumerate(frame.get(collection_name) or []):
            if item.get("promotion_allowed") is not False:
                errors.append({"kind": "frame_item_promotion_allowed", "path": f"{collection_name}[{index}].promotion_allowed"})
            evidence_refs = item.get("evidence_refs") or []
            if not evidence_refs:
                errors.append({"kind": "missing_structured_evidence_ref", "path": f"{collection_name}[{index}].evidence_refs"})
                continue
            for evidence_index, evidence_ref in enumerate(evidence_refs):
                errors.extend(_validate_evidence_ref(evidence_ref, f"{collection_name}[{index}].evidence_refs[{evidence_index}]"))

    return errors


def _validate_evidence_ref(evidence_ref: dict[str, Any], path: str) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    missing = sorted(REQUIRED_EVIDENCE_REF_FIELDS - set(evidence_ref))
    if missing:
        errors.append({"kind": "evidence_ref_missing_required_fields", "path": path, "missing": missing})
    if evidence_ref.get("promotion_allowed") is not False:
        errors.append({"kind": "evidence_ref_promotion_allowed", "path": f"{path}.promotion_allowed"})
    line_start = evidence_ref.get("line_start")
    line_end = evidence_ref.get("line_end")
    if isinstance(line_start, int) and isinstance(line_end, int) and line_end < line_start:
        errors.append({"kind": "evidence_ref_invalid_line_span", "path": path})
    char_start = evidence_ref.get("char_start")
    char_end = evidence_ref.get("char_end")
    if isinstance(char_start, int) and isinstance(char_end, int) and char_end < char_start:
        errors.append({"kind": "evidence_ref_invalid_char_span", "path": path})
    confidence = evidence_ref.get("confidence")
    if not isinstance(confidence, int | float) or confidence < 0 or confidence > 1:
        errors.append({"kind": "evidence_ref_invalid_confidence", "path": f"{path}.confidence"})
    return errors
