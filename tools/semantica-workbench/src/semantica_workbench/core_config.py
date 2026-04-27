from __future__ import annotations

from pathlib import Path
from typing import Any

from .paths import REPO_ROOT, VIEWER_ROOT

CORE_GRAPH_FILENAMES = {
    "metadata": "metadata.json",
    "validation_report": "validation-report.json",
    "canonical_graph": "canonical-graph.json",
    "layered_graph": "layered-graph.json",
    "candidate_queue": "candidate-queue.json",
    "summary": "core-ontology-summary.json",
    "report": "report.md",
    "semantica_export": "semantica-export.json",
    "semantica_ontology": "semantica-ontology.json",
    "semantica_owl": "semantica-ontology.owl",
    "semantica_shacl": "semantica-ontology.shacl.ttl",
    "semantica_data_graph": "semantica-data-graph.ttl",
    "graphml": "core-ontology.graphml",
    "viewer": "graph-viewer.html",
    "document_diff": "document-diff.json",
    "document_diff_report": "document-diff-report.md",
}

CORE_CURRENT_FILES = list(CORE_GRAPH_FILENAMES.values())

DEFAULT_TESTING_PLAN_CANDIDATES = [
    REPO_ROOT / "docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Testing_Plan.md",
    REPO_ROOT / "docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md",
]

DIFF_SUMMARY = (
    REPO_ROOT
    / "docs/projects/rawr-final-architecture-migration/.context/core-architecture-ontology-workflow/phase-4-testing-plan-diff-verification.md"
)

DEFAULT_CORE_VIEWER_HOST = "127.0.0.1"
DEFAULT_CORE_VIEWER_PORT = 8765
CYTOSCAPE_BUNDLE = REPO_ROOT / "node_modules/cytoscape/dist/cytoscape.min.js"
VIEWER_CSS = VIEWER_ROOT / "graph-viewer.css"
VIEWER_JS = VIEWER_ROOT / "graph-viewer.js"
VIEWER_TITLE = "RAWR Core Ontology Graph"
VIEWER_SUBTITLE = "Derived inspection surface. Reviewed YAML ontology remains authoritative."

LAYER_COLORS = {
    "core": "#2f6fed",
    "runtime-realization-overlay": "#00856f",
    "authority-and-document-overlay": "#b54708",
    "classifier-readiness-overlay": "#7a5af8",
    "candidate-queue": "#667085",
}

STATUS_COLORS = {
    "locked": "#12b76a",
    "forbidden": "#f04438",
    "deprecated": "#f79009",
    "tbd": "#7a5af8",
    "candidate": "#667085",
}

DEFAULT_LAYER_COLOR = "#667085"
DEFAULT_STATUS_COLOR = "#98a2b3"

NAMED_QUERY_DESCRIPTIONS = {
    "summary": "Graph summary, status counts, layer counts, and predicate counts.",
    "forbidden-terms": "Forbidden canonical terms and replacement/prohibition relations.",
    "underrepresented-gates": "Validation gates that the latest document diff did not sufficiently cover.",
    "relations-by-predicate": "Relation counts and samples grouped by controlled predicate.",
    "source-coverage": "Canonical entities and relations with source-reference counts.",
    "testing-plan-review-needed": "Review-needed findings from the latest testing-plan diff.",
}


def default_testing_plan() -> Path:
    for candidate in DEFAULT_TESTING_PLAN_CANDIDATES:
        if candidate.exists():
            return candidate
    return DEFAULT_TESTING_PLAN_CANDIDATES[0]


def layer_color(layer: str | None) -> str:
    return LAYER_COLORS.get(str(layer), DEFAULT_LAYER_COLOR)


def status_color(status: str | None) -> str:
    return STATUS_COLORS.get(str(status), DEFAULT_STATUS_COLOR)


def viewer_config() -> dict[str, Any]:
    return {
        "title": VIEWER_TITLE,
        "subtitle": VIEWER_SUBTITLE,
        "layerColors": LAYER_COLORS,
        "statusColors": STATUS_COLORS,
        "defaultLayerColor": DEFAULT_LAYER_COLOR,
        "defaultStatusColor": DEFAULT_STATUS_COLOR,
    }
