from __future__ import annotations

from pathlib import Path
from typing import Any

from .core_config import CORE_GRAPH_FILENAMES
from .io import read_json

REQUIRED_REVIEW_TOOLS = {
    "extract_entities",
    "extract_relations",
    "run_reasoning",
    "export_graph",
    "get_graph_summary",
}

REQUIRED_REVIEW_RESOURCES = {
    "semantica://graph/summary",
    "semantica://schema/info",
}


def semantica_review_surface_probe(
    run_dir: Path, graph: dict[str, Any], candidate_queue: dict[str, Any]
) -> dict[str, Any]:
    semantic_path = run_dir / CORE_GRAPH_FILENAMES["semantic_compare"]
    semantic_exists = semantic_path.exists()
    semantic = read_json(semantic_path) if semantic_exists else {}
    export_path = run_dir / CORE_GRAPH_FILENAMES["semantica_export"]
    semantica_export = read_json(export_path) if export_path.exists() else {}
    tool_names, resource_uris, mcp_status = mcp_inventory()
    export_status = export_inventory(run_dir, semantica_export)
    visualization_status = visualization_inventory(run_dir)
    return {
        "schema_version": "rawr-semantica-review-surface-v1",
        "run": str(run_dir),
        "mcp": {
            **mcp_status,
            "tool_names": tool_names,
            "resource_uris": resource_uris,
            "required_review_tools_present": sorted(REQUIRED_REVIEW_TOOLS & set(tool_names)),
            "missing_review_tools": sorted(REQUIRED_REVIEW_TOOLS - set(tool_names)),
            "required_review_resources_present": sorted(REQUIRED_REVIEW_RESOURCES & set(resource_uris)),
            "missing_review_resources": sorted(REQUIRED_REVIEW_RESOURCES - set(resource_uris)),
        },
        "review_affordances": {
            "stable_query_interface": "semantica:core:query -- --named semantica-review-surface",
            "rawr_cli_wrapper_retained": True,
            "scrape_semantica_current_required": False,
            "semantica_output_authoritative": False,
        },
        "separation": {
            "canonical_entity_count": len(graph.get("canonical_view", {}).get("entities", [])),
            "candidate_count": len(candidate_queue.get("candidates", [])),
            "semantic_compare_artifact_present": semantic_exists,
            "semantic_compare_status": "present" if semantic_exists else "missing-run-doc-compare-first",
            "finding_count": len(semantic.get("findings", [])) if semantic_exists else None,
            "decision_grade_finding_count": semantic.get("summary", {}).get("decision_grade_finding_count")
            if semantic_exists
            else None,
            "target_view_excludes_candidates": target_view_excludes_candidates(graph, candidate_queue),
            "evidence_is_not_target_truth": True,
        },
        "export": export_status,
        "visualization": visualization_status,
        "fallback": {
            "cytoscape_static_artifact_retained": True,
            "removal_trigger": "Replace or reduce Cytoscape only after semantica visualization/export preserves RAWR IDs, source lineage, candidate separation, and review finding context.",
        },
    }


def mcp_inventory() -> tuple[list[str], list[str], dict[str, Any]]:
    try:
        from semantica import mcp_server

        tools = getattr(mcp_server, "TOOLS", [])
        resources = getattr(mcp_server, "RESOURCES", [])
        return (
            [item.get("name") for item in tools if isinstance(item, dict) and item.get("name")],
            [item.get("uri") for item in resources if isinstance(item, dict) and item.get("uri")],
            {
                "available": True,
                "server_info": getattr(mcp_server, "SERVER_INFO", {}),
                "capabilities": getattr(mcp_server, "CAPABILITIES", {}),
            },
        )
    except Exception as exc:
        return [], [], {"available": False, "error": str(exc)}


def export_inventory(run_dir: Path, semantica_export: dict[str, Any]) -> dict[str, Any]:
    try:
        from semantica import export as semantica_export_module

        exporters = [
            name
            for name in [
                "RDFExporter",
                "JSONExporter",
                "GraphExporter",
                "OWLExporter",
                "CSVExporter",
            ]
            if hasattr(semantica_export_module, name)
        ]
        available = True
    except Exception as exc:
        exporters = []
        available = False
        error = str(exc)
    else:
        error = None
    output_paths = semantica_export.get("outputs", {})
    local_outputs = {
        "semantica_export_json": (run_dir / CORE_GRAPH_FILENAMES["semantica_export"]).exists(),
        "data_graph_ttl": (run_dir / CORE_GRAPH_FILENAMES["semantica_data_graph"]).exists(),
        "graphml": (run_dir / CORE_GRAPH_FILENAMES["graphml"]).exists(),
        "semantic_evidence_ttl": (run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]).exists(),
    }
    preservation_validated = bool(
        local_outputs["semantica_export_json"] and (local_outputs["data_graph_ttl"] or local_outputs["graphml"])
    )
    return {
        "available": available,
        "error": error,
        "exporters_present": exporters,
        "local_outputs_present": local_outputs,
        "semantica_outputs": output_paths,
        "rawr_export_contract": {
            "source_lineage_required": True,
            "candidate_separation_required": True,
            "preservation_validated": preservation_validated,
            "validation_status": "validated-from-local-outputs"
            if preservation_validated
            else "not-validated-run-core-export-first",
        },
    }


def visualization_inventory(run_dir: Path) -> dict[str, Any]:
    try:
        from semantica import visualization

        visualizers = [
            name
            for name in [
                "KGVisualizer",
                "OntologyVisualizer",
                "SemanticNetworkVisualizer",
                "AnalyticsVisualizer",
            ]
            if hasattr(visualization, name)
        ]
        available = True
    except Exception as exc:
        visualizers = []
        available = False
        error = str(exc)
    else:
        error = None
    return {
        "available": available,
        "error": error,
        "visualizers_present": visualizers,
        "static_viewer_present": (run_dir / CORE_GRAPH_FILENAMES["viewer"]).exists(),
        "decision": "evaluate-semantica-visualizers-before-expanding-cytoscape",
    }


def target_view_excludes_candidates(graph: dict[str, Any], candidate_queue: dict[str, Any]) -> bool:
    target_entities = graph.get("target_architecture_view", {}).get("entities", [])
    if not target_entities:
        target_entities = graph.get("layered_graph", {}).get("target_architecture_view", {}).get("entities", [])
    target_ids = {entity.get("id") for entity in target_entities}
    candidate_ids = {candidate.get("id") for candidate in candidate_queue.get("candidates", [])}
    candidate_like_target_entities = [
        entity
        for entity in target_entities
        if entity.get("status") in {"candidate", "tbd", "evidence-only"}
        or entity.get("type") in {"CandidateEntity", "EvidenceClaim", "ReviewFinding"}
    ]
    return not bool(target_ids & candidate_ids) and not candidate_like_target_entities
