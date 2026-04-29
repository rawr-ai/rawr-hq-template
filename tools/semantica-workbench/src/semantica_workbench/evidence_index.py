from __future__ import annotations

import hashlib
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .core_config import CORE_GRAPH_FILENAMES
from .io import git_sha, read_json, rel, write_json, write_jsonl
from .paths import REPO_ROOT
from .semantica_adapter import iri_fragment, turtle_literal

SWEEP_EVIDENCE_INDEX_SCHEMA_VERSION = "rawr-sweep-evidence-index-v1"
STRICT_WARNING_KINDS = {
    "claim-missing-id",
    "duplicate-claim-index-id",
    "finding-missing-claim-id",
    "finding-references-missing-claim",
}
AUTHORITY_BOUNDARY = {
    "generated_evidence_is_truth": False,
    "reviewed_rawr_ontology_remains_authority": True,
    "promotion_requires_human_review": True,
    "llm_output_is_evidence_only": True,
}


def build_sweep_evidence_index(run_dir: Path, *, strict: bool = True) -> dict[str, Any]:
    sweep_path = run_dir / CORE_GRAPH_FILENAMES["doc_sweep"]
    sweep = read_json(sweep_path)
    documents: list[dict[str, Any]] = []
    claims: list[dict[str, Any]] = []
    findings: list[dict[str, Any]] = []
    warnings: list[dict[str, Any]] = []
    by_kind: Counter[str] = Counter()
    by_rule: Counter[str] = Counter()
    by_ambiguity_bucket: Counter[str] = Counter()
    by_review_action: Counter[str] = Counter()
    by_resolution_state: Counter[str] = Counter()
    by_recommendation: Counter[str] = Counter()
    by_path_class: Counter[str] = Counter()
    decision_grade = 0

    for record in sweep.get("documents", []):
        by_recommendation[str(record.get("recommendation") or "unknown")] += 1
        by_path_class[str(record.get("path_class") or "unknown")] += 1
        semantic_path = semantic_compare_path(run_dir, record)
        document_row = document_index_row(record, semantic_path)
        document_row["run_id"] = sweep.get("run_id", run_dir.name)
        if not semantic_path.exists():
            warning = {
                "kind": "missing-semantic-compare-artifact",
                "document_path": record.get("document_path"),
                "artifact_path": display_path(semantic_path),
            }
            warnings.append(warning)
            document_row["index_status"] = "missing-semantic-compare"
            documents.append(document_row)
            if strict:
                raise FileNotFoundError(
                    "Sweep evidence index requires every analyzed document semantic comparison artifact. "
                    f"Missing {display_path(semantic_path)} for {record.get('document_path')}"
                )
            continue

        compare = read_json(semantic_path)
        document_row["index_status"] = "indexed"
        document_row["semantic_compare_schema_version"] = compare.get("schema_version")
        document_row["semantic_summary"] = compare.get("summary", {})
        documents.append(document_row)

        claims_by_claim_id: dict[str, dict[str, Any]] = {}
        claim_index_ids_for_document: set[str] = set()
        for claim in compare.get("claims", []):
            row = claim_index_row(sweep, record, semantic_path, claim)
            claims.append(row)
            if not row.get("claim_id"):
                warnings.append(
                    {
                        "kind": "claim-missing-id",
                        "document_path": record.get("document_path"),
                        "claim_index_id": row.get("index_id"),
                        "semantic_compare": display_path(semantic_path),
                    }
                )
            if row["index_id"] in claim_index_ids_for_document:
                warnings.append(
                    {
                        "kind": "duplicate-claim-index-id",
                        "document_path": record.get("document_path"),
                        "claim_id": row.get("claim_id"),
                        "claim_index_id": row.get("index_id"),
                        "semantic_compare": display_path(semantic_path),
                    }
                )
            if row.get("claim_id"):
                claims_by_claim_id.setdefault(str(row["claim_id"]), row)
            claim_index_ids_for_document.add(row["index_id"])
            by_resolution_state[str(row.get("resolution_state") or "unknown")] += 1

        for finding in compare.get("findings", []):
            claim_row = claims_by_claim_id.get(str(finding.get("claim_id") or ""))
            row = finding_index_row(sweep, record, semantic_path, finding, claim_row)
            findings.append(row)
            by_kind[str(row.get("kind") or "unknown")] += 1
            by_rule[str(row.get("rule") or "unknown")] += 1
            if row.get("ambiguity_bucket"):
                by_ambiguity_bucket[str(row["ambiguity_bucket"])] += 1
            if row.get("review_action"):
                by_review_action[str(row["review_action"])] += 1
            if row.get("decision_grade"):
                decision_grade += 1
            if not row.get("claim_id") or not row.get("claim_index_id"):
                warnings.append(
                    {
                        "kind": "finding-missing-claim-id",
                        "document_path": record.get("document_path"),
                        "finding_id": row.get("finding_id"),
                        "semantic_compare": display_path(semantic_path),
                    }
                )
            elif row["claim_index_id"] not in claim_index_ids_for_document:
                warnings.append(
                    {
                        "kind": "finding-references-missing-claim",
                        "document_path": record.get("document_path"),
                        "finding_id": row.get("finding_id"),
                        "claim_id": row.get("claim_id"),
                        "claim_index_id": row.get("claim_index_id"),
                        "semantic_compare": display_path(semantic_path),
                    }
                )

    summary = {
        "documents_indexed": sum(1 for document in documents if document.get("index_status") == "indexed"),
        "documents_with_missing_artifacts": sum(1 for document in documents if document.get("index_status") != "indexed"),
        "claim_count": len(claims),
        "finding_count": len(findings),
        "decision_grade_finding_count": decision_grade,
        "finding_count_by_kind": dict(sorted(by_kind.items())),
        "finding_count_by_rule": dict(sorted(by_rule.items())),
        "ambiguous_count_by_bucket": dict(sorted(by_ambiguity_bucket.items())),
        "review_action_count": dict(sorted(by_review_action.items())),
        "claim_count_by_resolution_state": dict(sorted(by_resolution_state.items())),
        "document_count_by_recommendation": dict(sorted(by_recommendation.items())),
        "document_count_by_path_class": dict(sorted(by_path_class.items())),
        "warning_count": len(warnings),
    }
    strict_warnings = [warning for warning in warnings if warning.get("kind") in STRICT_WARNING_KINDS]
    if strict and strict_warnings:
        kinds = ", ".join(sorted({str(warning.get("kind")) for warning in strict_warnings}))
        raise RuntimeError(f"Sweep evidence index integrity validation failed: {kinds}")

    return {
        "schema_version": SWEEP_EVIDENCE_INDEX_SCHEMA_VERSION,
        "run_id": sweep.get("run_id", run_dir.name),
        "git_sha": sweep.get("git_sha") or git_sha(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "authority_boundary": dict(AUTHORITY_BOUNDARY),
        "source_sweep": {
            "artifact": display_path(sweep_path),
            "schema_version": sweep.get("schema_version"),
            "created_at": sweep.get("created_at"),
            "run_id": sweep.get("run_id", run_dir.name),
            "root_paths": sweep.get("root_paths", []),
            "explicit_documents": sweep.get("explicit_documents", []),
            "include_globs": sweep.get("include_globs", []),
            "exclude_segments": sweep.get("exclude_segments", []),
            "ontology": sweep.get("ontology", {}),
            "summary": sweep.get("summary", {}),
        },
        "summary": summary,
        "documents": documents,
        "claims": claims,
        "findings": findings,
        "warnings": warnings,
        "provenance": {
            "generated_by": "semantica-workbench evidence_index.build_sweep_evidence_index",
            "authority_model": "Generated sweep evidence is review evidence only; reviewed RAWR ontology sources remain authoritative.",
            "source_artifacts": [display_path(semantic_compare_path(run_dir, record)) for record in sweep.get("documents", [])],
        },
    }


def write_sweep_evidence_index(run_dir: Path, *, strict: bool = True) -> dict[str, Any]:
    from .report_html import write_sweep_evidence_index_html

    index = build_sweep_evidence_index(run_dir, strict=strict)
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"], index)
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_summary"], evidence_index_summary(index))
    write_jsonl(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_jsonl"], evidence_index_jsonl_rows(index))
    write_sweep_evidence_index_html(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_html"], index)
    (run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"]).write_text(evidence_index_turtle(index), encoding="utf-8")
    return index


def evidence_index_summary(index: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": index["schema_version"],
        "run_id": index["run_id"],
        "git_sha": index["git_sha"],
        "created_at": index["created_at"],
        "authority_boundary": dict(index.get("authority_boundary", AUTHORITY_BOUNDARY)),
        "source_sweep": index["source_sweep"],
        "summary": index["summary"],
        "warnings": index.get("warnings", []),
    }


def evidence_index_jsonl_rows(index: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = [
        {
            "record_type": "summary",
            "run_id": index["run_id"],
            "schema_version": index["schema_version"],
            "authority_boundary": dict(index.get("authority_boundary", AUTHORITY_BOUNDARY)),
            "summary": index["summary"],
        }
    ]
    for document in index.get("documents", []):
        rows.append({"record_type": "document", "run_id": index["run_id"], **document})
    for claim in index.get("claims", []):
        rows.append({"record_type": "claim", "run_id": index["run_id"], **claim})
    for finding in index.get("findings", []):
        rows.append({"record_type": "finding", "run_id": index["run_id"], **finding})
    for warning in index.get("warnings", []):
        rows.append({"record_type": "warning", "run_id": index["run_id"], **warning})
    return rows


def evidence_index_turtle(index: dict[str, Any]) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix evidence: <https://rawr.dev/evidence/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    run_node = evidence_node_id("index", str(index.get("run_id") or "sweep-evidence-index"))
    summary = index.get("summary", {})
    lines.append(f"evidence:{run_node} a rawr:SweepEvidenceIndex ;")
    lines.append(f"  rawr:schemaVersion {turtle_literal(str(index.get('schema_version') or ''))} ;")
    lines.append(f"  rawr:sourceArtifact {turtle_literal(CORE_GRAPH_FILENAMES['sweep_evidence_index'])} ;")
    lines.append(f"  rawr:gitSha {turtle_literal(str(index.get('git_sha') or ''))} ;")
    lines.append(f"  rawr:documentsIndexed {turtle_literal(str(summary.get('documents_indexed', 0)))} ;")
    lines.append(f"  rawr:claimCount {turtle_literal(str(summary.get('claim_count', 0)))} ;")
    lines.append(f"  rawr:findingCount {turtle_literal(str(summary.get('finding_count', 0)))} ;")
    lines.append("  rawr:generatedEvidenceIsTruth \"false\" .")
    lines.append("")

    document_nodes: dict[str, str] = {}
    for document in index.get("documents", []):
        document_path = str(document.get("document_path") or "unknown-document")
        node = evidence_node_id("document", document_path)
        document_nodes[document_path] = node
        lines.append(f"evidence:{node} a rawr:IndexedDocument ;")
        lines.append(f"  rdfs:label {turtle_literal(document_path)} ;")
        lines.append(f"  rawr:partOfEvidenceIndex evidence:{run_node} ;")
        lines.append(f"  rawr:pathClass {turtle_literal(str(document.get('path_class') or ''))} ;")
        lines.append(f"  rawr:recommendation {turtle_literal(str(document.get('recommendation') or ''))} ;")
        lines.append(f"  rawr:confidence {turtle_literal(str(document.get('confidence') or ''))} .")
        lines.append("")

    for claim in index.get("claims", []):
        node = evidence_node_id("claim", str(claim.get("index_id") or claim.get("claim_id") or "claim"))
        document_path = str(claim.get("sweep_document_path") or claim.get("document_path") or "unknown-document")
        lines.append(f"evidence:{node} a rawr:EvidenceClaim ;")
        lines.append(f"  rdfs:label {turtle_literal(str(claim.get('text') or ''))} ;")
        lines.append(f"  rawr:partOfEvidenceIndex evidence:{run_node} ;")
        if document_path in document_nodes:
            lines.append(f"  rawr:partOfDocument evidence:{document_nodes[document_path]} ;")
        lines.append(f"  rawr:claimId {turtle_literal(str(claim.get('claim_id') or ''))} ;")
        lines.append(f"  rawr:sourcePath {turtle_literal(str(claim.get('source_path') or ''))} ;")
        lines.append(f"  rawr:lineStart {turtle_literal(str(claim.get('line_start') or ''))} ;")
        lines.append(f"  rawr:lineEnd {turtle_literal(str(claim.get('line_end') or ''))} ;")
        lines.append(f"  rawr:charStart {turtle_literal(str(claim.get('char_start') or ''))} ;")
        lines.append(f"  rawr:charEnd {turtle_literal(str(claim.get('char_end') or ''))} ;")
        lines.append(f"  rawr:resolutionState {turtle_literal(str(claim.get('resolution_state') or ''))} ;")
        lines.append(f"  rawr:reviewState {turtle_literal(str(claim.get('review_state') or ''))} ;")
        lines.append("  rawr:promotionAllowed \"false\" .")
        lines.append("")

    for finding in index.get("findings", []):
        node = evidence_node_id("finding", str(finding.get("index_id") or finding.get("finding_id") or "finding"))
        claim_node = evidence_node_id("claim", str(finding.get("claim_index_id") or finding.get("claim_id") or "claim"))
        document_path = str(finding.get("sweep_document_path") or finding.get("document_path") or "unknown-document")
        lines.append(f"evidence:{node} a rawr:ReviewFinding ;")
        lines.append(f"  rawr:findingKind {turtle_literal(str(finding.get('kind') or ''))} ;")
        lines.append(f"  rawr:partOfEvidenceIndex evidence:{run_node} ;")
        lines.append(f"  rawr:derivedFrom evidence:{claim_node} ;")
        if document_path in document_nodes:
            lines.append(f"  rawr:partOfDocument evidence:{document_nodes[document_path]} ;")
        lines.append(f"  rawr:sourcePath {turtle_literal(str(finding.get('source_path') or ''))} ;")
        lines.append(f"  rawr:lineStart {turtle_literal(str(finding.get('line_start') or ''))} ;")
        lines.append(f"  rawr:lineEnd {turtle_literal(str(finding.get('line_end') or ''))} ;")
        lines.append(f"  rawr:charStart {turtle_literal(str(finding.get('char_start') or ''))} ;")
        lines.append(f"  rawr:charEnd {turtle_literal(str(finding.get('char_end') or ''))} ;")
        lines.append(f"  rawr:decisionGrade {turtle_literal(str(bool(finding.get('decision_grade'))).lower())} ;")
        lines.append(f"  rawr:rule {turtle_literal(str(finding.get('rule') or ''))} ;")
        lines.append(f"  rawr:resolutionState {turtle_literal(str(finding.get('resolution_state') or ''))} ;")
        if finding.get("entity_id"):
            lines.append(f"  rawr:resolvedTarget rawr:{iri_fragment(str(finding['entity_id']))} ;")
        if finding.get("ambiguity_bucket"):
            lines.append(f"  rawr:ambiguityBucket {turtle_literal(str(finding['ambiguity_bucket']))} ;")
        if finding.get("review_action"):
            lines.append(f"  rawr:reviewAction {turtle_literal(str(finding['review_action']))} ;")
        lines.append("  rawr:promotionAllowed \"false\" .")
        lines.append("")
    return "\n".join(lines)


def evidence_node_id(kind: str, identity: str) -> str:
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16]
    return iri_fragment(f"{kind}-{identity}") + f"_{digest}"


def semantic_compare_path(run_dir: Path, record: dict[str, Any]) -> Path:
    artifact_paths = record.get("artifact_paths", {})
    value = artifact_paths.get("semantic_compare")
    if not value:
        return run_dir / "documents" / "__missing__" / CORE_GRAPH_FILENAMES["semantic_compare"]
    path = Path(value)
    if path.is_absolute():
        return path
    return REPO_ROOT / path


def document_index_row(record: dict[str, Any], semantic_path: Path) -> dict[str, Any]:
    return {
        "run_id": record.get("run_id"),
        "document_path": record.get("document_path"),
        "path_class": record.get("path_class"),
        "recommendation": record.get("recommendation"),
        "confidence": record.get("confidence"),
        "reason_codes": record.get("reason_codes", []),
        "counts": record.get("counts", {}),
        "artifact_paths": record.get("artifact_paths", {}),
        "semantic_compare_artifact": display_path(semantic_path),
        "report_artifact": record.get("artifact_paths", {}).get("report"),
        "report_html_artifact": record.get("artifact_paths", {}).get("report_html"),
    }


def claim_index_row(sweep: dict[str, Any], record: dict[str, Any], semantic_path: Path, claim: dict[str, Any]) -> dict[str, Any]:
    document_path = claim.get("source_path") or record.get("document_path")
    claim_id = str(claim.get("id") or "")
    span = source_span_from_claim(claim, record)
    return {
        "index_id": scoped_id(document_path, claim_id),
        "run_id": sweep.get("run_id"),
        "document_path": document_path,
        "sweep_document_path": record.get("document_path"),
        "semantic_compare_artifact": display_path(semantic_path),
        "report_artifact": record.get("artifact_paths", {}).get("report"),
        "report_html_artifact": record.get("artifact_paths", {}).get("report_html"),
        "claim_id": claim_id,
        "source_path": claim.get("source_path") or record.get("document_path"),
        "line_start": claim.get("line_start"),
        "line_end": claim.get("line_end"),
        "char_start": claim.get("char_start"),
        "char_end": claim.get("char_end"),
        "char_span_kind": claim.get("char_span_kind"),
        "heading_path": claim.get("heading_path", []),
        "text": claim.get("text"),
        "source_span": span,
        "subject": claim.get("subject"),
        "predicate": claim.get("predicate"),
        "object": claim.get("object"),
        "polarity": claim.get("polarity"),
        "modality": claim.get("modality"),
        "assertion_scope": claim.get("assertion_scope"),
        "authority_context": claim.get("authority_context"),
        "claim_kind": claim.get("claim_kind"),
        "resolution_state": claim.get("resolution_state"),
        "resolved_ids": claim.get("resolved_ids", {}),
        "review_state": claim.get("review_state"),
        "extractor": claim.get("extractor"),
        "model": claim.get("model"),
        "confidence": claim.get("confidence"),
        "promotion_allowed": False,
    }


def finding_index_row(
    sweep: dict[str, Any],
    record: dict[str, Any],
    semantic_path: Path,
    finding: dict[str, Any],
    claim_row: dict[str, Any] | None = None,
) -> dict[str, Any]:
    document_path = finding.get("document_path") or record.get("document_path")
    finding_id = str(finding.get("id") or "")
    claim_id = str(finding.get("claim_id") or "")
    claim_index_id = claim_row.get("index_id") if claim_row else scoped_id(document_path, claim_id) if claim_id else None
    span = source_span_from_finding(finding, record, claim_row)
    return {
        "index_id": scoped_id(document_path, finding_id),
        "run_id": sweep.get("run_id"),
        "document_path": document_path,
        "sweep_document_path": record.get("document_path"),
        "semantic_compare_artifact": display_path(semantic_path),
        "report_artifact": record.get("artifact_paths", {}).get("report"),
        "report_html_artifact": record.get("artifact_paths", {}).get("report_html"),
        "finding_id": finding_id,
        "claim_id": claim_id,
        "claim_index_id": claim_index_id,
        "source_path": span["source_path"],
        "line_start": span["line_start"],
        "line_end": span["line_end"],
        "char_start": span["char_start"],
        "char_end": span["char_end"],
        "char_span_kind": span["char_span_kind"],
        "heading_path": span["heading_path"],
        "text": span["text"],
        "source_span": span,
        "kind": finding.get("kind"),
        "rule": finding.get("rule") or "unknown",
        "decision_grade": bool(finding.get("decision_grade")),
        "review_action": finding.get("review_action"),
        "reason": finding.get("reason"),
        "entity_id": finding.get("entity_id"),
        "label": finding.get("label"),
        "ambiguity_bucket": finding.get("ambiguity_bucket"),
        "polarity": finding.get("polarity"),
        "modality": finding.get("modality"),
        "assertion_scope": finding.get("assertion_scope"),
        "claim_kind": finding.get("claim_kind"),
        "resolution_state": finding.get("resolution_state"),
        "confidence": finding.get("confidence"),
        "explanation_chain": finding.get("explanation_chain", {}),
        "promotion_allowed": False,
    }


def source_span_from_claim(claim: dict[str, Any], record: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_path": claim.get("source_path") or record.get("document_path"),
        "line_start": claim.get("line_start"),
        "line_end": claim.get("line_end"),
        "char_start": claim.get("char_start"),
        "char_end": claim.get("char_end"),
        "char_span_kind": claim.get("char_span_kind"),
        "heading_path": claim.get("heading_path", []),
        "text": claim.get("text"),
    }


def source_span_from_finding(
    finding: dict[str, Any],
    record: dict[str, Any],
    claim_row: dict[str, Any] | None,
) -> dict[str, Any]:
    if claim_row and isinstance(claim_row.get("source_span"), dict):
        return dict(claim_row["source_span"])
    return {
        "source_path": finding.get("document_path") or record.get("document_path"),
        "line_start": finding.get("line_start"),
        "line_end": finding.get("line_end"),
        "char_start": None,
        "char_end": None,
        "char_span_kind": None,
        "heading_path": finding.get("heading_path", []),
        "text": finding.get("text"),
    }


def scoped_id(document_path: str | None, item_id: str) -> str:
    return f"{document_path or 'unknown-document'}#{item_id or 'unknown-id'}"


def display_path(path: Path) -> str:
    try:
        return rel(path)
    except Exception:
        return str(path)
