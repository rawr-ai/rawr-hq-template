from __future__ import annotations

from pathlib import Path
from typing import Any, Literal, TypedDict

from .paths import WORKBENCH_ROOT

JsonObject = dict[str, Any]


class AuthorityBoundary(TypedDict, total=False):
    generated_evidence_is_truth: Literal[False]
    reviewed_rawr_ontology_remains_authority: Literal[True]
    promotion_requires_human_review: Literal[True]
    llm_output_is_evidence_only: Literal[True]
    augmentation_is_truth: Literal[False]
    alters_deterministic_index: Literal[False]
    alters_deterministic_verdicts: Literal[False]
    promotion_allowed: Literal[False]


class SourceSpan(TypedDict, total=False):
    source_path: str
    line_start: int
    line_end: int
    char_start: int
    char_end: int
    char_span_kind: str
    heading_path: list[str]
    text: str


class EvidenceFindingRow(TypedDict, total=False):
    index_id: str
    finding_id: str
    claim_id: str
    claim_index_id: str
    kind: str
    rule: str
    source_path: str
    document_path: str
    sweep_document_path: str
    line_start: int
    line_end: int
    char_start: int
    char_end: int
    char_span_kind: str
    heading_path: list[str]
    text: str
    confidence: float
    review_action: str
    review_state: str
    resolution_state: str
    source_span: SourceSpan
    decision_grade: bool


class SweepEvidenceIndex(TypedDict, total=False):
    schema_version: str
    run_id: str
    git_sha: str
    created_at: str
    authority_boundary: AuthorityBoundary
    source_sweep: JsonObject
    summary: JsonObject
    documents: list[JsonObject]
    claims: list[JsonObject]
    findings: list[EvidenceFindingRow]
    warnings: list[JsonObject]
    provenance: JsonObject


class LlmAugmentationSuggestion(TypedDict, total=False):
    id: str
    source_row: EvidenceFindingRow
    suggestion_kind: str
    suggested_label: str
    suggested_action: str
    rationale: str
    confidence: float
    extraction: JsonObject
    review_state: Literal["evidence-only"]
    promotion_allowed: Literal[False]
    decision_grade: Literal[False]


class LlmEvidenceAugmentation(TypedDict, total=False):
    schema_version: str
    run: str
    run_id: str
    source_index: str
    authority_boundary: AuthorityBoundary
    status: JsonObject
    selection: JsonObject
    summary: JsonObject
    selected_rows: list[EvidenceFindingRow]
    suggestions: list[LlmAugmentationSuggestion]
    diagnostics: list[JsonObject]


SCHEMA_FILENAMES = {
    "architecture-change-frame": "architecture-change-frame.schema.json",
    "sweep-evidence-index": "sweep-evidence-index.schema.json",
    "sweep-llm-evidence-augmentation": "sweep-llm-evidence-augmentation.schema.json",
}


def artifact_schema_path(name: str) -> Path:
    try:
        filename = SCHEMA_FILENAMES[name]
    except KeyError as exc:
        known = ", ".join(sorted(SCHEMA_FILENAMES))
        raise KeyError(f"Unknown artifact schema {name!r}; known schemas: {known}") from exc
    return WORKBENCH_ROOT / "schemas" / filename


def load_artifact_schema(name: str) -> JsonObject:
    import json

    return json.loads(artifact_schema_path(name).read_text(encoding="utf-8"))


def validate_artifact_schema(payload: JsonObject, schema_name: str) -> list[JsonObject]:
    try:
        import jsonschema  # type: ignore
    except ImportError:
        return [
            {
                "kind": "jsonschema_dependency_unavailable",
                "schema": schema_name,
                "message": "jsonschema is required for external artifact validation.",
            }
        ]
    validator = jsonschema.Draft202012Validator(load_artifact_schema(schema_name))
    return [
        {
            "kind": "json_schema_validation_failed",
            "schema": schema_name,
            "path": list(error.path),
            "error": error.message,
        }
        for error in sorted(validator.iter_errors(payload), key=lambda item: list(item.path))
    ]


def validate_evidence_authority_boundary(payload: JsonObject) -> list[JsonObject]:
    boundary = payload.get("authority_boundary")
    if not isinstance(boundary, dict):
        return [{"kind": "authority_boundary_missing", "path": ["authority_boundary"]}]
    expected = {
        "generated_evidence_is_truth": False,
        "reviewed_rawr_ontology_remains_authority": True,
        "promotion_requires_human_review": True,
        "llm_output_is_evidence_only": True,
    }
    false_only = {
        "promotion_allowed",
        "augmentation_is_truth",
        "alters_deterministic_index",
        "alters_deterministic_verdicts",
    }
    errors: list[JsonObject] = []
    for key, value in expected.items():
        if boundary.get(key) is not value:
            errors.append(
                {"kind": "authority_boundary_mismatch", "path": ["authority_boundary", key], "expected": value}
            )
    for key in sorted(false_only):
        if key in boundary and boundary.get(key) is not False:
            errors.append(
                {"kind": "authority_boundary_mismatch", "path": ["authority_boundary", key], "expected": False}
            )
    errors.extend(validate_generated_rows_are_not_promotable(payload, "findings"))
    errors.extend(validate_generated_rows_are_not_promotable(payload, "suggestions"))
    return errors


def validate_generated_rows_are_not_promotable(payload: JsonObject, key: str) -> list[JsonObject]:
    rows = payload.get(key)
    if not isinstance(rows, list):
        return []
    errors: list[JsonObject] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        if row.get("promotion_allowed") is True:
            errors.append(
                {"kind": "generated_row_promotable", "path": [key, index, "promotion_allowed"], "expected": False}
            )
        if key == "suggestions" and row.get("decision_grade") is True:
            errors.append(
                {"kind": "generated_row_decision_grade", "path": [key, index, "decision_grade"], "expected": False}
            )
    return errors
