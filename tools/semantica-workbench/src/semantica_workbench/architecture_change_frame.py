from __future__ import annotations

import hashlib
import os
import re
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .io import git_sha, read_json, rel
from .paths import ARCHITECTURE_CHANGE_FRAME_SCHEMA, REPO_ROOT, WORKBENCH_ROOT
from .semantica_adapter import iri_fragment, semantica_status, turtle_literal
from .source_model import source_ref_to_path, source_scope_for_path, span_text_for_ref
from .semantic_evidence import (
    compare_evidence_to_ontology,
    extract_evidence_claims,
    normalize_text,
    stable_id,
    term_in_line,
)

FRAME_SCHEMA_VERSION = "rawr-architecture-change-frame-v1"
FRAME_PROVENANCE_SCHEMA_VERSION = "rawr-architecture-proposal-provenance-v1"
FRAME_VALIDATION_SCHEMA_VERSION = "rawr-architecture-change-frame-validation-v1"
CLAIM_COMPARISON_SCHEMA_VERSION = "rawr-architecture-claim-comparison-v1"
NOUN_MAPPING_SCHEMA_VERSION = "rawr-architecture-noun-mappings-v1"
VERDICT_REPAIR_SCHEMA_VERSION = "rawr-architecture-verdict-repair-v1"
PROPOSAL_PACKAGE_SCHEMA_VERSION = "rawr-architecture-proposal-package-v1"
REFERENCE_GEOMETRY_SCHEMA_VERSION = "rawr-reference-geometry-summary-v1"

FRAME_FIXTURE_DOCUMENT = WORKBENCH_ROOT / "fixtures/docs/architecture-change-proposal.md"
REFERENCE_BUNDLE_ENV = "RAWR_REFERENCE_GEOMETRY_BUNDLE"

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

CLAIM_ENUM_FIELDS = {
    "claim_type": "claim_type",
    "polarity": "polarity",
    "modality": "modality",
    "assertion_scope": "assertion_scope",
    "authority_context": "authority_context",
    "mapping_state": "mapping_state",
    "review_state": "review_state",
    "verdict": "verdict",
    "review_action": "review_action",
}

CLAIM_VERDICT_PRIORITY = {
    "conflicts": 0,
    "needs-canonical-addendum": 1,
    "unclear": 2,
    "compatible-extension": 3,
    "compatible": 4,
    "not-evaluated": 5,
}

GEOMETRY_TYPES = {
    "Kind",
    "AuthorityDomain",
    "ProjectionLane",
    "RuntimePhase",
    "ForbiddenPattern",
    "ExtensionSlot",
    "ComparisonVerdict",
    "ConstraintRule",
    "RepositoryRoot",
    "PlatformOperation",
    "ContextLane",
}

DEFAULT_REFERENCE_BUNDLE_CANDIDATES = [
    Path(os.environ[REFERENCE_BUNDLE_ENV]).expanduser()
    for _ in [None]
    if os.environ.get(REFERENCE_BUNDLE_ENV)
] + [
    Path.home() / "Documents/projects/RAWR/companion/RAWR_Ontology_Packet_Draft_v0.2.zip",
]


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


def fixture_frame_document_path() -> Path:
    return FRAME_FIXTURE_DOCUMENT


def build_architecture_change_frame_package(
    document: Path,
    graph: dict[str, Any],
    candidate_queue: dict[str, Any],
    *,
    fixture: bool = False,
    semantica_pilot_enabled: bool = False,
    extraction_mode: str = "deterministic",
    llm_provider: str = "openai",
    llm_model: str | None = None,
    evaluate: bool = False,
    reference_bundle: Path | None = None,
) -> dict[str, Any]:
    document_path = FRAME_FIXTURE_DOCUMENT if fixture else document
    if not document_path.is_absolute():
        document_path = REPO_ROOT / document_path
    evidence = extract_evidence_claims(
        document_path,
        graph,
        candidate_queue,
        fixture=fixture,
        semantica_pilot_enabled=semantica_pilot_enabled,
        extraction_mode=extraction_mode,
        llm_provider=llm_provider,
        llm_model=llm_model,
    )
    semantic_compare = compare_evidence_to_ontology(evidence, graph, candidate_queue)
    reference_geometry = load_reference_geometry(reference_bundle)
    frame = evidence_to_architecture_change_frame(
        document_path,
        evidence,
        semantic_compare,
        reference_geometry,
        evaluate=evaluate,
    )
    claim_comparisons = build_claim_comparison_payload(frame, semantic_compare, reference_geometry)
    if evaluate:
        apply_claim_comparisons_to_frame(frame, claim_comparisons)
    noun_mappings = build_noun_mapping_payload(frame, reference_geometry)
    verdict_repair = build_verdict_repair_payload(frame, claim_comparisons)
    if evaluate:
        frame["comparison"] = {
            "status": "evaluated",
            "overall_verdict": verdict_repair["overall_verdict"],
            "recommended_next_action": verdict_repair["recommended_next_action"],
            "ruleset": verdict_repair["ruleset"],
            "explanation_chain_complete": verdict_repair["summary"]["explanation_chain_complete"],
        }
    validation = validate_architecture_change_frame(frame)
    provenance = build_provenance_payload(
        frame,
        evidence,
        semantic_compare,
        reference_geometry,
        validation,
        evaluate=evaluate,
        semantica_pilot_enabled=semantica_pilot_enabled,
    )
    proposal_graph_ttl = proposal_graph_turtle(frame, noun_mappings, claim_comparisons, verdict_repair, reference_geometry)
    review_report = render_proposal_review_report(frame, noun_mappings, claim_comparisons, verdict_repair, validation, reference_geometry)
    return {
        "schema_version": PROPOSAL_PACKAGE_SCHEMA_VERSION,
        "frame": frame,
        "validation": validation,
        "noun_mappings": noun_mappings,
        "proposal_graph_ttl": proposal_graph_ttl,
        "claim_comparisons": claim_comparisons,
        "verdict_repair": verdict_repair,
        "review_report": review_report,
        "provenance": provenance,
        "evidence": evidence,
        "semantic_compare": semantic_compare,
    }


def evidence_to_architecture_change_frame(
    document: Path,
    evidence: dict[str, Any],
    semantic_compare: dict[str, Any],
    reference_geometry: dict[str, Any],
    *,
    evaluate: bool,
) -> dict[str, Any]:
    claims = [
        evidence_claim_to_frame_claim(claim, semantic_compare, reference_geometry, evaluate=evaluate)
        for claim in evidence.get("claims", [])
    ]
    if not claims:
        claims = [no_evidence_claim(document, evidence)]
    noun_mappings = [frame_noun_mapping_from_claim(claim, reference_geometry) for claim in claims]
    frame_id = stable_id("frame", evidence["document"], hashlib.sha256("\n".join(claim["id"] for claim in claims).encode("utf-8")).hexdigest()[:16])
    semantica = evidence.get("semantica") or {}
    semantica_version = str(semantica.get("version") or semantica_status().get("version") or "unknown")
    pilot_summary = evidence.get("semantica_pilot", {}).get("summary", {})
    llm_summary = evidence.get("semantica_llm", {}).get("summary", {}) if evidence.get("semantica_llm") else {}
    extraction_mode = evidence.get("extraction_mode", {})
    semantica_llm = evidence.get("semantica_llm") or {}
    if extraction_mode.get("requested") == "semantica-llm":
        method = "semantica-llm-pilot"
        status = "pilot" if semantica_llm.get("actual_mode") == "semantica-llm" else "blocked"
    else:
        method = "semantica-pattern-pilot" if pilot_summary.get("enabled") or pilot_summary.get("adapter_mode", "").startswith("semantica") else "rawr-deterministic-oracle"
        status = "pilot" if method.startswith("semantica") else "fallback"
    llm_provider_status = llm_provider_status_from_capability(semantica)
    if evidence.get("semantica_llm"):
        llm_provider_status = evidence["semantica_llm"].get("status", {}).get("blocked_reason") or "available"
        if llm_provider_status not in set(load_architecture_change_frame_schema()["$defs"]["extraction_run"]["properties"]["llm_provider_status"]["enum"]):
            llm_provider_status = "unproven"
    extraction_run = {
        "method": method,
        "extractor": llm_summary.get("extractor") or pilot_summary.get("adapter_mode") or "rawr-architecture-change-frame-deterministic-v1",
        "status": status,
        "llm_provider_status": llm_provider_status,
        "semantica_version": semantica_version,
        "deterministic_oracle": "rawr-semantic-heuristic-v1",
        "promotion_allowed": False,
        "diagnostics": frame_diagnostics(evidence, semantic_compare, reference_geometry),
    }
    model = extraction_mode.get("model") or (evidence.get("semantica_llm", {}).get("status", {}).get("model") if evidence.get("semantica_llm") else None)
    if model:
        extraction_run["model"] = model
    return {
        "schema_version": FRAME_SCHEMA_VERSION,
        "frame_id": frame_id,
        "document": document_ref(document, evidence),
        "proposal_summary": proposal_summary(claims),
        "target_app": infer_target_app(claims),
        "extraction": extraction_run,
        "governance": {
            "truth_authority": "rawr-reviewed-ontology",
            "semantica_output_authoritative": False,
            "reference_geometry_status": "comparison-only" if reference_geometry.get("loaded") else "not-used",
            "requires_human_promotion": True,
            "promotion_allowed": False,
        },
        "claims": claims,
        "noun_mappings": noun_mappings,
        "comparison": {
            "status": "evaluated" if evaluate else "extraction-only",
            "overall_verdict": "not-evaluated",
            "recommended_next_action": "none",
            "ruleset": "rawr-architecture-frame-deterministic-v1" if evaluate else "rawr-frame-pilot-unresolved",
            "explanation_chain_complete": False,
        },
        "unresolved_questions": unresolved_questions_for_compare(semantic_compare),
    }


def evidence_claim_to_frame_claim(
    claim: dict[str, Any],
    semantic_compare: dict[str, Any],
    reference_geometry: dict[str, Any],
    *,
    evaluate: bool,
) -> dict[str, Any]:
    evidence_ref = evidence_ref_from_claim(claim)
    resolved_ids = flattened_resolved_ids(claim)
    geometry_matches = reference_geometry_matches(claim.get("text", ""), reference_geometry)
    claim_type = infer_frame_claim_type(claim, geometry_matches)
    frame_claim = {
        "id": stable_id("frame-claim", claim["id"]),
        "claim_type": claim_type,
        "subject": claim.get("subject") or claim.get("text", "")[:80],
        "predicate": claim.get("predicate") or "mentions",
        "object": claim.get("object") or geometry_object_label(geometry_matches),
        "polarity": claim.get("polarity", "unknown"),
        "modality": claim.get("modality", "unknown"),
        "assertion_scope": claim.get("assertion_scope", "unknown"),
        "authority_context": normalize_authority_context(claim.get("authority_context")),
        "resolved_entity_ids": resolved_ids,
        "mapping_state": mapping_state_for_claim(claim, geometry_matches),
        "evidence_refs": [evidence_ref],
        "confidence": bounded_confidence(claim.get("confidence", 0.5)),
        "review_state": "evidence-only",
        "verdict": "not-evaluated",
        "review_action": "none",
        "promotion_allowed": False,
    }
    geometry_slot = first_geometry_by_type(geometry_matches, "ExtensionSlot")
    if geometry_slot:
        frame_claim["maps_to_extension_slot"] = geometry_slot["id"]
    if geometry_matches:
        frame_claim["maps_to_kind"] = geometry_matches[0].get("type")
    if claim_type == "ownership" and "truth" in normalize_text(claim.get("text", "")):
        frame_claim["authority_domain_claimed"] = "semantic-capability-truth"
    if claim_type == "projection":
        lane = first_geometry_by_type(geometry_matches, "ProjectionLane")
        frame_claim["projection_lane"] = lane["label"] if lane else "projection-lane"
    if claim_type == "runtime-realization":
        phase = first_geometry_by_type(geometry_matches, "RuntimePhase")
        frame_claim["runtime_phase"] = phase["label"] if phase else "runtime-realization"
    if claim_type == "resource-provider":
        frame_claim["resource"] = "resource-contract"
        frame_claim["provider"] = "provider-boundary"
    if claim_type == "forbidden-risk":
        frame_claim["risk_patterns"] = resolved_ids or [item["id"] for item in geometry_matches if item.get("type") == "ForbiddenPattern"]
    if claim_type == "verification":
        frame_claim["required_gates"] = resolved_ids or ["review-required"]
    if evaluate:
        comparison = selected_comparison_for_claim(claim, semantic_compare, geometry_matches)
        frame_claim["verdict"] = comparison["verdict"]
        frame_claim["review_action"] = comparison["review_action"]
        frame_claim["review_state"] = review_state_for_verdict(comparison["verdict"])
        if comparison.get("issue"):
            frame_claim["issue"] = comparison["issue"]
        if comparison.get("resolution_hint"):
            frame_claim["resolution_hint"] = comparison["resolution_hint"]
    return frame_claim


def no_evidence_claim(document: Path, evidence: dict[str, Any] | None = None) -> dict[str, Any]:
    source_path = display_path(document)
    llm = (evidence or {}).get("semantica_llm") or {}
    requested_mode = (evidence or {}).get("extraction_mode", {}).get("requested")
    extraction_method = "semantica-llm-pilot" if requested_mode == "semantica-llm" else "rawr-deterministic-oracle"
    blocked_reason = llm.get("status", {}).get("blocked_reason")
    issue = "The document did not produce source-backed architecture claims."
    if blocked_reason:
        issue = f"The requested semantica LLM extraction was blocked ({blocked_reason}) and no source-backed architecture claims were produced."
    return {
        "id": stable_id("frame-claim", source_path, "no-evidence"),
        "claim_type": "support-matter",
        "subject": "No extracted architecture claim",
        "predicate": "requires_review",
        "object": "source evidence",
        "polarity": "unknown",
        "modality": "unknown",
        "assertion_scope": "unknown",
        "authority_context": "comparison-document",
        "mapping_state": "unresolved",
        "evidence_refs": [
            {
                "id": stable_id("evidence-ref", source_path, "no-evidence"),
                "source_path": source_path,
                "heading_path": ["Document"],
                "context": "Document",
                "line_start": 1,
                "line_end": 1,
                "char_start": 0,
                "char_end": 0,
                "char_span_kind": "line-offset",
                "text": "No extracted architecture claim.",
                "extraction_method": extraction_method,
                "confidence": 0,
                "review_state": "review-needed",
                "promotion_allowed": False,
            }
        ],
        "confidence": 0,
        "review_state": "review-needed",
        "verdict": "unclear",
        "review_action": "needs-evidence",
        "issue": issue,
        "resolution_hint": "Add explicit architecture proposal claims with source evidence before comparison.",
        "promotion_allowed": False,
    }


def evidence_ref_from_claim(claim: dict[str, Any]) -> dict[str, Any]:
    text = claim.get("text", "")
    return {
        "id": claim["id"],
        "source_path": claim["source_path"],
        "heading_path": claim.get("heading_path", []) or ["Document"],
        "context": " / ".join(claim.get("heading_path", []) or ["Document"]),
        "line_start": claim["line_start"],
        "line_end": claim["line_end"],
        "char_start": int(claim.get("char_start", 0) or 0),
        "char_end": int(claim.get("char_end", len(text)) or len(text)),
        "char_span_kind": claim.get("char_span_kind") or "line-offset",
        "text": text,
        "extraction_method": extraction_method_for_claim(claim),
        "confidence": bounded_confidence(claim.get("confidence", 0.5)),
        "review_state": "evidence-only",
        "promotion_allowed": False,
    }


def frame_noun_mapping_from_claim(claim: dict[str, Any], reference_geometry: dict[str, Any]) -> dict[str, Any]:
    proposed_noun = claim.get("subject") or claim.get("object") or claim["id"]
    mapping_state = claim.get("mapping_state") or "unresolved"
    mapping = {
        "id": stable_id("noun-mapping", claim["id"], proposed_noun, mapping_state),
        "proposed_noun": proposed_noun,
        "mapping_state": mapping_state,
        "evidence_refs": claim.get("evidence_refs", []),
        "confidence": bounded_confidence(claim.get("confidence", 0.5)),
        "review_state": "candidate" if mapping_state == "candidate" else "evidence-only" if mapping_state in {"resolved", "extension-slot"} else "review-needed",
        "promotion_allowed": False,
    }
    resolved_ids = claim.get("resolved_entity_ids") or []
    if resolved_ids:
        mapping["maps_to_entity_id"] = resolved_ids[0]
    if claim.get("maps_to_kind"):
        mapping["maps_to_kind"] = claim["maps_to_kind"]
    if claim.get("maps_to_extension_slot"):
        mapping["maps_to_extension_slot"] = claim["maps_to_extension_slot"]
    if mapping_state == "extension-slot" and "maps_to_extension_slot" not in mapping:
        geometry_matches = reference_geometry_matches(proposed_noun, reference_geometry)
        slot = first_geometry_by_type(geometry_matches, "ExtensionSlot")
        if slot:
            mapping["maps_to_extension_slot"] = slot["id"]
    return mapping


def build_noun_mapping_payload(frame: dict[str, Any], reference_geometry: dict[str, Any]) -> dict[str, Any]:
    mappings = frame.get("noun_mappings", [])
    categories = Counter(noun_mapping_category(mapping) for mapping in mappings)
    return {
        "schema_version": NOUN_MAPPING_SCHEMA_VERSION,
        "frame_id": frame["frame_id"],
        "document": frame["document"]["source_path"],
        "reference_geometry": reference_geometry_brief(reference_geometry),
        "summary": {
            "mapping_count": len(mappings),
            "categories": dict(categories),
            "promotion_allowed": False,
        },
        "mappings": [
            {
                **mapping,
                "mapping_category": noun_mapping_category(mapping),
                "source_authority": "rawr-reviewed-ontology"
                if mapping.get("mapping_state") in {"resolved", "candidate", "rejected"}
                else "reference-geometry-comparison-only"
                if mapping.get("mapping_state") == "extension-slot"
                else "unresolved",
            }
            for mapping in mappings
        ],
    }


def build_claim_comparison_payload(
    frame: dict[str, Any],
    semantic_compare: dict[str, Any],
    reference_geometry: dict[str, Any],
) -> dict[str, Any]:
    findings_by_claim = group_findings_by_claim(semantic_compare)
    comparisons = []
    for claim in frame.get("claims", []):
        evidence_ref = claim["evidence_refs"][0]
        source_claim_id = evidence_ref["id"]
        findings = findings_by_claim.get(source_claim_id, [])
        geometry_matches = reference_geometry_matches(evidence_ref.get("text", ""), reference_geometry)
        comparison = selected_comparison_for_frame_claim(claim, findings, geometry_matches)
        comparisons.append(comparison)
    summary = Counter(item["verdict"] for item in comparisons)
    return {
        "schema_version": CLAIM_COMPARISON_SCHEMA_VERSION,
        "frame_id": frame["frame_id"],
        "document": frame["document"]["source_path"],
        "reference_geometry": reference_geometry_brief(reference_geometry),
        "summary": {
            "claim_count": len(comparisons),
            "verdicts": dict(summary),
            "decision_source": "rawr-deterministic-policy-v1",
            "semantica_output_authoritative": False,
            "promotion_allowed": False,
        },
        "comparisons": comparisons,
    }


def selected_comparison_for_claim(
    claim: dict[str, Any],
    semantic_compare: dict[str, Any],
    geometry_matches: list[dict[str, Any]],
) -> dict[str, Any]:
    findings = group_findings_by_claim(semantic_compare).get(claim["id"], [])
    pseudo_frame_claim = {
        "id": stable_id("frame-claim", claim["id"]),
        "claim_type": infer_frame_claim_type(claim, geometry_matches),
        "evidence_refs": [evidence_ref_from_claim(claim)],
        "confidence": bounded_confidence(claim.get("confidence", 0.5)),
        "polarity": claim.get("polarity"),
        "modality": claim.get("modality"),
        "assertion_scope": claim.get("assertion_scope"),
    }
    return selected_comparison_for_frame_claim(pseudo_frame_claim, findings, geometry_matches)


def selected_comparison_for_frame_claim(
    frame_claim: dict[str, Any],
    findings: list[dict[str, Any]],
    geometry_matches: list[dict[str, Any]],
) -> dict[str, Any]:
    verdict, action = verdict_action_for_findings(frame_claim, findings, geometry_matches)
    rule_results = [
        {
            "finding_id": item["id"],
            "finding_kind": item["kind"],
            "rule": item.get("rule"),
            "reason": item.get("reason"),
            "decision_grade": item.get("decision_grade"),
            "review_action": item.get("review_action"),
        }
        for item in findings
    ]
    evidence_ref = frame_claim["evidence_refs"][0]
    resolved_targets = [
        {
            "entity_id": item.get("entity_id"),
            "label": item.get("label"),
            "kind": item.get("kind"),
        }
        for item in findings
        if item.get("entity_id")
    ]
    comparison = {
        "id": stable_id("claim-comparison", frame_claim["id"], verdict, action),
        "claim_id": frame_claim["id"],
        "source_evidence_id": evidence_ref["id"],
        "claim_type": frame_claim["claim_type"],
        "verdict": verdict,
        "review_action": action,
        "confidence": bounded_confidence(frame_claim.get("confidence", 0.5)),
        "review_state": review_state_for_verdict(verdict),
        "source_claim": {
            "document_path": evidence_ref["source_path"],
            "line_start": evidence_ref["line_start"],
            "line_end": evidence_ref["line_end"],
            "text": evidence_ref["text"],
        },
        "resolved_targets": resolved_targets,
        "reference_geometry_matches": [
            {
                "id": item["id"],
                "label": item.get("label"),
                "type": item.get("type"),
            }
            for item in geometry_matches[:5]
        ],
        "authority_context": {
            "source": "rawr-reviewed-ontology",
            "reference_geometry": "comparison-only" if geometry_matches else "not-used",
            "polarity": frame_claim.get("polarity"),
            "modality": frame_claim.get("modality"),
            "assertion_scope": frame_claim.get("assertion_scope"),
        },
        "rule_results": rule_results or [
            {
                "finding_kind": "none",
                "rule": "reference_geometry_or_unresolved_frame_claim",
                "reason": "No RAWR semantic finding resolved for this frame claim.",
                "decision_grade": False,
                "review_action": action,
            }
        ],
        "explanation_chain_complete": bool(findings or geometry_matches or verdict == "unclear"),
        "issue": issue_for_verdict(verdict, findings),
        "resolution_hint": repair_hint_for_verdict(verdict, findings, frame_claim),
        "promotion_allowed": False,
    }
    return comparison


def apply_claim_comparisons_to_frame(frame: dict[str, Any], claim_comparisons: dict[str, Any]) -> None:
    by_claim = {item["claim_id"]: item for item in claim_comparisons.get("comparisons", [])}
    for claim in frame.get("claims", []):
        comparison = by_claim.get(claim["id"])
        if not comparison:
            continue
        claim["verdict"] = comparison["verdict"]
        claim["review_action"] = comparison["review_action"]
        claim["review_state"] = comparison["review_state"]
        if comparison.get("issue"):
            claim["issue"] = comparison["issue"]
        if comparison.get("resolution_hint"):
            claim["resolution_hint"] = comparison["resolution_hint"]


def build_verdict_repair_payload(frame: dict[str, Any], claim_comparisons: dict[str, Any]) -> dict[str, Any]:
    comparisons = claim_comparisons.get("comparisons", [])
    overall_verdict = aggregate_verdict([item["verdict"] for item in comparisons])
    recommended_action = action_for_overall_verdict(overall_verdict)
    repair_steps = [
        repair_step(item, index)
        for index, item in enumerate(comparisons, start=1)
        if item["verdict"] in {"conflicts", "needs-canonical-addendum", "unclear", "compatible-extension"}
    ]
    return {
        "schema_version": VERDICT_REPAIR_SCHEMA_VERSION,
        "frame_id": frame["frame_id"],
        "document": frame["document"]["source_path"],
        "ruleset": "rawr-architecture-frame-deterministic-v1",
        "overall_verdict": overall_verdict,
        "recommended_next_action": recommended_action,
        "summary": {
            "claim_count": len(comparisons),
            "repair_step_count": len(repair_steps),
            "verdicts": dict(Counter(item["verdict"] for item in comparisons)),
            "explanation_chain_complete": all(item.get("explanation_chain_complete") for item in comparisons) if comparisons else False,
            "semantica_output_authoritative": False,
            "promotion_allowed": False,
        },
        "repair_steps": repair_steps,
    }


def repair_step(comparison: dict[str, Any], index: int) -> dict[str, Any]:
    return {
        "id": f"repair-{index}",
        "claim_id": comparison["claim_id"],
        "source_claim": comparison["source_claim"],
        "resolved_targets": comparison.get("resolved_targets", []),
        "reference_geometry_matches": comparison.get("reference_geometry_matches", []),
        "verdict": comparison["verdict"],
        "review_action": comparison["review_action"],
        "repair_hint": comparison.get("resolution_hint"),
        "rule_results": comparison.get("rule_results", []),
        "promotion_allowed": False,
    }


def build_provenance_payload(
    frame: dict[str, Any],
    evidence: dict[str, Any],
    semantic_compare: dict[str, Any],
    reference_geometry: dict[str, Any],
    validation: dict[str, Any],
    *,
    evaluate: bool,
    semantica_pilot_enabled: bool,
) -> dict[str, Any]:
    return {
        "schema_version": FRAME_PROVENANCE_SCHEMA_VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "git_sha": git_sha(),
        "frame_id": frame["frame_id"],
        "document": frame["document"],
        "mode": "proposal-compare" if evaluate else "frame",
        "semantica_pilot_enabled": semantica_pilot_enabled,
        "evidence_source": {
            "schema_version": evidence.get("schema_version"),
            "claim_count": len(evidence.get("claims", [])),
            "decision_grade_source": evidence.get("semantica_pilot", {}).get("summary", {}).get("decision_grade_source", "rawr-semantic-heuristic-v1"),
        },
        "comparison_source": {
            "schema_version": semantic_compare.get("schema_version"),
            "finding_count": len(semantic_compare.get("findings", [])),
            "decision_grade_finding_count": semantic_compare.get("summary", {}).get("decision_grade_finding_count"),
        },
        "reference_geometry": reference_geometry_brief(reference_geometry),
        "validation": {
            "valid": validation.get("valid"),
            "error_count": validation.get("summary", {}).get("error_count"),
            "warning_count": validation.get("summary", {}).get("warning_count"),
            "json_schema_validator": validation.get("json_schema_validator"),
        },
        "authority_policy": {
            "truth_authority": "rawr-reviewed-ontology",
            "semantica_output_authoritative": False,
            "reference_geometry_status": frame["governance"]["reference_geometry_status"],
            "promotion_allowed": False,
        },
    }


def validate_architecture_change_frame(frame: dict[str, Any]) -> dict[str, Any]:
    errors = validate_frame_contract_shape(frame)
    errors.extend(validate_frame_policy_shape(frame))
    warnings: list[dict[str, Any]] = []
    json_schema_validator = "unavailable"
    try:
        import jsonschema  # type: ignore

        jsonschema.validate(frame, load_architecture_change_frame_schema())
        json_schema_validator = "jsonschema"
    except ImportError:
        warnings.append(
            {
                "kind": "jsonschema_dependency_unavailable",
                "message": "Manual frame contract validation was used because jsonschema is not installed.",
            }
        )
    except Exception as exc:
        json_schema_validator = "jsonschema"
        errors.append({"kind": "json_schema_validation_failed", "path": "$", "error": str(exc)})
    return {
        "schema_version": FRAME_VALIDATION_SCHEMA_VERSION,
        "frame_schema_version": frame.get("schema_version"),
        "valid": not errors,
        "json_schema_validator": json_schema_validator,
        "summary": {
            "claim_count": len(frame.get("claims", [])),
            "noun_mapping_count": len(frame.get("noun_mappings", [])),
            "error_count": len(errors),
            "warning_count": len(warnings),
            "promotion_allowed": False,
        },
        "errors": errors,
        "warnings": warnings,
    }


def validate_frame_contract_shape(frame: dict[str, Any]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    schema = load_architecture_change_frame_schema()
    required = schema.get("required", [])
    for field in required:
        if field not in frame:
            errors.append({"kind": "frame_missing_required_field", "path": field})
    if not frame.get("claims"):
        errors.append({"kind": "frame_missing_claims", "path": "claims"})
    for index, claim in enumerate(frame.get("claims") or []):
        for field in schema["$defs"]["claim"]["required"]:
            if field not in claim:
                errors.append({"kind": "claim_missing_required_field", "path": f"claims[{index}].{field}"})
        errors.extend(_validate_enum_fields(claim, f"claims[{index}]", schema, CLAIM_ENUM_FIELDS))
    for index, mapping in enumerate(frame.get("noun_mappings") or []):
        for field in schema["$defs"]["noun_mapping"]["required"]:
            if field not in mapping:
                errors.append({"kind": "noun_mapping_missing_required_field", "path": f"noun_mappings[{index}].{field}"})
        errors.extend(_validate_enum_fields(mapping, f"noun_mappings[{index}]", schema, {"mapping_state": "mapping_state", "review_state": "review_state"}))
    return errors


def _validate_enum_fields(item: dict[str, Any], path: str, schema: dict[str, Any], fields: dict[str, str]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    for field, definition_name in fields.items():
        if field not in item:
            continue
        allowed = schema["$defs"][definition_name].get("enum")
        if allowed and item.get(field) not in allowed:
            errors.append({"kind": f"{field}_invalid_enum", "path": f"{path}.{field}", "value": item.get(field), "allowed": allowed})
    return errors


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
        for index, claim in enumerate(frame.get("claims") or []):
            if claim.get("verdict") != "not-evaluated":
                errors.append({"kind": "extraction_only_claim_has_verdict", "path": f"claims[{index}].verdict"})
            if claim.get("review_action") != "none":
                errors.append({"kind": "extraction_only_claim_has_review_action", "path": f"claims[{index}].review_action"})

    if governance.get("reference_geometry_status") == "candidate-input":
        errors.append(
            {
                "kind": "reference_geometry_candidate_input_not_allowed",
                "path": "governance.reference_geometry_status",
                "expected": "comparison-only or not-used",
            }
        )

    for collection_name in ["claims", "noun_mappings"]:
        for index, item in enumerate(frame.get(collection_name) or []):
            if item.get("promotion_allowed") is not False:
                errors.append({"kind": "frame_item_promotion_allowed", "path": f"{collection_name}[{index}].promotion_allowed"})
            if item.get("review_state") == "accepted":
                errors.append({"kind": "machine_frame_review_state_accepted", "path": f"{collection_name}[{index}].review_state"})
            evidence_refs = item.get("evidence_refs") or []
            if not evidence_refs:
                errors.append({"kind": "missing_structured_evidence_ref", "path": f"{collection_name}[{index}].evidence_refs"})
                continue
            for evidence_index, evidence_ref in enumerate(evidence_refs):
                errors.extend(_validate_evidence_ref(evidence_ref, f"{collection_name}[{index}].evidence_refs[{evidence_index}]"))

    return errors


def _validate_evidence_ref(evidence_ref: dict[str, Any], path: str) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    schema = load_architecture_change_frame_schema()
    missing = sorted(REQUIRED_EVIDENCE_REF_FIELDS - set(evidence_ref))
    if missing:
        errors.append({"kind": "evidence_ref_missing_required_fields", "path": path, "missing": missing})
    errors.extend(
        _validate_enum_fields(
            evidence_ref,
            path,
            schema,
            {"review_state": "review_state"},
        )
    )
    extraction_methods = schema["$defs"]["evidence_ref"]["properties"]["extraction_method"].get("enum", [])
    if evidence_ref.get("extraction_method") not in extraction_methods:
        errors.append(
            {
                "kind": "evidence_ref_extraction_method_invalid_enum",
                "path": f"{path}.extraction_method",
                "value": evidence_ref.get("extraction_method"),
                "allowed": extraction_methods,
            }
        )
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
    source_path = evidence_ref.get("source_path")
    if isinstance(source_path, str) and isinstance(line_start, int) and isinstance(line_end, int) and isinstance(char_start, int) and isinstance(char_end, int):
        is_no_evidence_sentinel = evidence_ref.get("text") == "No extracted architecture claim." and char_start == 0 and char_end == 0
        if char_start == char_end and evidence_ref.get("text") and not is_no_evidence_sentinel:
            errors.append({"kind": "evidence_ref_zero_length_nonempty_text", "path": path})
        source_file = source_ref_to_path(source_path)
        if not source_file.exists():
            errors.append({"kind": "evidence_ref_source_missing", "path": f"{path}.source_path", "source_path": source_path})
        elif not is_no_evidence_sentinel:
            span_text = span_text_for_ref(source_path, line_start, line_end, char_start, char_end)
            if span_text is None:
                errors.append({"kind": "evidence_ref_source_span_unmapped", "path": path})
            elif span_text != evidence_ref.get("text"):
                errors.append({"kind": "evidence_ref_source_span_text_mismatch", "path": f"{path}.text"})
    return errors


def load_reference_geometry(reference_bundle: Path | None = None) -> dict[str, Any]:
    bundle = resolve_reference_bundle(reference_bundle)
    if bundle is None:
        return {
            "schema_version": REFERENCE_GEOMETRY_SCHEMA_VERSION,
            "loaded": False,
            "status": "not-provided",
            "path": None,
            "sha256": None,
            "version": None,
            "files": [],
            "entities": [],
            "summary": {"entity_count": 0, "type_counts": {}},
        }
    data = bundle.read_bytes()
    files: list[dict[str, Any]] = []
    ttl_payloads: list[str] = []
    version = None
    with zipfile.ZipFile(bundle) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            payload = archive.read(info.filename)
            files.append(
                {
                    "path": info.filename,
                    "size": info.file_size,
                    "sha256": hashlib.sha256(payload).hexdigest(),
                }
            )
            if info.filename.endswith(".ttl") and ("geometry" in info.filename or "rule-pack" in info.filename):
                ttl_payloads.append(payload.decode("utf-8"))
            if info.filename.endswith("README.md"):
                readme = payload.decode("utf-8", errors="replace")
                match = re.search(r"v(\d+(?:\.\d+)+)", readme)
                if match:
                    version = match.group(0)
    entities = parse_reference_geometry_turtle("\n".join(ttl_payloads))
    type_counts = Counter(item["type"] for item in entities)
    return {
        "schema_version": REFERENCE_GEOMETRY_SCHEMA_VERSION,
        "loaded": True,
        "status": "comparison-only",
        "path": display_path(bundle),
        "sha256": hashlib.sha256(data).hexdigest(),
        "version": version or "unknown",
        "files": sorted(files, key=lambda item: item["path"]),
        "entities": entities,
        "summary": {
            "entity_count": len(entities),
            "type_counts": dict(type_counts),
        },
    }


def resolve_reference_bundle(reference_bundle: Path | None) -> Path | None:
    candidates = [reference_bundle] if reference_bundle else DEFAULT_REFERENCE_BUNDLE_CANDIDATES
    for candidate in candidates:
        if candidate and candidate.exists() and candidate.is_file():
            return candidate
    return None


def parse_reference_geometry_turtle(payload: str) -> list[dict[str, Any]]:
    if not payload.strip():
        return []
    try:
        from rdflib import Graph, Namespace, RDF

        graph = Graph()
        graph.parse(data=payload, format="turtle")
        skos = Namespace("http://www.w3.org/2004/02/skos/core#")
        dct = Namespace("http://purl.org/dc/terms/")
        rg = Namespace("https://rawr.dev/ontology/reference-geometry#")
        rows = []
        for subject, _, object_ in graph.triples((None, RDF.type, None)):
            type_name = local_name(str(object_))
            if type_name not in GEOMETRY_TYPES:
                continue
            label = first_literal(graph, subject, skos.prefLabel) or local_name(str(subject))
            description = first_literal(graph, subject, dct.description)
            row = {
                "id": local_name(str(subject)),
                "iri": str(subject),
                "label": label,
                "type": type_name,
                "description": description,
            }
            for predicate_name in ["kindFamily", "pathPattern", "status", "rootPath"]:
                value = first_literal(graph, subject, getattr(rg, predicate_name))
                if value is not None:
                    row[predicate_name] = value
            rows.append(row)
        return sorted(unique_geometry_rows(rows), key=lambda item: (item["type"], item["id"]))
    except Exception:
        return parse_reference_geometry_turtle_fallback(payload)


def parse_reference_geometry_turtle_fallback(payload: str) -> list[dict[str, Any]]:
    rows = []
    for match in re.finditer(r"rawr:([A-Za-z0-9_]+)\s+a\s+rg:([A-Za-z0-9_]+)\s*;(.*?)(?:\n\n|\Z)", payload, re.S):
        type_name = match.group(2)
        if type_name not in GEOMETRY_TYPES:
            continue
        body = match.group(3)
        label_match = re.search(r'skos:prefLabel\s+"([^"]+)"', body)
        description_match = re.search(r'dct:description\s+"([^"]+)"', body)
        rows.append(
            {
                "id": match.group(1),
                "iri": f"https://rawr.dev/ontology/instances#{match.group(1)}",
                "label": label_match.group(1) if label_match else match.group(1),
                "type": type_name,
                "description": description_match.group(1) if description_match else None,
            }
        )
    return sorted(unique_geometry_rows(rows), key=lambda item: (item["type"], item["id"]))


def unique_geometry_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    result = []
    for row in rows:
        if row["id"] in seen:
            continue
        seen.add(row["id"])
        result.append(row)
    return result


def first_literal(graph: Any, subject: Any, predicate: Any) -> str | None:
    for value in graph.objects(subject, predicate):
        return str(value)
    return None


def local_name(value: str) -> str:
    value = value.rstrip("/")
    if "#" in value:
        return value.rsplit("#", 1)[-1]
    return value.rsplit("/", 1)[-1]


def reference_geometry_matches(text: str, reference_geometry: dict[str, Any]) -> list[dict[str, Any]]:
    if not reference_geometry.get("loaded"):
        return []
    normalized = normalize_text(text)
    matches = []
    for item in reference_geometry.get("entities", []):
        terms = [item.get("label"), item.get("id"), item.get("description"), item.get("pathPattern")]
        if any(term and term_in_line(normalize_text(str(term)), normalized) for term in terms):
            matches.append(item)
    return unique_geometry_rows(matches)


def reference_geometry_brief(reference_geometry: dict[str, Any]) -> dict[str, Any]:
    return {
        "loaded": reference_geometry.get("loaded", False),
        "status": reference_geometry.get("status"),
        "path": reference_geometry.get("path"),
        "sha256": reference_geometry.get("sha256"),
        "version": reference_geometry.get("version"),
        "summary": reference_geometry.get("summary", {}),
    }


def proposal_graph_turtle(
    frame: dict[str, Any],
    noun_mappings: dict[str, Any],
    claim_comparisons: dict[str, Any],
    verdict_repair: dict[str, Any],
    reference_geometry: dict[str, Any],
) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix proposal: <https://rawr.dev/proposal/> .",
        "@prefix evidence: <https://rawr.dev/evidence/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    frame_node = iri_fragment(frame["frame_id"])
    lines.append(f"proposal:{frame_node} a rawr:ArchitectureChangeFrame ;")
    lines.append(f"  rdfs:label {turtle_literal(frame['proposal_summary'])} ;")
    lines.append(f"  rawr:document {turtle_literal(frame['document']['source_path'])} ;")
    lines.append(f"  rawr:overallVerdict {turtle_literal(verdict_repair['overall_verdict'])} ;")
    lines.append(f"  rawr:referenceGeometryStatus {turtle_literal(frame['governance']['reference_geometry_status'])} .")
    lines.append("")
    for claim in frame.get("claims", []):
        claim_node = iri_fragment(claim["id"])
        lines.append(f"proposal:{claim_node} a rawr:ArchitectureChangeClaim ;")
        lines.append(f"  rawr:partOf proposal:{frame_node} ;")
        lines.append(f"  rdfs:label {turtle_literal(claim['subject'])} ;")
        lines.append(f"  rawr:claimType {turtle_literal(claim['claim_type'])} ;")
        lines.append(f"  rawr:verdict {turtle_literal(claim['verdict'])} ;")
        lines.append(f"  rawr:reviewAction {turtle_literal(claim['review_action'])} ;")
        evidence_ref = claim["evidence_refs"][0]
        lines.append(f"  rawr:derivedFrom evidence:{iri_fragment(evidence_ref['id'])} .")
        lines.append("")
    for mapping in noun_mappings.get("mappings", []):
        mapping_node = iri_fragment(mapping["id"])
        lines.append(f"proposal:{mapping_node} a rawr:NounMapping ;")
        lines.append(f"  rawr:partOf proposal:{frame_node} ;")
        lines.append(f"  rdfs:label {turtle_literal(mapping['proposed_noun'])} ;")
        lines.append(f"  rawr:mappingState {turtle_literal(mapping['mapping_state'])} ;")
        lines.append(f"  rawr:mappingCategory {turtle_literal(mapping['mapping_category'])} .")
        lines.append("")
    for comparison in claim_comparisons.get("comparisons", []):
        comparison_node = iri_fragment(comparison["id"])
        lines.append(f"proposal:{comparison_node} a rawr:ClaimComparison ;")
        lines.append(f"  rawr:partOf proposal:{frame_node} ;")
        lines.append(f"  rawr:comparesClaim proposal:{iri_fragment(comparison['claim_id'])} ;")
        lines.append(f"  rawr:verdict {turtle_literal(comparison['verdict'])} ;")
        lines.append(f"  rawr:reviewAction {turtle_literal(comparison['review_action'])} .")
        lines.append("")
    if reference_geometry.get("loaded"):
        lines.append(f"proposal:{frame_node} rawr:usesReferenceGeometryHash {turtle_literal(reference_geometry.get('sha256'))} .")
        lines.append("")
    return "\n".join(lines)


def render_proposal_review_report(
    frame: dict[str, Any],
    noun_mappings: dict[str, Any],
    claim_comparisons: dict[str, Any],
    verdict_repair: dict[str, Any],
    validation: dict[str, Any],
    reference_geometry: dict[str, Any],
) -> str:
    lines = [
        "# Architecture Proposal Review Report",
        "",
        f"- Document: `{frame['document']['source_path']}`",
        f"- Frame: `{frame['frame_id']}`",
        f"- Overall verdict: `{verdict_repair['overall_verdict']}`",
        f"- Recommended action: `{verdict_repair['recommended_next_action']}`",
        f"- Frame valid: `{validation['valid']}`",
        f"- Reference geometry: `{reference_geometry.get('status')}`",
        f"- Reference geometry hash: `{reference_geometry.get('sha256') or 'not-loaded'}`",
        f"- Extraction method: `{frame['extraction']['method']}`",
        f"- Extraction status: `{frame['extraction']['status']}`",
        f"- LLM provider status: `{frame['extraction']['llm_provider_status']}`",
        f"- LLM model: `{frame['extraction'].get('model') or 'not-used'}`",
        f"- semantica output authoritative: `{frame['governance']['semantica_output_authoritative']}`",
        f"- Promotion allowed: `{frame['governance']['promotion_allowed']}`",
        "",
        "## Verdict Summary",
        "",
    ]
    verdict_counts = claim_comparisons.get("summary", {}).get("verdicts", {})
    for verdict in ["conflicts", "needs-canonical-addendum", "unclear", "compatible-extension", "compatible", "not-evaluated"]:
        lines.append(f"- `{verdict}`: `{verdict_counts.get(verdict, 0)}`")
    llm_diagnostics = [item for item in frame.get("extraction", {}).get("diagnostics", []) if item.get("kind") == "semantica_llm"]
    if llm_diagnostics:
        lines.extend(["", "## LLM Extraction Status", ""])
        for item in llm_diagnostics:
            lines.append(
                f"- requested=`{item.get('requested_mode')}` actual=`{item.get('actual_mode')}` "
                f"provider=`{item.get('provider')}` model=`{item.get('model') or 'not-set'}` "
                f"blocked=`{item.get('blocked_reason') or 'none'}` "
                f"claims=`{item.get('evidence_claim_count', 0)}`"
            )
    lines.extend(
        [
            "",
            "## Review Queue",
            "",
        ]
    )
    review_queue = [
        item
        for item in claim_comparisons.get("comparisons", [])
        if item.get("review_action") not in {"none", "accept"} or item.get("verdict") in {"conflicts", "needs-canonical-addendum", "unclear"}
    ]
    append_claim_comparison_examples(lines, review_queue, limit=75)
    lines.extend(
        [
            "",
            "## Claim Verdicts",
            "",
        ]
    )
    for verdict in ["conflicts", "needs-canonical-addendum", "unclear", "compatible-extension", "compatible", "not-evaluated"]:
        group = [item for item in claim_comparisons.get("comparisons", []) if item.get("verdict") == verdict]
        if not group:
            continue
        lines.extend(["", f"### {verdict}", ""])
        append_claim_comparison_examples(lines, group, limit=50)
    lines.extend(["", "## Noun Mappings", ""])
    for mapping in noun_mappings.get("mappings", []):
        target = mapping.get("maps_to_entity_id") or mapping.get("maps_to_extension_slot") or mapping.get("maps_to_kind") or "unresolved"
        lines.append(f"- `{mapping['mapping_category']}` `{mapping['proposed_noun']}` -> `{target}`")
    lines.extend(["", "## Repair Steps", ""])
    if not verdict_repair.get("repair_steps"):
        lines.append("None.")
    for step in verdict_repair.get("repair_steps", []):
        source = step["source_claim"]
        lines.append(
            f"- `{step['id']}` `{step['verdict']}` {source['document_path']}:{source['line_start']}: "
            f"{step.get('repair_hint') or 'Review source claim.'}"
        )
    if validation.get("errors"):
        lines.extend(["", "## Validation Errors", ""])
        for error in validation["errors"]:
            lines.append(f"- `{error.get('kind')}` at `{error.get('path')}`")
    lines.extend(
        [
            "",
            "## Authority Boundary",
            "",
            "This report is a review artifact. RAWR reviewed ontology remains truth authority; semantica, LLM, frame, and reference-geometry outputs remain evidence until human-governed promotion.",
        ]
    )
    return "\n".join(lines) + "\n"


def append_claim_comparison_examples(lines: list[str], comparisons: list[dict[str, Any]], *, limit: int) -> None:
    if not comparisons:
        lines.append("None.")
        return
    for item in comparisons[:limit]:
        source = item["source_claim"]
        lines.append(
            f"- `{item['verdict']}` / `{item['review_action']}` "
            f"{source['document_path']}:{source['line_start']}: {source['text']}"
        )
        if item.get("resolution_hint"):
            lines.append(f"  - Repair: {item['resolution_hint']}")
    if len(comparisons) > limit:
        lines.append(f"- ... {len(comparisons) - limit} more omitted from this summary; see `claim-comparisons.json` in the run output.")


def group_findings_by_claim(semantic_compare: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for finding in semantic_compare.get("findings", []):
        grouped.setdefault(finding["claim_id"], []).append(finding)
    return grouped


def verdict_action_for_findings(
    frame_claim: dict[str, Any],
    findings: list[dict[str, Any]],
    geometry_matches: list[dict[str, Any]],
) -> tuple[str, str]:
    kinds = {item.get("kind") for item in findings}
    if "conflict" in kinds or "deprecated-use" in kinds:
        return "conflicts", "reject"
    if "candidate-new" in kinds:
        return "needs-canonical-addendum", "write-canonical-addendum"
    if (
        first_geometry_by_type(geometry_matches, "ExtensionSlot")
        and findings
        and all(item.get("kind") == "ambiguous" and item.get("rule") == "no_resolved_decision_target" for item in findings)
    ):
        return "compatible-extension", "accept-with-mapping"
    if "ambiguous" in kinds:
        if any(item.get("ambiguity_bucket") == "unresolved-target" for item in findings):
            return "unclear", "needs-evidence"
        return "unclear", "needs-human-review"
    if not findings and frame_claim.get("mapping_state") == "extension-slot":
        return "compatible-extension", "accept-with-mapping"
    if geometry_matches and frame_claim.get("claim_type") in {"projection", "resource-provider", "runtime-realization"}:
        return "compatible-extension", "accept-with-mapping"
    if "aligned" in kinds:
        return "compatible", "accept"
    if "informational" in kinds or "outside-scope" in kinds:
        return "unclear", "none"
    return "unclear", "needs-evidence"


def aggregate_verdict(verdicts: list[str]) -> str:
    if not verdicts:
        return "unclear"
    return sorted(verdicts, key=lambda verdict: CLAIM_VERDICT_PRIORITY.get(verdict, 99))[0]


def action_for_overall_verdict(verdict: str) -> str:
    return {
        "compatible": "accept",
        "compatible-extension": "accept-with-mapping",
        "needs-canonical-addendum": "write-canonical-addendum",
        "conflicts": "decompose",
        "unclear": "needs-human-review",
        "not-evaluated": "none",
    }.get(verdict, "needs-human-review")


def repair_hint_for_verdict(verdict: str, findings: list[dict[str, Any]], frame_claim: dict[str, Any]) -> str:
    if verdict == "conflicts":
        targets = ", ".join(sorted({item.get("entity_id") or item.get("label") or "target" for item in findings}))
        return f"Rewrite or remove the claim that conflicts with RAWR authority ({targets}). Use canonical replacement guidance before treating it as target architecture."
    if verdict == "needs-canonical-addendum":
        return "Review the candidate concept and write a canonical addendum only if source authority, owner, operational consequence, and promotion gate are accepted."
    if verdict == "compatible-extension":
        return "Keep the source-backed mapping and attach the proposal under the comparison extension path; do not promote new ontology truth automatically."
    if verdict == "unclear":
        return "Clarify polarity, scope, target mapping, or source evidence before using this claim for an architecture decision."
    return "No repair required."


def issue_for_verdict(verdict: str, findings: list[dict[str, Any]]) -> str | None:
    if verdict in {"compatible", "compatible-extension"}:
        return None
    if findings:
        return findings[0].get("reason")
    if verdict == "needs-canonical-addendum":
        return "The claim introduces an in-scope concept that is not reviewed ontology truth."
    if verdict == "unclear":
        return "The claim did not resolve to enough decision-grade evidence."
    if verdict == "conflicts":
        return "The claim conflicts with RAWR-reviewed authority."
    return None


def review_state_for_verdict(verdict: str) -> str:
    return {
        "compatible": "evidence-only",
        "compatible-extension": "candidate",
        "needs-canonical-addendum": "candidate",
        "conflicts": "review-needed",
        "unclear": "review-needed",
        "not-evaluated": "evidence-only",
    }.get(verdict, "review-needed")


def noun_mapping_category(mapping: dict[str, Any]) -> str:
    return {
        "resolved": "accepted",
        "candidate": "candidate",
        "unresolved": "unclear",
        "rejected": "rejected",
        "extension-slot": "external-reference-geometry-only",
    }.get(mapping.get("mapping_state"), "unclear")


def mapping_state_for_claim(claim: dict[str, Any], geometry_matches: list[dict[str, Any]]) -> str:
    resolved = claim.get("resolved_ids", {})
    if resolved.get("prohibited_patterns") or resolved.get("deprecated_terms"):
        return "rejected"
    if resolved.get("candidates"):
        return "candidate"
    if resolved.get("canonical") or resolved.get("verification_policy"):
        return "resolved"
    if geometry_matches:
        return "extension-slot"
    return "unresolved"


def flattened_resolved_ids(claim: dict[str, Any]) -> list[str]:
    resolved = claim.get("resolved_ids", {})
    ids = []
    for bucket in ["canonical", "deprecated_terms", "prohibited_patterns", "verification_policy", "candidates"]:
        ids.extend(resolved.get(bucket, []))
    return sorted(dict.fromkeys(ids))


def infer_frame_claim_type(claim: dict[str, Any], geometry_matches: list[dict[str, Any]]) -> str:
    text = normalize_text(claim.get("text", ""))
    kind = claim.get("claim_kind")
    if kind == "prohibited-construction" or any(item.get("type") == "ForbiddenPattern" for item in geometry_matches):
        return "forbidden-risk"
    if kind == "deprecated-vocabulary" or "namespace" in text or "root-level" in text:
        return "namespace"
    if kind == "verification-policy" or re.search(r"\b(test|testing|proof|gate|ratchet|harness|verification)\b", text):
        return "verification"
    if re.search(r"\b(own|owns|ownership|truth|authority)\b", text):
        return "ownership"
    if re.search(r"\b(plugin|projection|lane|agent/tools|server/api|server/internal|web|async)\b", text):
        return "projection"
    if re.search(r"\b(resource|provider|profile|selection|provides|implements)\b", text):
        return "resource-provider"
    if re.search(r"\b(app|composition|entrypoint|startapp|selected plugin)\b", text):
        return "app-composition"
    if re.search(r"\b(runtime|boot|bind|lifecycle|phase|shutdown|release)\b", text):
        return "runtime-realization"
    if re.search(r"\b(diagnostic|telemetry|observability|read model|topology)\b", text):
        return "diagnostics"
    if re.search(r"\b(lifecycle|start|stop|shutdown)\b", text):
        return "lifecycle"
    if re.search(r"\b(kind|classify|classification)\b", text):
        return "kind-introduction"
    return "support-matter"


def normalize_authority_context(value: str | None) -> str:
    allowed = set(load_architecture_change_frame_schema()["$defs"]["authority_context"]["enum"])
    return value if value in allowed else "comparison-document"


def extraction_method_for_claim(claim: dict[str, Any]) -> str:
    extractor = claim.get("extractor", "")
    if extractor.startswith("semantica-pilot"):
        return "semantica-pattern-pilot"
    if extractor.startswith("semantica-llm"):
        return "semantica-llm-pilot"
    return "rawr-deterministic-oracle"


def llm_provider_status_from_capability(capability: dict[str, Any]) -> str:
    optional = capability.get("optional_dependencies", {})
    if any(optional.get(name, {}).get("available") for name in ["openai", "anthropic", "litellm", "ollama"]):
        if os.environ.get("OPENAI_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"):
            return "available"
        return "blocked-no-api-key"
    return "blocked-missing-extra"


def document_ref(document: Path, evidence: dict[str, Any]) -> dict[str, Any]:
    title = document_title(document)
    source_path = evidence.get("document") or display_path(document)
    source_scope = source_scope_for_path(document, fixture=bool(evidence.get("fixture")))
    return {
        "source_path": source_path,
        "title": title,
        "authority_context": "fixture" if evidence.get("fixture") else "comparison-document",
        "authority_rank": 99 if evidence.get("fixture") else 50,
        "source_scope": source_scope,
        "content_sha256": hashlib.sha256(document.read_bytes()).hexdigest() if document.exists() else hashlib.sha256(b"").hexdigest(),
    }


def document_title(document: Path) -> str:
    if not document.exists():
        return document.name
    for line in document.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^#\s+(.+)$", line.strip())
        if match:
            return match.group(1).strip()
    return document.stem.replace("-", " ").replace("_", " ").title()


def proposal_summary(claims: list[dict[str, Any]]) -> str:
    if not claims:
        return "No architecture proposal claims extracted."
    by_type = Counter(claim["claim_type"] for claim in claims)
    top = ", ".join(f"{claim_type}={count}" for claim_type, count in by_type.most_common(4))
    return f"Extracted {len(claims)} architecture proposal claims ({top})."


def infer_target_app(claims: list[dict[str, Any]]) -> str | None:
    for claim in claims:
        text = normalize_text(claim.get("evidence_refs", [{}])[0].get("text", ""))
        match = re.search(r"\brawr\.([a-z0-9_-]+)\.ts\b", text)
        if match:
            return match.group(1)
    return None


def frame_diagnostics(evidence: dict[str, Any], semantic_compare: dict[str, Any], reference_geometry: dict[str, Any]) -> list[dict[str, Any]]:
    diagnostics = [
        {
            "kind": "deterministic_evidence_claims",
            "claim_count": len(evidence.get("claims", [])),
            "decision_grade_source": evidence.get("semantica_pilot", {}).get("summary", {}).get("decision_grade_source", "rawr-semantic-heuristic-v1"),
        },
        {
            "kind": "semantic_compare_findings",
            "finding_count": len(semantic_compare.get("findings", [])),
            "decision_grade_finding_count": semantic_compare.get("summary", {}).get("decision_grade_finding_count", 0),
        },
        {
            "kind": "reference_geometry",
            "loaded": reference_geometry.get("loaded", False),
            "status": reference_geometry.get("status"),
            "sha256": reference_geometry.get("sha256"),
        },
    ]
    pilot = evidence.get("semantica_pilot", {})
    if pilot.get("diagnostics"):
        diagnostics.extend({"kind": "semantica_pilot", **item} for item in pilot.get("diagnostics", []))
    llm = evidence.get("semantica_llm") or {}
    if llm:
        status = llm.get("status", {})
        diagnostics.append(
            {
                "kind": "semantica_llm",
                "requested_mode": llm.get("requested_mode"),
                "actual_mode": llm.get("actual_mode"),
                "provider": status.get("provider"),
                "model": status.get("model"),
                "blocked_reason": status.get("blocked_reason"),
                "provider_available": status.get("provider_available"),
                "llm_call_attempted": status.get("llm_call_attempted"),
                "evidence_claim_count": llm.get("summary", {}).get("evidence_claim_count", 0),
            }
        )
        diagnostics.extend({"kind": "semantica_llm", **item} for item in llm.get("diagnostics", []))
    return diagnostics


def unresolved_questions_for_compare(semantic_compare: dict[str, Any]) -> list[str]:
    questions = []
    ambiguous_count = semantic_compare.get("summary", {}).get("findings_by_kind", {}).get("ambiguous", 0)
    candidate_count = semantic_compare.get("summary", {}).get("findings_by_kind", {}).get("candidate-new", 0)
    if ambiguous_count:
        questions.append("Clarify ambiguous proposal claims before using them as architecture decisions.")
    if candidate_count:
        questions.append("Review candidate concepts before writing canonical addenda or promoting ontology truth.")
    if semantic_compare.get("summary", {}).get("decision_grade_finding_count", 0):
        questions.append("Resolve decision-grade findings before treating the proposal as aligned.")
    return questions


def first_geometry_by_type(matches: list[dict[str, Any]], type_name: str) -> dict[str, Any] | None:
    return next((item for item in matches if item.get("type") == type_name), None)


def geometry_object_label(matches: list[dict[str, Any]]) -> str | None:
    if not matches:
        return None
    return ", ".join(item.get("label") or item["id"] for item in matches[:3])


def bounded_confidence(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.5
    return max(0.0, min(1.0, number))


def display_path(path: Path) -> str:
    try:
        return rel(path)
    except ValueError:
        return str(path)
