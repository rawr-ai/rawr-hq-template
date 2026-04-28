from __future__ import annotations

import csv
import fnmatch
import hashlib
import shutil
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .core_config import (
    CORE_GRAPH_FILENAMES,
    CORE_SWEEP_BASE_FILES,
    DEFAULT_SWEEP_EXCLUDE_SEGMENTS,
    DEFAULT_SWEEP_INCLUDE_GLOBS,
    DEFAULT_SWEEP_ROOTS,
    SWEEP_CURRENT_FILES,
    SWEEP_HIGH_AMBIGUITY_MIN,
    SWEEP_HIGH_AMBIGUITY_RATIO,
    SWEEP_RECOMMENDATIONS,
    SWEEP_REVIEW_RECOMMENDATIONS,
)
from .core_viewer import write_html_viewer
from .io import git_sha, mark_current, new_run_dir, read_json, rel, resolve_run, write_json, write_jsonl
from .paths import REPO_ROOT
from .semantic_evidence import (
    compare_evidence_to_ontology,
    extract_evidence_claims,
    render_semantic_compare_report,
    semantic_compare_turtle,
)
from .semantica_adapter import iri_fragment, turtle_literal
from .semantica_pipeline import semantica_pipeline_probe

SWEEP_SCHEMA_VERSION = "rawr-semantic-doc-sweep-v1"


def run_document_sweep(
    *,
    roots: list[str] | None = None,
    documents: list[str] | None = None,
    include_globs: list[str] | None = None,
    exclude_segments: list[str] | None = None,
    limit: int | None = None,
    run: str | None = "latest",
    fail_on: str = "none",
) -> Path:
    base_run_dir = resolve_run(run)
    graph = read_json(base_run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    candidate_queue = read_json(base_run_dir / CORE_GRAPH_FILENAMES["candidate_queue"])
    roots = [] if roots is None and documents else DEFAULT_SWEEP_ROOTS if roots is None else roots
    include_globs = DEFAULT_SWEEP_INCLUDE_GLOBS if include_globs is None else include_globs
    exclude_segments = effective_exclude_segments(exclude_segments)
    discovered, skipped = discover_documents(roots, include_globs, exclude_segments)
    explicit = explicit_document_inputs(documents or [])
    selected = dedupe_documents([*explicit, *discovered])
    documents_discovered_count = len(selected) + len(skipped)
    if limit is not None:
        selected = selected[:limit]

    run_dir = new_run_dir("doc-sweep")
    copy_core_run_files(base_run_dir, run_dir)
    source_authority_paths = source_authority_documents(graph)
    records: list[dict[str, Any]] = []
    for index, item in enumerate(selected, start=1):
        print(f"[doc-sweep] {index}/{len(selected)} {rel(item['path'])}", file=sys.stderr, flush=True)
        record = analyze_document(
            item["path"],
            graph,
            candidate_queue,
            run_dir,
            source_authority_paths,
            exclude_segments,
            explicit=item["explicit"],
        )
        records.append(record)

    sweep = build_sweep_payload(
        run_dir,
        roots,
        documents or [],
        include_globs,
        exclude_segments,
        skipped,
        records,
        documents_discovered_count,
    )
    write_sweep_outputs(run_dir, sweep)
    write_html_viewer(run_dir / CORE_GRAPH_FILENAMES["viewer"], graph, candidate_queue, {"sweep": sweep})
    mark_current(run_dir, SWEEP_CURRENT_FILES)
    if fail_on == "decision-grade" and sweep["summary"]["decision_grade_findings"]:
        raise RuntimeError(f"Document sweep found {sweep['summary']['decision_grade_findings']} decision-grade findings")
    return run_dir


def discover_documents(
    roots: list[str],
    include_globs: list[str],
    exclude_segments: list[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    discovered: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for root_value in roots:
        root = resolve_repo_path(root_value)
        if not root.exists():
            skipped.append({"path": display_path(root), "reason": "missing-root"})
            continue
        candidates = [root] if root.is_file() else sorted(root.rglob("*"))
        for path in candidates:
            if not path.is_file():
                continue
            if path.suffix.lower() != ".md":
                continue
            if not matches_include(path, include_globs):
                continue
            excluded = excluded_segment(path, exclude_segments)
            if excluded:
                skipped.append({"path": rel(path), "reason": f"excluded-segment:{excluded}"})
                continue
            discovered.append({"path": path, "explicit": False})
    return discovered, skipped


def effective_exclude_segments(exclude_segments: list[str] | None) -> list[str]:
    if exclude_segments is None:
        return list(DEFAULT_SWEEP_EXCLUDE_SEGMENTS)
    return sorted({*DEFAULT_SWEEP_EXCLUDE_SEGMENTS, *exclude_segments})


def explicit_document_inputs(documents: list[str]) -> list[dict[str, Any]]:
    items = []
    for value in documents:
        path = resolve_repo_path(value)
        if not path.exists() or not path.is_file():
            raise FileNotFoundError(f"Explicit sweep document does not exist: {path}")
        items.append({"path": path, "explicit": True})
    return items


def dedupe_documents(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[Path] = set()
    result: list[dict[str, Any]] = []
    for item in items:
        path = item["path"].resolve()
        if path in seen:
            continue
        seen.add(path)
        result.append({"path": path, "explicit": item["explicit"]})
    return result


def analyze_document(
    document: Path,
    graph: dict[str, Any],
    candidate_queue: dict[str, Any],
    sweep_run_dir: Path,
    source_authority_paths: set[str],
    exclude_segments: list[str],
    *,
    explicit: bool,
) -> dict[str, Any]:
    document_run_dir = sweep_run_dir / "documents" / document_slug(document)
    document_run_dir.mkdir(parents=True, exist_ok=False)
    evidence = extract_evidence_claims(document, graph, candidate_queue)
    compare = compare_evidence_to_ontology(evidence, graph, candidate_queue)
    write_document_artifacts(document_run_dir, evidence, compare)
    path_class = classify_document_path(document, source_authority_paths, exclude_segments, explicit=explicit)
    recommendation = recommend_document(compare, path_class)
    top_findings = top_review_findings(compare)
    return {
        "document_path": rel(document),
        "path_class": path_class,
        **recommendation,
        "counts": document_counts(compare),
        "top_findings": top_findings,
        "artifact_paths": {
            "semantic_compare": rel(document_run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]),
            "report": rel(document_run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report"]),
        },
    }


def write_document_artifacts(document_run_dir: Path, evidence: dict[str, Any], compare: dict[str, Any]) -> None:
    chunks = [
        {
            "document": evidence["document"],
            "line_start": claim["line_start"],
            "line_end": claim["line_end"],
            "heading_path": claim["heading_path"],
            "text": claim["text"],
            "claim_id": claim["id"],
        }
        for claim in evidence.get("claims", [])
    ]
    write_jsonl(document_run_dir / CORE_GRAPH_FILENAMES["document_chunks"], chunks)
    write_jsonl(document_run_dir / CORE_GRAPH_FILENAMES["evidence_claims"], evidence.get("claims", []))
    write_json(document_run_dir / CORE_GRAPH_FILENAMES["evidence_claims_json"], evidence)
    write_json(document_run_dir / CORE_GRAPH_FILENAMES["suppressed_lines"], {"document": evidence["document"], "items": evidence.get("suppressed_lines", [])})
    write_json(document_run_dir / CORE_GRAPH_FILENAMES["resolved_evidence"], {"claims": compare.get("claims", []), "findings": compare.get("findings", [])})
    write_json(document_run_dir / CORE_GRAPH_FILENAMES["semantic_compare"], compare)
    (document_run_dir / CORE_GRAPH_FILENAMES["semantic_compare_report"]).write_text(render_semantic_compare_report(compare), encoding="utf-8")
    (document_run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]).write_text(semantic_compare_turtle(compare), encoding="utf-8")


def build_sweep_payload(
    run_dir: Path,
    roots: list[str],
    explicit_documents: list[str],
    include_globs: list[str],
    exclude_segments: list[str],
    skipped: list[dict[str, Any]],
    records: list[dict[str, Any]],
    documents_discovered_count: int,
) -> dict[str, Any]:
    summary_counter = Counter(record["recommendation"] for record in records)
    counts = aggregate_counts(records)
    recommendations = {name: summary_counter.get(name, 0) for name in SWEEP_RECOMMENDATIONS}
    return {
        "schema_version": SWEEP_SCHEMA_VERSION,
        "run_id": run_dir.name,
        "git_sha": git_sha(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "root_paths": roots,
        "explicit_documents": explicit_documents,
        "include_globs": include_globs,
        "exclude_segments": exclude_segments,
        "ontology": ontology_metadata(run_dir),
        "summary": {
            "documents_discovered": documents_discovered_count,
            "documents_analyzed": len(records),
            "documents_skipped": len(skipped),
            "recommendations": recommendations,
            "total_claims": counts["claims"],
            "total_findings": counts["findings"],
            "decision_grade_findings": counts["decision_grade"],
            "conflicts": counts["conflict"],
            "deprecated_uses": counts["deprecated_use"],
            "ambiguous": counts["ambiguous"],
            "candidate_new": counts["candidate_new"],
            "suppressed_lines": counts["suppressed_lines"],
        },
        "semantica_pipeline": semantica_pipeline_probe(len(records), len(skipped), recommendations),
        "skipped_documents": skipped,
        "documents": records,
    }


def write_sweep_outputs(run_dir: Path, sweep: dict[str, Any]) -> None:
    review_queue = review_queue_records(sweep)
    quarantine_candidates = [record for record in sweep["documents"] if record["recommendation"] == "quarantine-candidate"]
    update_candidates = [record for record in sweep["documents"] if record["recommendation"] == "update-needed"]
    no_signal = [record for record in sweep["documents"] if record["recommendation"] == "outside-scope"]
    write_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep"], sweep)
    write_json(run_dir / CORE_GRAPH_FILENAMES["doc_sweep_review_queue"], {"run_id": sweep["run_id"], "documents": review_queue})
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_quarantine_candidates"], {"run_id": sweep["run_id"], "documents": quarantine_candidates})
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_update_candidates"], {"run_id": sweep["run_id"], "documents": update_candidates})
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_no_signal_documents"], {"run_id": sweep["run_id"], "documents": no_signal})
    (run_dir / CORE_GRAPH_FILENAMES["doc_sweep_report"]).write_text(render_sweep_report(sweep), encoding="utf-8")
    write_sweep_csv(run_dir / CORE_GRAPH_FILENAMES["doc_sweep_csv"], sweep)
    (run_dir / CORE_GRAPH_FILENAMES["doc_sweep_ttl"]).write_text(sweep_turtle(sweep), encoding="utf-8")


def recommend_document(compare: dict[str, Any], path_class: str) -> dict[str, Any]:
    counts = document_counts(compare)
    reason_codes: list[str] = []
    if counts["conflict"]:
        reason_codes.append("decision-grade-conflict")
    if counts["deprecated_use"]:
        reason_codes.append("deprecated-target-vocabulary")
    if counts["candidate_new"]:
        reason_codes.append("candidate-new")
    if counts["ambiguous"]:
        reason_codes.append("ambiguous-findings")
    if counts["suppressed_lines"]:
        reason_codes.append("suppressed-scaffold-recorded")
    gap_count = ambiguity_bucket_count(compare, "subordinate-policy-gap")
    if gap_count:
        reason_codes.append("subordinate-policy-gap")
    if counts["claims"] == 0:
        reason_codes.append("no-claims")

    if path_class == "source-authority":
        if counts["decision_grade"]:
            reason_codes.append("source-authority-parser-regression-review")
        return recommendation("source-authority", reason_codes or ["source-authority-regression-input"], confidence="high")
    if counts["conflict"]:
        return recommendation("quarantine-candidate", reason_codes, confidence="medium")
    if counts["deprecated_use"]:
        return recommendation("update-needed", reason_codes, confidence="medium")
    if counts["claims"] == 0:
        return recommendation("outside-scope", reason_codes or ["no-claims"], confidence="high")
    if gap_count and not counts["conflict"]:
        return recommendation("update-needed", reason_codes, confidence="low")
    if counts["candidate_new"] or counts["ambiguous"]:
        return recommendation("review-needed", reason_codes, confidence="medium" if counts["candidate_new"] else "low")
    if counts["aligned"]:
        return recommendation("aligned-active", reason_codes or ["aligned-evidence"], confidence="medium")
    return recommendation("outside-scope", reason_codes or ["no-actionable-signal"], confidence="medium")


def recommendation(name: str, reason_codes: list[str], *, confidence: str) -> dict[str, Any]:
    return {
        "recommendation": name,
        "confidence": confidence,
        "reason_codes": sorted(set(reason_codes)),
    }


def document_counts(compare: dict[str, Any]) -> dict[str, int]:
    summary = compare.get("summary", {})
    by_kind = summary.get("findings_by_kind", {})
    return {
        "claims": int(summary.get("claim_count", 0)),
        "findings": int(summary.get("finding_count", 0)),
        "decision_grade": int(summary.get("decision_grade_finding_count", 0)),
        "aligned": int(by_kind.get("aligned", 0)),
        "conflict": int(by_kind.get("conflict", 0)),
        "deprecated_use": int(by_kind.get("deprecated-use", 0)),
        "ambiguous": int(by_kind.get("ambiguous", 0)),
        "candidate_new": int(by_kind.get("candidate-new", 0)),
        "suppressed_lines": int(summary.get("suppressed_line_count", 0)),
    }


def aggregate_counts(records: list[dict[str, Any]]) -> Counter:
    counter: Counter = Counter()
    for record in records:
        for key, value in record.get("counts", {}).items():
            counter[key] += int(value)
    return counter


def top_review_findings(compare: dict[str, Any], limit: int = 8) -> list[dict[str, Any]]:
    ordered = [
        *compare.get("conflicts", []),
        *compare.get("deprecated_uses", []),
        *compare.get("candidate_new", []),
        *compare.get("ambiguous", []),
        *compare.get("aligned", []),
        *compare.get("informational", []),
    ]
    return [finding_summary(item) for item in ordered[:limit]]


def finding_summary(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "finding_id": item.get("id"),
        "claim_id": item.get("claim_id"),
        "verdict": item.get("kind"),
        "rule": item.get("rule"),
        "entity_id": item.get("entity_id"),
        "source_path": item.get("document_path"),
        "line_start": item.get("line_start"),
        "line_end": item.get("line_end"),
        "review_action": item.get("review_action"),
        "summary": item.get("reason"),
    }


def review_queue_records(sweep: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        record
        for record in sweep["documents"]
        if record["recommendation"] in SWEEP_REVIEW_RECOMMENDATIONS
        or (
            record["recommendation"] == "source-authority"
            and record.get("counts", {}).get("decision_grade", 0) > 0
        )
    ]


def render_sweep_report(sweep: dict[str, Any]) -> str:
    summary = sweep["summary"]
    lines = [
        "# Semantic Evidence Document Sweep Report",
        "",
        f"- Run: `{sweep['run_id']}`",
        f"- Git SHA: `{sweep['git_sha']}`",
        f"- Documents analyzed: `{summary['documents_analyzed']}`",
        f"- Documents skipped: `{summary['documents_skipped']}`",
        f"- Total claims: `{summary['total_claims']}`",
        f"- Total findings: `{summary['total_findings']}`",
        f"- Decision-grade findings: `{summary['decision_grade_findings']}`",
        "",
        "## Inputs And Exclusions",
        "",
        f"- Roots: `{', '.join(sweep['root_paths'])}`",
        f"- Explicit documents: `{', '.join(sweep['explicit_documents']) if sweep['explicit_documents'] else 'none'}`",
        f"- Include globs: `{', '.join(sweep['include_globs'])}`",
        f"- Excluded path segments: `{', '.join(sweep['exclude_segments'])}`",
        "",
        "## Recommendation Summary",
        "",
    ]
    for name in SWEEP_RECOMMENDATIONS:
        lines.append(f"- `{name}`: `{summary['recommendations'].get(name, 0)}`")
    append_record_section(lines, "Quarantine Candidates", sweep["documents"], "quarantine-candidate")
    append_record_section(lines, "Update Needed", sweep["documents"], "update-needed")
    append_record_section(lines, "Review Needed", sweep["documents"], "review-needed")
    append_record_section(lines, "Source Authority Regression Results", sweep["documents"], "source-authority")
    append_record_section(lines, "Outside Scope / No Signal", sweep["documents"], "outside-scope")
    append_high_ambiguity_section(lines, sweep["documents"])
    append_compact_table(lines, sweep["documents"])
    append_next_queue(lines, sweep)
    return "\n".join(lines) + "\n"


def append_record_section(lines: list[str], title: str, records: list[dict[str, Any]], recommendation_name: str) -> None:
    lines.extend(["", f"## {title}", ""])
    selected = [record for record in records if record["recommendation"] == recommendation_name]
    if not selected:
        lines.append("None.")
        return
    limit = 25
    for record in selected[:limit]:
        lines.append(
            f"- `{record['document_path']}` ({record['confidence']}): "
            f"{', '.join(record['reason_codes']) or 'no reason codes'}; "
            f"report `{record['artifact_paths']['report']}`"
        )
    if len(selected) > limit:
        lines.append(f"- ... `{len(selected) - limit}` additional records omitted from this section; see `doc-sweep.json` or `doc-sweep.csv`.")


def append_high_ambiguity_section(lines: list[str], records: list[dict[str, Any]]) -> None:
    lines.extend(["", "## High Ambiguity Documents", ""])
    selected = [
        record
        for record in records
        if record["counts"]["ambiguous"] >= SWEEP_HIGH_AMBIGUITY_MIN
        or (
            record["counts"]["claims"]
            and record["counts"]["ambiguous"] / record["counts"]["claims"] >= SWEEP_HIGH_AMBIGUITY_RATIO
        )
    ]
    if not selected:
        lines.append("None.")
        return
    limit = 25
    for record in selected[:limit]:
        lines.append(f"- `{record['document_path']}`: `{record['counts']['ambiguous']}` ambiguous findings, action `{record['recommendation']}`")
    if len(selected) > limit:
        lines.append(f"- ... `{len(selected) - limit}` additional high-ambiguity records omitted; see `doc-sweep.json` or `doc-sweep.csv`.")


def append_compact_table(lines: list[str], records: list[dict[str, Any]]) -> None:
    lines.extend(["", "## Per-Document Summary", ""])
    lines.append("| Document | Class | Recommendation | Claims | Findings | Decision-grade | Report |")
    lines.append("| --- | --- | --- | ---: | ---: | ---: | --- |")
    for record in records:
        counts = record["counts"]
        lines.append(
            f"| `{record['document_path']}` | `{record['path_class']}` | `{record['recommendation']}` | "
            f"{counts['claims']} | {counts['findings']} | {counts['decision_grade']} | `{record['artifact_paths']['report']}` |"
        )


def append_next_queue(lines: list[str], sweep: dict[str, Any]) -> None:
    lines.extend(["", "## What To Inspect Next", ""])
    queue = review_queue_records(sweep)
    if not queue:
        lines.append("No update/quarantine/review-needed documents were found.")
        return
    limit = 20
    for record in queue[:limit]:
        lines.append(f"- `{record['recommendation']}` `{record['document_path']}`: {', '.join(record['reason_codes'])}")
        for finding in record.get("top_findings", [])[:3]:
            lines.append(
                f"  - `{finding.get('verdict')}` line `{finding.get('line_start')}` "
                f"rule `{finding.get('rule')}`: {finding.get('summary')}"
            )
    if len(queue) > limit:
        lines.append(f"- ... `{len(queue) - limit}` additional review-queue records omitted; see `doc-sweep-review-queue.json`.")


def write_sweep_csv(path: Path, sweep: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "document_path",
        "path_class",
        "recommendation",
        "confidence",
        "reason_codes",
        "claims",
        "findings",
        "decision_grade",
        "conflict",
        "deprecated_use",
        "ambiguous",
        "candidate_new",
        "suppressed_lines",
        "report",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in sweep["documents"]:
            counts = record["counts"]
            writer.writerow(
                {
                    "document_path": record["document_path"],
                    "path_class": record["path_class"],
                    "recommendation": record["recommendation"],
                    "confidence": record["confidence"],
                    "reason_codes": ";".join(record["reason_codes"]),
                    "claims": counts["claims"],
                    "findings": counts["findings"],
                    "decision_grade": counts["decision_grade"],
                    "conflict": counts["conflict"],
                    "deprecated_use": counts["deprecated_use"],
                    "ambiguous": counts["ambiguous"],
                    "candidate_new": counts["candidate_new"],
                    "suppressed_lines": counts["suppressed_lines"],
                    "report": record["artifact_paths"]["report"],
                }
            )


def sweep_turtle(sweep: dict[str, Any]) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix evidence: <https://rawr.dev/evidence/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    run_node = iri_fragment(sweep["run_id"])
    lines.append(f"evidence:{run_node} a rawr:DocumentSweep ;")
    lines.append(f"  rawr:gitSha {turtle_literal(sweep['git_sha'])} ;")
    lines.append(f"  rawr:documentsAnalyzed {turtle_literal(str(sweep['summary']['documents_analyzed']))} .")
    lines.append("")
    for record in sweep["documents"]:
        node = iri_fragment(f"doc-{record['document_path']}")
        lines.append(f"evidence:{node} a rawr:DocumentSweepRecord ;")
        lines.append(f"  rdfs:label {turtle_literal(record['document_path'])} ;")
        lines.append(f"  rawr:partOfSweep evidence:{run_node} ;")
        lines.append(f"  rawr:pathClass {turtle_literal(record['path_class'])} ;")
        lines.append(f"  rawr:recommendation {turtle_literal(record['recommendation'])} ;")
        lines.append(f"  rawr:confidence {turtle_literal(record['confidence'])} .")
        lines.append("")
        for item in record.get("top_findings", []):
            finding_node = iri_fragment(item.get("finding_id") or f"finding-{record['document_path']}-{item.get('line_start')}")
            claim_node = iri_fragment(item.get("claim_id") or f"claim-{record['document_path']}-{item.get('line_start')}")
            lines.append(f"evidence:{finding_node} a rawr:ReviewFinding ;")
            lines.append(f"  rawr:findingKind {turtle_literal(item.get('verdict') or '')} ;")
            lines.append(f"  rawr:derivedFrom evidence:{claim_node} ;")
            lines.append(f"  rawr:sourcePath {turtle_literal(item.get('source_path') or record['document_path'])} ;")
            lines.append(f"  rawr:lineStart {turtle_literal(str(item.get('line_start') or ''))} ;")
            lines.append(f"  rawr:lineEnd {turtle_literal(str(item.get('line_end') or ''))} ;")
            lines.append(f"  rawr:partOfSweepRecord evidence:{node} ;")
            if item.get("entity_id"):
                lines.append(f"  rawr:resolvedTarget rawr:{iri_fragment(item['entity_id'])} ;")
            lines.append(f"  rawr:rule {turtle_literal(item.get('rule') or '')} .")
            lines.append("")
    return "\n".join(lines)


def copy_core_run_files(base_run_dir: Path, run_dir: Path) -> None:
    for name in CORE_SWEEP_BASE_FILES:
        source = base_run_dir / name
        if source.exists() and source.is_file():
            shutil.copyfile(source, run_dir / name)


def source_authority_documents(graph: dict[str, Any]) -> set[str]:
    paths: set[str] = set()
    for collection_name in ["entities", "relations"]:
        for item in graph.get(collection_name, []):
            for source_ref in item.get("source_refs", []):
                path = source_ref.get("path")
                if path:
                    paths.add(path)
    return paths


def classify_document_path(document: Path, source_authority_paths: set[str], exclude_segments: list[str], *, explicit: bool) -> str:
    rel_path = rel(document)
    if rel_path in source_authority_paths:
        return "source-authority"
    if explicit and excluded_segment(document, exclude_segments):
        return "explicit-excluded-path"
    if ".context" in document.relative_to(REPO_ROOT).parts:
        return "context-provenance"
    return "active-doc"


def ambiguity_bucket_count(compare: dict[str, Any], bucket: str) -> int:
    return int(compare.get("summary", {}).get("ambiguous_by_bucket", {}).get(bucket, 0))


def ontology_metadata(run_dir: Path) -> dict[str, Any]:
    metadata_path = run_dir / CORE_GRAPH_FILENAMES["metadata"]
    metadata = read_json(metadata_path) if metadata_path.exists() else {}
    return {
        "version": metadata.get("kind", "rawr-core-ontology"),
        "source_files": [metadata.get("source")] if metadata.get("source") else [],
    }


def matches_include(path: Path, include_globs: list[str]) -> bool:
    rel_path = rel(path)
    if include_globs == DEFAULT_SWEEP_INCLUDE_GLOBS and path.suffix.lower() == ".md":
        return True
    return any(fnmatch.fnmatch(rel_path, pattern) or path.match(pattern) for pattern in include_globs)


def excluded_segment(path: Path, exclude_segments: list[str]) -> str | None:
    try:
        parts = path.relative_to(REPO_ROOT).parts
    except ValueError:
        parts = path.parts
    for segment in exclude_segments:
        if segment in parts:
            return segment
    return None


def resolve_repo_path(value: str) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = REPO_ROOT / path
    return path


def document_slug(document: Path) -> str:
    rel_path = rel(document)
    safe = "".join(character if character.isalnum() else "-" for character in rel_path).strip("-")
    digest = hashlib.sha256(rel_path.encode("utf-8")).hexdigest()[:10]
    return f"{safe[:80]}-{digest}"


def display_path(path: Path) -> str:
    try:
        return rel(path)
    except Exception:
        return str(path)
