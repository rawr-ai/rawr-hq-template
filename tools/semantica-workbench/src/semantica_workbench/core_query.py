from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .core_config import (
    CORE_GRAPH_FILENAMES,
    NAMED_QUERY_DESCRIPTIONS,
    SWEEP_HIGH_AMBIGUITY_MIN,
    SWEEP_HIGH_AMBIGUITY_RATIO,
    SWEEP_REVIEW_RECOMMENDATIONS,
)
from .core_query_contracts import (
    EVIDENCE_NAMED_QUERIES,
    PROPOSAL_NAMED_QUERIES,
    SEMANTIC_NAMED_QUERIES,
    SWEEP_NAMED_QUERIES,
)
from .core_query_rendering import (
    evidence_text_row as evidence_text_row,
    render_query_text as render_query_text,
    render_sparql_table as render_sparql_table,
    semantic_query_header as semantic_query_header,
)
from .io import read_json, resolve_run
from .paths import QUERIES_ROOT, REPO_ROOT


def list_queries() -> dict[str, Any]:
    sparql_examples = []
    if QUERIES_ROOT.exists():
        sparql_examples = sorted(str(path.relative_to(REPO_ROOT)) for path in QUERIES_ROOT.glob("*.rq"))
    return {"named_queries": NAMED_QUERY_DESCRIPTIONS, "sparql_examples": sparql_examples}


def run_named_query(run: str | None, name: str) -> dict[str, Any]:
    run_dir = resolve_run(run)
    graph = read_json(run_dir / CORE_GRAPH_FILENAMES["layered_graph"])
    diff_path = run_dir / CORE_GRAPH_FILENAMES["document_diff"]
    semantic_path = run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]
    frame_path = run_dir / CORE_GRAPH_FILENAMES["architecture_change_frame"]
    comparisons_path = run_dir / CORE_GRAPH_FILENAMES["claim_comparisons"]
    verdict_path = run_dir / CORE_GRAPH_FILENAMES["verdict_repair"]
    candidate_queue_path = run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]
    diff = read_json(diff_path) if diff_path.exists() else {"summary": {}}
    semantic = read_json(semantic_path) if semantic_path.exists() else None
    candidate_queue = read_json(candidate_queue_path) if candidate_queue_path.exists() else {}
    if name == "summary":
        return {
            "query": name,
            "run": display_path(run_dir),
            "summary": graph["summary"],
            "diff_summary": diff.get("summary", {}),
            "semantic_summary": (semantic or {}).get("summary", {}),
            "candidate_count": len(candidate_queue.get("candidates", [])),
        }
    if name == "semantica-review-surface":
        from .semantica_review_surface import semantica_review_surface_probe

        return {
            "query": name,
            "run": display_path(run_dir),
            "artifact": None,
            "surface": semantica_review_surface_probe(run_dir, graph, candidate_queue),
        }
    if name == "forbidden-terms":
        forbidden = [
            entity
            for entity in graph["entities"]
            if entity.get("status") == "forbidden" or entity.get("type") == "ForbiddenPattern"
        ]
        edges = [relation for relation in graph["relations"] if relation.get("predicate") in {"forbids", "replaces"}]
        return {"query": name, "entities": forbidden, "relations": edges}
    if name == "underrepresented-gates":
        return {"query": name, "items": diff.get("underrepresented_gates", []), "summary": diff.get("summary", {})}
    if name == "relations-by-predicate":
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for relation in graph["relations"]:
            grouped[relation["predicate"]].append(relation)
        return {
            "query": name,
            "predicates": [
                {"predicate": predicate, "count": len(relations), "samples": relations[:5]}
                for predicate, relations in sorted(grouped.items())
            ],
        }
    if name == "source-coverage":
        return {
            "query": name,
            "entities": source_coverage_rows(graph["canonical_view"]["entities"]),
            "relations": source_coverage_rows(graph["canonical_view"]["relations"]),
        }
    if name == "testing-plan-review-needed":
        return {"query": name, "items": diff.get("review_needed", []), "summary": diff.get("summary", {})}
    if name in SEMANTIC_NAMED_QUERIES:
        semantic = require_semantic_compare(run_dir, semantic_path, semantic)
    if name in PROPOSAL_NAMED_QUERIES:
        proposal = require_proposal_package(run_dir, frame_path, comparisons_path, verdict_path)
    if name in EVIDENCE_NAMED_QUERIES:
        evidence_path = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index"]
        evidence_index = require_evidence_index(run_dir, evidence_path)
    if name in SWEEP_NAMED_QUERIES:
        sweep_path = run_dir / CORE_GRAPH_FILENAMES["doc_sweep"]
        sweep = require_doc_sweep(run_dir, sweep_path)
    if name == "proposal-review-summary":
        return {
            "query": name,
            "run": display_path(run_dir),
            "artifact": display_path(verdict_path),
            "frame": proposal["frame"],
            "summary": proposal["verdict"].get("summary", {}),
            "overall_verdict": proposal["verdict"].get("overall_verdict"),
            "recommended_next_action": proposal["verdict"].get("recommended_next_action"),
            "claim_comparisons": proposal["comparisons"].get("comparisons", []),
        }
    if name == "proposal-repair-queue":
        repair_steps = proposal["verdict"].get("repair_steps", [])
        return {
            "query": name,
            "run": display_path(run_dir),
            "artifact": display_path(verdict_path),
            "frame_id": proposal["frame"].get("frame_id"),
            "document": proposal["frame"].get("document", {}).get("source_path"),
            "summary": proposal["verdict"].get("summary", {}),
            "items": repair_steps,
        }
    if name == "sweep-summary":
        return sweep_query_result(run_dir, sweep_path, name, sweep, sweep.get("documents", []), item_key="documents")
    if name == "sweep-review-queue":
        queue_path = run_dir / CORE_GRAPH_FILENAMES["doc_sweep_review_queue"]
        queue = read_json(queue_path) if queue_path.exists() else {"documents": sweep_review_queue(sweep)}
        return sweep_query_result(
            run_dir, queue_path if queue_path.exists() else sweep_path, name, sweep, queue.get("documents", [])
        )
    if name == "sweep-quarantine-candidates":
        return sweep_query_result(
            run_dir,
            run_dir / CORE_GRAPH_FILENAMES["sweep_quarantine_candidates"],
            name,
            sweep,
            [record for record in sweep.get("documents", []) if record.get("recommendation") == "quarantine-candidate"],
        )
    if name == "sweep-update-candidates":
        return sweep_query_result(
            run_dir,
            run_dir / CORE_GRAPH_FILENAMES["sweep_update_candidates"],
            name,
            sweep,
            [record for record in sweep.get("documents", []) if record.get("recommendation") == "update-needed"],
        )
    if name == "sweep-no-signal-documents":
        return sweep_query_result(
            run_dir,
            run_dir / CORE_GRAPH_FILENAMES["sweep_no_signal_documents"],
            name,
            sweep,
            [record for record in sweep.get("documents", []) if record.get("recommendation") == "outside-scope"],
        )
    if name == "sweep-high-ambiguity-docs":
        items = [
            record
            for record in sweep.get("documents", [])
            if record.get("counts", {}).get("ambiguous", 0) >= SWEEP_HIGH_AMBIGUITY_MIN
            or (
                record.get("counts", {}).get("claims", 0)
                and record.get("counts", {}).get("ambiguous", 0) / record.get("counts", {}).get("claims", 1)
                >= SWEEP_HIGH_AMBIGUITY_RATIO
            )
        ]
        return sweep_query_result(run_dir, sweep_path, name, sweep, items)
    if name == "evidence-summary":
        return evidence_summary_query_result(run_dir, evidence_path, evidence_index)
    if name == "evidence-review-queue":
        items = sorted(
            [finding for finding in evidence_index.get("findings", []) if evidence_review_queue_finding(finding)],
            key=evidence_sort_key,
        )
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, items)
    if name == "evidence-candidate-new":
        items = sorted(
            [finding for finding in evidence_index.get("findings", []) if finding.get("kind") == "candidate-new"],
            key=evidence_sort_key,
        )
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, items)
    if name == "evidence-unresolved-targets":
        items = sorted(
            [
                finding
                for finding in evidence_index.get("findings", [])
                if finding.get("resolution_state") == "unresolved"
                or finding.get("ambiguity_bucket") == "unresolved-target"
                or finding.get("rule") == "no_resolved_decision_target"
            ],
            key=evidence_sort_key,
        )
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, items)
    if name == "evidence-source-authority-signals":
        source_documents = [
            document
            for document in evidence_index.get("documents", [])
            if document.get("path_class") == "source-authority"
        ]
        source_paths = {document.get("document_path") for document in source_documents}
        source_findings = sorted(
            [
                finding
                for finding in evidence_index.get("findings", [])
                if finding.get("sweep_document_path") in source_paths or finding.get("document_path") in source_paths
            ],
            key=evidence_sort_key,
        )
        return evidence_query_result(
            run_dir,
            evidence_path,
            name,
            evidence_index,
            source_findings,
            documents=source_documents,
        )
    if name == "evidence-prohibited-pattern-mentions":
        items = sorted(
            [finding for finding in evidence_index.get("findings", []) if prohibited_pattern_finding(finding)],
            key=evidence_sort_key,
        )
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, items)
    if name == "evidence-weak-modality-hotspots":
        hotspots = weak_modality_hotspots(evidence_index)
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, hotspots, item_key="hotspots")
    if name == "evidence-by-document":
        documents = evidence_by_document(evidence_index)
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, documents, item_key="documents")
    if name == "evidence-by-entity":
        entities = evidence_by_entity(evidence_index)
        return evidence_query_result(run_dir, evidence_path, name, evidence_index, entities, item_key="entities")
    if name == "evidence-agent-manifest":
        manifest_path = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_agent_manifest"]
        if not manifest_path.exists():
            raise FileNotFoundError(
                "Evidence agent manifest does not exist for this run. "
                "Run `bun run semantica:doc:sweep` or `bun run semantica:doc:index -- --run <run>` first."
            )
        manifest = read_json(manifest_path)
        return {
            "query": name,
            "run": display_path(run_dir),
            "artifact": display_path(manifest_path),
            "authority_boundary": manifest.get("authority_boundary", {}),
            "summary": manifest.get("generated_from", {}).get("summary", {}),
            "manifest": manifest,
        }
    if name == "semantic-conflicts":
        return semantic_query_result(run_dir, semantic_path, name, semantic.get("conflicts", []), semantic)
    if name == "aligned-rejections":
        items = [
            item
            for item in semantic.get("aligned", [])
            if item.get("rule") == "negative_or_prohibitive_claim_rejects_prohibited_construction"
        ]
        return semantic_query_result(run_dir, semantic_path, name, items, semantic)
    if name == "deprecated-uses":
        return semantic_query_result(run_dir, semantic_path, name, semantic.get("deprecated_uses", []), semantic)
    if name == "ambiguous-claims":
        return semantic_query_result(run_dir, semantic_path, name, semantic.get("ambiguous", []), semantic)
    if name == "candidate-new":
        return semantic_query_result(run_dir, semantic_path, name, semantic.get("candidate_new", []), semantic)
    if name == "ambiguity-summary":
        buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in semantic.get("ambiguous", []):
            buckets[item.get("ambiguity_bucket") or "unbucketed"].append(item)
        rows = [
            {
                "bucket": bucket,
                "count": len(items),
                "review_action": items[0].get("review_action") if items else None,
                "examples": items[:5],
            }
            for bucket, items in sorted(buckets.items())
        ]
        return semantic_query_result(run_dir, semantic_path, name, rows, semantic, item_key="buckets")
    if name == "entityless-findings":
        items = [item for item in semantic.get("findings", []) if not item.get("entity_id")]
        return semantic_query_result(run_dir, semantic_path, name, items, semantic)
    if name == "verification-policy-gaps":
        items = [
            item for item in semantic.get("ambiguous", []) if item.get("ambiguity_bucket") == "subordinate-policy-gap"
        ]
        return semantic_query_result(run_dir, semantic_path, name, items, semantic)
    if name == "decision-review-queue":
        items = [
            *semantic.get("conflicts", []),
            *semantic.get("deprecated_uses", []),
            *semantic.get("candidate_new", []),
            *semantic.get("ambiguous", []),
        ]
        return semantic_query_result(run_dir, semantic_path, name, items, semantic)
    raise ValueError(f"Unknown named query `{name}`. Use --list to see available queries.")


def require_semantic_compare(run_dir: Path, semantic_path: Path, semantic: dict[str, Any] | None) -> dict[str, Any]:
    if semantic is None:
        raise FileNotFoundError(
            "Semantic named query requires semantic comparison output. "
            f"No artifact exists at {display_path(semantic_path)} for run {display_path(run_dir)}. "
            "Run `bun run semantica:doc:compare -- --fixture` or "
            "`bun run semantica:doc:diff -- --mode semantic --document <path>` first."
        )
    return semantic


def require_doc_sweep(run_dir: Path, sweep_path: Path) -> dict[str, Any]:
    if not sweep_path.exists():
        raise FileNotFoundError(
            "Sweep named query requires document sweep output. "
            f"No artifact exists at {display_path(sweep_path)} for run {display_path(run_dir)}. "
            "Run `bun run semantica:doc:sweep -- --root docs` first."
        )
    return read_json(sweep_path)


def require_evidence_index(run_dir: Path, evidence_path: Path) -> dict[str, Any]:
    if not evidence_path.exists():
        raise FileNotFoundError(
            "Evidence named query requires a corpus sweep evidence index. "
            f"No artifact exists at {display_path(evidence_path)} for run {display_path(run_dir)}. "
            "Run `bun run semantica:doc:sweep` or `bun run semantica:doc:index -- --run <run>` first."
        )
    return read_json(evidence_path)


def require_proposal_package(
    run_dir: Path, frame_path: Path, comparisons_path: Path, verdict_path: Path
) -> dict[str, Any]:
    missing = [path for path in [frame_path, comparisons_path, verdict_path] if not path.exists()]
    if missing:
        missing_text = ", ".join(display_path(path) for path in missing)
        raise FileNotFoundError(
            "Proposal named query requires architecture proposal comparison output. "
            f"Missing {missing_text} for run {display_path(run_dir)}. "
            "Run `bun run semantica:doc:proposal-compare -- --fixture` first."
        )
    return {
        "frame": read_json(frame_path),
        "comparisons": read_json(comparisons_path),
        "verdict": read_json(verdict_path),
    }


def evidence_summary_query_result(run_dir: Path, artifact_path: Path, index: dict[str, Any]) -> dict[str, Any]:
    return {
        "query": "evidence-summary",
        "run": display_path(run_dir),
        "artifact": display_path(artifact_path),
        "schema_version": index.get("schema_version"),
        "run_id": index.get("run_id"),
        "git_sha": index.get("git_sha"),
        "created_at": index.get("created_at"),
        "authority_boundary": index.get("authority_boundary", {}),
        "summary": index.get("summary", {}),
        "source_sweep": index.get("source_sweep", {}),
        "warnings": index.get("warnings", []),
    }


def evidence_query_result(
    run_dir: Path,
    artifact_path: Path,
    name: str,
    index: dict[str, Any],
    items: list[dict[str, Any]],
    *,
    item_key: str = "items",
    documents: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "query": name,
        "run": display_path(run_dir),
        "artifact": display_path(artifact_path),
        "schema_version": index.get("schema_version"),
        "run_id": index.get("run_id"),
        "authority_boundary": index.get("authority_boundary", {}),
        "summary": index.get("summary", {}),
        item_key: items,
    }
    if documents is not None:
        result["documents"] = documents
    return result


def evidence_review_queue_finding(finding: dict[str, Any]) -> bool:
    review_action = str(finding.get("review_action") or "")
    if review_action.startswith("No action required") or review_action.startswith("No architecture action"):
        return False
    if finding.get("kind") == "outside-scope":
        return False
    if finding.get("decision_grade"):
        return True
    if finding.get("kind") in {"ambiguous", "candidate-new"}:
        return True
    if review_action and not review_action.startswith("No action required"):
        return True
    return False


def prohibited_pattern_finding(finding: dict[str, Any]) -> bool:
    entity_id = str(finding.get("entity_id") or "")
    rule = str(finding.get("rule") or "")
    return (
        finding.get("resolution_state") == "resolved-prohibited-construction"
        or entity_id.startswith("forbidden.pattern.")
        or "prohibited" in rule
    )


def weak_modality_hotspots(index: dict[str, Any]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for finding in index.get("findings", []):
        if finding.get("ambiguity_bucket") == "weak-modality":
            grouped[
                str(finding.get("sweep_document_path") or finding.get("document_path") or "unknown-document")
            ].append(finding)
    rows = []
    for document_path, findings in grouped.items():
        rows.append(
            {
                "document_path": document_path,
                "weak_modality_count": len(findings),
                "examples": sorted(findings, key=evidence_sort_key)[:5],
            }
        )
    return sorted(rows, key=lambda row: (-row["weak_modality_count"], row["document_path"]))


def evidence_by_document(index: dict[str, Any]) -> list[dict[str, Any]]:
    findings_by_document: dict[str, list[dict[str, Any]]] = defaultdict(list)
    claims_by_document: Counter[str] = Counter()
    for claim in index.get("claims", []):
        claims_by_document[
            str(claim.get("sweep_document_path") or claim.get("document_path") or "unknown-document")
        ] += 1
    for finding in index.get("findings", []):
        findings_by_document[
            str(finding.get("sweep_document_path") or finding.get("document_path") or "unknown-document")
        ].append(finding)
    rows = []
    for document in index.get("documents", []):
        document_path = str(document.get("document_path") or "unknown-document")
        findings = findings_by_document.get(document_path, [])
        rows.append(
            {
                "document_path": document_path,
                "path_class": document.get("path_class"),
                "recommendation": document.get("recommendation"),
                "confidence": document.get("confidence"),
                "claim_count": claims_by_document.get(document_path, 0),
                "finding_count": len(findings),
                "decision_grade_count": sum(1 for finding in findings if finding.get("decision_grade")),
                "candidate_new_count": sum(1 for finding in findings if finding.get("kind") == "candidate-new"),
                "ambiguous_count": sum(1 for finding in findings if finding.get("kind") == "ambiguous"),
                "unresolved_target_count": sum(
                    1
                    for finding in findings
                    if finding.get("resolution_state") == "unresolved"
                    or finding.get("ambiguity_bucket") == "unresolved-target"
                ),
                "artifact_paths": document.get("artifact_paths", {}),
                "report_html_artifact": document.get("report_html_artifact"),
                "examples": sorted(findings, key=evidence_sort_key)[:5],
            }
        )
    return sorted(
        rows,
        key=lambda row: (
            -row["decision_grade_count"],
            -row["candidate_new_count"],
            -row["finding_count"],
            row["document_path"],
        ),
    )


def evidence_by_entity(index: dict[str, Any]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for finding in index.get("findings", []):
        entity_id = finding.get("entity_id")
        if entity_id:
            grouped[str(entity_id)].append(finding)
    rows = []
    for entity_id, findings in grouped.items():
        rows.append(
            {
                "entity_id": entity_id,
                "label": next((finding.get("label") for finding in findings if finding.get("label")), None),
                "finding_count": len(findings),
                "decision_grade_count": sum(1 for finding in findings if finding.get("decision_grade")),
                "kind_counts": dict(
                    sorted(Counter(str(finding.get("kind") or "unknown") for finding in findings).items())
                ),
                "document_count": len(
                    {finding.get("sweep_document_path") or finding.get("document_path") for finding in findings}
                ),
                "examples": sorted(findings, key=evidence_sort_key)[:5],
            }
        )
    return sorted(rows, key=lambda row: (-row["decision_grade_count"], -row["finding_count"], row["entity_id"]))


def evidence_sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
    return (
        str(row.get("sweep_document_path") or row.get("document_path") or ""),
        row.get("line_start") or 0,
        str(row.get("finding_id") or row.get("index_id") or ""),
    )


def sweep_query_result(
    run_dir: Path,
    artifact_path: Path,
    name: str,
    sweep: dict[str, Any],
    items: list[dict[str, Any]],
    *,
    item_key: str = "items",
) -> dict[str, Any]:
    return {
        "query": name,
        "run": display_path(run_dir),
        "artifact": display_path(artifact_path),
        "summary": sweep.get("summary", {}),
        item_key: items,
    }


def sweep_review_queue(sweep: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        record
        for record in sweep.get("documents", [])
        if record.get("recommendation") in SWEEP_REVIEW_RECOMMENDATIONS
        or (
            record.get("recommendation") == "source-authority" and record.get("counts", {}).get("decision_grade", 0) > 0
        )
    ]


def semantic_query_result(
    run_dir: Path,
    semantic_path: Path,
    name: str,
    items: list[dict[str, Any]],
    semantic: dict[str, Any],
    *,
    item_key: str = "items",
) -> dict[str, Any]:
    return {
        "query": name,
        "run": display_path(run_dir),
        "artifact": display_path(semantic_path) if semantic_path.exists() else None,
        "document": semantic.get("document"),
        "summary": semantic.get("summary", {}),
        item_key: items,
    }


def source_coverage_rows(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for item in items:
        source_refs = item.get("source_refs", [])
        rows.append(
            {
                "id": item["id"],
                "label": item.get("label"),
                "layer": item.get("layer"),
                "status": item.get("status"),
                "source_ref_count": len(source_refs),
                "resolved_source_ref_count": sum(1 for ref in source_refs if ref.get("resolved")),
                "source_refs": source_refs,
            }
        )
    return sorted(rows, key=lambda row: (row["source_ref_count"], row["id"]))


def run_sparql_query(run: str | None, sparql_path: Path) -> dict[str, Any]:
    try:
        from rdflib import Graph
    except ImportError as exc:
        raise RuntimeError("RDFLib is required for SPARQL queries. Run `bun run semantica:setup` first.") from exc

    run_dir = resolve_run(run)
    if not sparql_path.is_absolute():
        sparql_path = REPO_ROOT / sparql_path
    query = sparql_path.read_text(encoding="utf-8")
    graph = Graph()
    evidence_ttl = run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]
    sweep_ttl = run_dir / CORE_GRAPH_FILENAMES["doc_sweep_ttl"]
    ttl_path = run_dir / CORE_GRAPH_FILENAMES["semantica_data_graph"]
    evidence_index_ttl = run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"]
    graph_mode = sparql_graph_mode(sparql_path)
    if graph_mode == "evidence-index":
        if not evidence_index_ttl.exists():
            raise FileNotFoundError(
                f"No evidence index graph exists at {evidence_index_ttl}. "
                "Run `bun run semantica:doc:sweep` or `bun run semantica:doc:index -- --run <run>` first."
            )
        graph.parse(evidence_index_ttl, format="turtle")
    elif graph_mode == "semantic-evidence":
        if not evidence_ttl.exists():
            raise FileNotFoundError(
                f"No semantic evidence graph exists at {evidence_ttl}. "
                "Run `bun run semantica:doc:compare` or another document evidence command first."
            )
        graph.parse(evidence_ttl, format="turtle")
    else:
        if not ttl_path.exists():
            raise FileNotFoundError(
                f"No RDF data graph exists at {ttl_path}. Run `bun run semantica:core:export` first."
            )
        graph.parse(ttl_path, format="turtle")
    result = graph.query(query)
    variables = [str(variable) for variable in result.vars]
    rows = []
    for row in result:
        rows.append({variable: stringify_sparql_value(value) for variable, value in zip(variables, row, strict=False)})
    return {
        "query": str(sparql_path.relative_to(REPO_ROOT)),
        "graph_mode": graph_mode,
        "data_graph": display_path(ttl_path) if ttl_path.exists() else None,
        "evidence_graph": display_path(evidence_ttl)
        if graph_mode == "semantic-evidence" and evidence_ttl.exists()
        else None,
        "sweep_graph": display_path(sweep_ttl) if graph_mode == "doc-sweep" and sweep_ttl.exists() else None,
        "evidence_index_graph": display_path(evidence_index_ttl)
        if graph_mode == "evidence-index" and evidence_index_ttl.exists()
        else None,
        "row_count": len(rows),
        "variables": variables,
        "rows": rows,
    }


def sparql_graph_mode(sparql_path: Path) -> str:
    name = sparql_path.name
    if name.startswith("evidence-"):
        return "evidence-index"
    if name == "semantic-findings.rq":
        return "semantic-evidence"
    return "core"


def stringify_sparql_value(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)
