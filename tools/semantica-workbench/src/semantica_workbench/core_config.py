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
    "semantic_capability": "semantic-capability-report.json",
    "semantic_capability_report": "semantic-capability-report.md",
    "document_chunks": "document-chunks.jsonl",
    "evidence_claims": "evidence-claims.jsonl",
    "evidence_claims_json": "evidence-claims.json",
    "suppressed_lines": "suppressed-lines.json",
    "resolved_evidence": "resolved-evidence.json",
    "semantic_compare": "semantic-compare.json",
    "semantic_compare_report": "semantic-compare-report.md",
    "semantic_compare_report_html": "semantic-compare-report.html",
    "semantic_evidence_ttl": "semantic-evidence.ttl",
    "architecture_change_frame": "architecture-change-frame.json",
    "architecture_change_frame_validation": "architecture-change-frame-validation.json",
    "noun_mappings": "noun-mappings.json",
    "proposal_graph_ttl": "proposal-graph.ttl",
    "claim_comparisons": "claim-comparisons.json",
    "verdict_repair": "verdict-repair.json",
    "proposal_review_report": "proposal-review-report.md",
    "proposal_review_report_html": "proposal-review-report.html",
    "proposal_provenance": "proposal-provenance.json",
    "doc_sweep": "doc-sweep.json",
    "doc_sweep_report": "doc-sweep-report.md",
    "doc_sweep_report_html": "doc-sweep-report.html",
    "doc_sweep_review_queue": "doc-sweep-review-queue.json",
    "doc_sweep_csv": "doc-sweep.csv",
    "doc_sweep_ttl": "doc-sweep.ttl",
    "sweep_evidence_index": "sweep-evidence-index.json",
    "sweep_evidence_index_jsonl": "sweep-evidence-index.jsonl",
    "sweep_evidence_index_summary": "sweep-evidence-index-summary.json",
    "sweep_evidence_index_html": "sweep-evidence-index.html",
    "sweep_evidence_index_ttl": "sweep-evidence-index.ttl",
    "sweep_quarantine_candidates": "quarantine-candidates.json",
    "sweep_update_candidates": "update-candidates.json",
    "sweep_no_signal_documents": "no-signal-documents.json",
}

CORE_CURRENT_FILES = list(CORE_GRAPH_FILENAMES.values())

CORE_SWEEP_BASE_FILES = [
    CORE_GRAPH_FILENAMES["metadata"],
    CORE_GRAPH_FILENAMES["validation_report"],
    CORE_GRAPH_FILENAMES["canonical_graph"],
    CORE_GRAPH_FILENAMES["layered_graph"],
    CORE_GRAPH_FILENAMES["candidate_queue"],
    CORE_GRAPH_FILENAMES["summary"],
    CORE_GRAPH_FILENAMES["report"],
    CORE_GRAPH_FILENAMES["semantica_export"],
    CORE_GRAPH_FILENAMES["semantica_ontology"],
    CORE_GRAPH_FILENAMES["semantica_owl"],
    CORE_GRAPH_FILENAMES["semantica_shacl"],
    CORE_GRAPH_FILENAMES["semantica_data_graph"],
    CORE_GRAPH_FILENAMES["graphml"],
    CORE_GRAPH_FILENAMES["viewer"],
]

SWEEP_CURRENT_FILES = [
    *CORE_SWEEP_BASE_FILES,
    CORE_GRAPH_FILENAMES["doc_sweep"],
    CORE_GRAPH_FILENAMES["doc_sweep_report"],
    CORE_GRAPH_FILENAMES["doc_sweep_report_html"],
    CORE_GRAPH_FILENAMES["doc_sweep_review_queue"],
    CORE_GRAPH_FILENAMES["doc_sweep_csv"],
    CORE_GRAPH_FILENAMES["doc_sweep_ttl"],
    CORE_GRAPH_FILENAMES["sweep_evidence_index"],
    CORE_GRAPH_FILENAMES["sweep_evidence_index_jsonl"],
    CORE_GRAPH_FILENAMES["sweep_evidence_index_summary"],
    CORE_GRAPH_FILENAMES["sweep_evidence_index_html"],
    CORE_GRAPH_FILENAMES["sweep_evidence_index_ttl"],
    CORE_GRAPH_FILENAMES["sweep_quarantine_candidates"],
    CORE_GRAPH_FILENAMES["sweep_update_candidates"],
    CORE_GRAPH_FILENAMES["sweep_no_signal_documents"],
]

DEFAULT_TESTING_PLAN_CANDIDATES = [
    REPO_ROOT / "docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Testing_Plan.md",
    REPO_ROOT / "docs/projects/rawr-final-architecture-migration/resources/spec/quarantine/RAWR_Canonical_Testing_Plan.md",
]

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
    "verification-policy-overlay": "#2563eb",
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
    "semantic-conflicts": "Decision-grade conflicts from the latest semantic evidence comparison.",
    "aligned-rejections": "Aligned claims that reject prohibited construction patterns.",
    "deprecated-uses": "Deprecated vocabulary used as target architecture.",
    "ambiguous-claims": "Claims that need review because polarity, scope, or resolution is incomplete.",
    "candidate-new": "In-scope candidate concepts found by semantic evidence comparison.",
    "ambiguity-summary": "Ambiguous semantic evidence grouped by reason bucket and review action.",
    "entityless-findings": "Semantic findings that have no resolved ontology entity and need review or suppression.",
    "verification-policy-gaps": "Subordinate testing/verification-policy claims that still need ontology or document review.",
    "decision-review-queue": "Actionable semantic findings for document update and migration-planning review.",
    "semantica-review-surface": "semantica MCP, export, visualization, and RAWR review-surface capability proof.",
    "proposal-review-summary": "Architecture proposal frame, claim comparison, verdict, and repair summary.",
    "proposal-repair-queue": "Source-backed proposal claims that need repair, addendum, evidence, or human review.",
    "sweep-summary": "Aggregate recommendation counts from the latest document sweep.",
    "sweep-review-queue": "Documents and findings that need human review after a document sweep.",
    "sweep-quarantine-candidates": "Advisory quarantine candidates from the latest document sweep.",
    "sweep-update-candidates": "Documents likely to need updates based on semantic evidence.",
    "sweep-no-signal-documents": "Documents with no claims or only outside-scope evidence in the latest sweep.",
    "sweep-high-ambiguity-docs": "Documents whose sweep result is dominated by unresolved or weak-modality findings.",
    "evidence-summary": "Corpus-level evidence index counts, provenance, and authority boundary.",
    "evidence-review-queue": "Cross-document evidence findings that need reviewer attention.",
    "evidence-candidate-new": "Candidate-new evidence rows found across the corpus index.",
    "evidence-unresolved-targets": "Evidence rows whose targets could not be resolved to reviewed ontology concepts.",
    "evidence-source-authority-signals": "Source-authority documents and findings from the corpus evidence index.",
    "evidence-prohibited-pattern-mentions": "Prohibited-pattern evidence mentions with source spans and review actions.",
    "evidence-weak-modality-hotspots": "Documents with high weak-modality ambiguous evidence counts.",
    "evidence-by-document": "Per-document evidence counts and examples from the corpus evidence index.",
    "evidence-by-entity": "Per-entity evidence counts and examples from the corpus evidence index.",
}

DEFAULT_SWEEP_ROOTS = ["docs"]
DEFAULT_SWEEP_INCLUDE_GLOBS = ["**/*.md"]
DEFAULT_SWEEP_EXCLUDE_SEGMENTS = [
    ".context",
    "quarantine",
    "archive",
    "_archive",
    ".semantica",
    ".git",
    "node_modules",
    "dist",
    "build",
]

SWEEP_RECOMMENDATIONS = [
    "source-authority",
    "aligned-active",
    "update-needed",
    "review-needed",
    "quarantine-candidate",
    "outside-scope",
]
SWEEP_REVIEW_RECOMMENDATIONS = {"quarantine-candidate", "update-needed", "review-needed"}
SWEEP_HIGH_AMBIGUITY_MIN = 10
SWEEP_HIGH_AMBIGUITY_RATIO = 0.75


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
