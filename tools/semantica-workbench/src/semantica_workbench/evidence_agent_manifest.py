from __future__ import annotations

from pathlib import Path
from typing import Any

from .core_config import CORE_GRAPH_FILENAMES, NAMED_QUERY_DESCRIPTIONS
from .io import rel, write_json
from .semantica_review_surface import mcp_inventory

EVIDENCE_AGENT_MANIFEST_SCHEMA_VERSION = "rawr-sweep-evidence-agent-manifest-v1"

AGENT_EVIDENCE_QUERIES = [
    "evidence-summary",
    "evidence-review-queue",
    "evidence-candidate-new",
    "evidence-unresolved-targets",
    "evidence-source-authority-signals",
    "evidence-prohibited-pattern-mentions",
    "evidence-weak-modality-hotspots",
    "evidence-by-document",
    "evidence-by-entity",
]

AGENT_EVIDENCE_SPARQL = [
    {
        "path": "tools/semantica-workbench/queries/evidence-candidate-new.rq",
        "usage": "review_rows",
        "preserves_review_context": True,
    },
    {
        "path": "tools/semantica-workbench/queries/evidence-decision-grade.rq",
        "usage": "review_rows",
        "preserves_review_context": True,
    },
    {
        "path": "tools/semantica-workbench/queries/evidence-prohibited-patterns.rq",
        "usage": "review_rows",
        "preserves_review_context": True,
    },
    {
        "path": "tools/semantica-workbench/queries/evidence-entity-findings.rq",
        "usage": "aggregate_only",
        "preserves_review_context": False,
    },
]


def write_evidence_agent_manifest(run_dir: Path, index: dict[str, Any]) -> dict[str, Any]:
    manifest = build_evidence_agent_manifest(run_dir, index)
    write_json(run_dir / CORE_GRAPH_FILENAMES["sweep_evidence_agent_manifest"], manifest)
    return manifest


def build_evidence_agent_manifest(run_dir: Path, index: dict[str, Any]) -> dict[str, Any]:
    tool_names, resource_uris, mcp_status = mcp_inventory()
    run_arg = rel(run_dir)
    query_commands = [
        {
            "name": name,
            "description": NAMED_QUERY_DESCRIPTIONS[name],
            "json_command": f"bun run semantica:core:query -- --run {run_arg} --named {name} --format json",
            "text_command": f"bun run semantica:core:query -- --run {run_arg} --named {name} --format text",
        }
        for name in AGENT_EVIDENCE_QUERIES
    ]
    sparql_commands = [
        {
            "path": item["path"],
            "graph_mode": "evidence-index",
            "usage": item["usage"],
            "preserves_review_context": item["preserves_review_context"],
            "json_command": f"bun run semantica:core:query -- --run {run_arg} --sparql {item['path']} --format json",
            "text_command": f"bun run semantica:core:query -- --run {run_arg} --sparql {item['path']} --format text",
        }
        for item in AGENT_EVIDENCE_SPARQL
    ]
    artifacts = {
        "index_json": artifact_path(run_dir, "sweep_evidence_index"),
        "index_jsonl": artifact_path(run_dir, "sweep_evidence_index_jsonl"),
        "index_summary_json": artifact_path(run_dir, "sweep_evidence_index_summary"),
        "index_html": artifact_path(run_dir, "sweep_evidence_index_html"),
        "index_ttl": artifact_path(run_dir, "sweep_evidence_index_ttl"),
        "doc_sweep_json": artifact_path(run_dir, "doc_sweep"),
        "doc_sweep_html": artifact_path(run_dir, "doc_sweep_report_html"),
    }
    return {
        "schema_version": EVIDENCE_AGENT_MANIFEST_SCHEMA_VERSION,
        "run": run_arg,
        "run_id": index.get("run_id"),
        "git_sha": index.get("git_sha"),
        "generated_from": {
            "artifact": artifacts["index_json"],
            "schema_version": index.get("schema_version"),
            "summary": index.get("summary", {}),
        },
        "authority_boundary": {
            **index.get("authority_boundary", {}),
            "agent_outputs_are_review_aids": True,
            "agents_must_not_promote_candidates": True,
            "direct_source_reading_remains_final_judgment": True,
        },
        "stable_interfaces": {
            "list_queries": "bun run semantica:core:query -- --list",
            "named_queries": query_commands,
            "sparql_examples": sparql_commands,
            "preferred_input_contract": "Use named query JSON first; use source_path/line spans from rows for direct document inspection.",
            "review_decision_contract": "Use review_rows interfaces for source-backed decisions. Aggregate-only interfaces are triage signals.",
            "do_not_scrape": [".semantica/current", "*.html"],
        },
        "artifact_contract": artifacts,
        "question_map": [
            {
                "question": "What should a reviewer inspect first across the corpus?",
                "query": "evidence-review-queue",
            },
            {
                "question": "Which new concepts are evidence-only candidates?",
                "query": "evidence-candidate-new",
            },
            {
                "question": "Which resolved target concepts have the most evidence pressure?",
                "query": "evidence-by-entity",
                "authority_note": "Includes reviewed ontology targets and evidence-only candidate/prohibited targets; inspect row examples before treating as reviewed ontology pressure.",
            },
            {
                "question": "Where do prohibited-pattern mentions appear?",
                "query": "evidence-prohibited-pattern-mentions",
            },
            {
                "question": "Which source-authority documents contain architecture signals?",
                "query": "evidence-source-authority-signals",
            },
        ],
        "mcp": {
            **mcp_status,
            "tool_names": tool_names,
            "resource_uris": resource_uris,
            "generic_semantica_mcp_status": "available" if mcp_status.get("available") else "blocked",
            "rawr_evidence_access_status": "not-wired",
            "usage_policy": "Use named RAWR CLI queries for generated evidence. Semantica MCP inventory is recorded here only as generic package capability until a RAWR evidence resource/tool is explicitly wired and tested.",
        },
    }


def artifact_path(run_dir: Path, key: str) -> str | None:
    path = run_dir / CORE_GRAPH_FILENAMES[key]
    return rel(path) if path.exists() else None
