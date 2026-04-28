from __future__ import annotations

import hashlib
import importlib
import importlib.metadata
import json
import re
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any

from .io import rel
from .paths import REPO_ROOT, WORKBENCH_ROOT
from .semantica_adapter import iri_fragment, semantica_status, turtle_literal
from .source_model import stripped_line_span
from .text_normalization import normalize_match_text, normalize_text, term_in_normalized_text

POLARITIES = ["positive", "negative", "prohibitive", "conditional", "unknown"]
MODALITIES = ["normative", "descriptive", "proposed", "rejected", "historical", "illustrative", "unknown"]
ASSERTION_SCOPES = ["target-architecture", "current-state", "migration-note", "example", "outside-scope", "unknown"]
FINDING_KINDS = ["aligned", "conflict", "deprecated-use", "candidate-new", "ambiguous", "outside-scope", "informational"]
MATCH_BUCKETS = ["prohibited_patterns", "deprecated_terms", "verification_policy", "canonical", "candidates"]

FIXTURE_DOCUMENT = WORKBENCH_ROOT / "fixtures/docs/semantic-evidence-cases.md"
FIXTURE_EXPECTED = WORKBENCH_ROOT / "fixtures/semantic-evidence-expected.json"

NEGATIVE_RE = re.compile(r"\b(there is no|there are no|no\s+[a-z0-9_./` -]+|not\b|never\b|without\b)\b", re.I)
PROHIBITIVE_RE = re.compile(r"\b(do not|must not|should not|must never|shall not|forbid|forbids|forbidden|invalid)\b", re.I)
PROPOSED_RE = re.compile(r"\b(create|add|introduce|use|adopt|preserve|restore|target architecture should|should use|must use)\b", re.I)
NORMATIVE_RE = re.compile(r"\b(must|should|shall|required|canonical|target architecture|valid|invalid|forbidden)\b", re.I)
HISTORICAL_RE = re.compile(r"\b(old|legacy|previous|previously|historical|before|superseded|used to)\b", re.I)
ILLUSTRATIVE_RE = re.compile(r"\b(example|for example|e\.g\.|sample)\b", re.I)
REPLACEMENT_RE = re.compile(r"(->|\breplace[sd]?\b|\breplacement\b|\binstead\b|\buse .+ not .+)", re.I)
CONDITIONAL_RE = re.compile(r"\b(if|when|unless|only if|provided that)\b", re.I)
OUTSIDE_SCOPE_RE = re.compile(r"\b(todo|prompt|task|instruction|scaffold|brainstorm)\b", re.I)
QUESTION_RE = re.compile(r"\?\s*$")
CODE_FENCE_RE = re.compile(r"^```")
PATH_ONLY_RE = re.compile(r"^(?:[-*]\s*)?`?(?:[./\\]?[A-Za-z0-9_.-]+/)+[A-Za-z0-9_.-]+`?$")
SCAFFOLD_LABEL_RE = re.compile(
    r"^(?:[-*]\s*)?(where|primary tests|must prove|must not prove|you must|you must not|caller planes|stagehand|root vitest suite|web-specific|proof-band / ratchet suites):$",
    re.I,
)
SCAFFOLD_PREFIX_RE = re.compile(r"^(?:[-*]\s*)?(where|primary tests|must prove|must not prove|you must|you must not):\s+", re.I)
STRUCTURAL_MARKER_RE = re.compile(r"^\s*(?:[-*]\s*)?(?:\|?\s*)?$")
VERIFICATION_POLICY_RE = re.compile(
    r"\b(test|tests|testing|proof|ratchet|harness|runner|runners|lane|gating|gate|nightly|manual|stagehand|playwright|vitest|route-family|ingress|boundary|negative assertions?|merge|structural|e2e)\b",
    re.I,
)


def fixture_document_path() -> Path:
    return FIXTURE_DOCUMENT


@lru_cache(maxsize=1)
def semantic_capability_probe() -> dict[str, Any]:
    status = semantica_status()
    modules = {
        "semantic_extract": [
            "NERExtractor",
            "RelationExtractor",
            "TripletExtractor",
            "SemanticNetworkExtractor",
            "LLMExtraction",
            "CoreferenceResolver",
            "EventDetector",
            "ExtractionValidator",
        ],
        "ingest": ["FileIngestor", "RepoIngestor", "MCPIngestor", "OntologyIngestor"],
        "parse": ["DocumentParser", "MarkdownParser", "DoclingParser", "CodeParser"],
        "split": ["StructuralChunker", "SemanticChunker", "EntityAwareChunker", "RelationAwareChunker", "OntologyAwareChunker"],
        "ontology": ["OntologyEngine", "OntologyValidator", "OntologyIngestor"],
        "provenance": ["ProvenanceManager", "SourceReference", "SQLiteStorage", "InMemoryStorage"],
        "kg": ["KnowledgeGraph", "GraphBuilder", "EntityResolver", "GraphAnalyzer"],
        "conflicts": ["ConflictDetector", "ConflictResolver", "ConflictAnalyzer", "InvestigationGuideGenerator"],
        "reasoning": ["Reasoner", "GraphReasoner", "DatalogReasoner", "ExplanationGenerator"],
        "pipeline": ["Pipeline", "PipelineBuilder", "ExecutionEngine", "ParallelExecutor"],
        "mcp_server": ["TOOLS", "RESOURCES", "CAPABILITIES", "SERVER_INFO"],
        "explorer": ["main"],
        "export": ["RDFExporter", "JSONExporter", "GraphExporter", "OWLExporter", "CSVExporter"],
        "visualization": ["KGVisualizer", "OntologyVisualizer", "SemanticNetworkVisualizer", "AnalyticsVisualizer"],
        "change_management": ["OntologyVersionManager", "ChangeLogEntry", "TemporalVersionManager"],
        "normalize": ["EntityNormalizer", "AliasResolver", "DuplicateDetector", "EntityDisambiguator"],
        "deduplication": ["DuplicateDetector", "EntityMerger", "ClusterBuilder"],
        "vector_store": ["HybridSearch", "MetadataFilter", "DecisionEmbeddingPipeline"],
        "graph_store": ["GraphStore", "GraphManager", "Neo4jStore", "FalkorDBStore"],
        "triplet_store": ["TripletStore", "QueryEngine", "BulkLoader"],
        "context": ["DecisionRecorder", "DecisionQuery", "CausalChainAnalyzer", "ContextGraph"],
    }
    optional_dependencies = {
        "openai": ["semantica LLM extraction through OpenAI providers"],
        "anthropic": ["semantica LLM extraction through Anthropic providers"],
        "litellm": ["OpenAI-compatible or local provider routing"],
        "ollama": ["local model provider routing"],
        "fastapi": ["semantica REST/server surfaces"],
        "uvicorn": ["semantica REST/server runtime"],
        "pyshacl": ["SHACL validation"],
        "rdflib": ["RDF/SPARQL compatibility"],
        "spacy": ["non-LLM NLP extraction helpers"],
        "networkx": ["graph analytics"],
    }
    adversarial_fixtures = [
        {
            "id": "negated-prohibited-pattern",
            "text": "There is no root-level `core/` authoring root.",
            "expected_policy_bucket": "aligned-rejection",
        },
        {
            "id": "positive-prohibited-pattern",
            "text": "Create a root-level `core/` authoring root.",
            "expected_policy_bucket": "conflict",
        },
        {
            "id": "historical-prohibited-mention",
            "text": "Historically, old drafts mentioned a root-level `core/` authoring root.",
            "expected_policy_bucket": "informational",
        },
        {
            "id": "deprecated-replacement-table",
            "text": "| Old pattern | Replacement |\n| --- | --- |\n| `@rawr/hq-sdk` | `@rawr/hq` |",
            "expected_policy_bucket": "replacement-context",
        },
        {
            "id": "ambiguous-scope",
            "text": "The runtime package appears in this section without saying whether it is target architecture.",
            "expected_policy_bucket": "ambiguous",
        },
        {
            "id": "candidate-concept",
            "text": "The plan may need a provenance query service for architecture evidence review.",
            "expected_policy_bucket": "candidate-review",
        },
    ]
    report: dict[str, Any] = {
        **status,
        "schema_version": "rawr-semantica-capability-v2",
        "checked_modules": {},
        "optional_dependencies": {},
        "feature_gates": {},
        "mcp_server": {},
        "adversarial_fixtures": adversarial_fixtures,
        "proofs": {},
        "replacement_matrix": capability_replacement_matrix(),
        "limitations": [
            "semantica extraction does not define RAWR architecture truth.",
            "Decision-grade findings still require RAWR claim polarity, modality, assertion scope, and authority rules.",
            "Any semantica extraction that loses line spans is evidence-only until resolved back to local spans.",
            "Missing optional extras are blockers for that semantica feature, not permission to rebuild a parallel semantic platform.",
        ],
    }
    try:
        report["version"] = importlib.metadata.version("semantica")
    except Exception:
        pass

    for module_name, expected in modules.items():
        fqmn = f"semantica.{module_name}"
        try:
            module = importlib.import_module(fqmn)
            report["checked_modules"][fqmn] = {
                "available": True,
                "module_file": getattr(module, "__file__", None),
                "classes": {name: hasattr(module, name) for name in expected},
            }
        except Exception as exc:
            report["checked_modules"][fqmn] = {"available": False, "error": str(exc)}

    for dependency, enables in optional_dependencies.items():
        try:
            report["optional_dependencies"][dependency] = {
                "available": True,
                "version": importlib.metadata.version(dependency),
                "enables": enables,
            }
        except Exception as exc:
            report["optional_dependencies"][dependency] = {
                "available": False,
                "error": str(exc),
                "enables": enables,
            }

    report["feature_gates"] = capability_feature_gates(report)

    try:
        from semantica import mcp_server

        tools = getattr(mcp_server, "TOOLS", [])
        resources = getattr(mcp_server, "RESOURCES", [])
        report["mcp_server"] = {
            "available": True,
            "server_info": getattr(mcp_server, "SERVER_INFO", {}),
            "tool_names": [item.get("name") for item in tools if isinstance(item, dict)],
            "resource_uris": [item.get("uri") for item in resources if isinstance(item, dict)],
        }
    except Exception as exc:
        report["mcp_server"] = {"available": False, "error": str(exc)}

    proof_text = "There is no root-level core/ authoring root. Create a root-level core/ authoring root."
    try:
        from semantica.semantic_extract import TripletExtractor

        triplets = TripletExtractor(method="pattern", include_provenance=True).extract_triplets(proof_text)
        report["proofs"]["triplet_extractor_pattern"] = {
            "ok": True,
            "triplet_count": len(triplets),
            "preserves_line_spans": False,
        }
    except Exception as exc:
        report["proofs"]["triplet_extractor_pattern"] = {"ok": False, "error": str(exc)}

    try:
        from semantica.ontology import OntologyEngine

        ontology = OntologyEngine().from_data({"classes": [{"name": "EvidenceClaim"}], "properties": [{"name": "conflicts_with"}]})
        report["proofs"]["ontology_from_data"] = {
            "ok": True,
            "class_count": len(ontology.get("classes", [])),
            "property_count": len(ontology.get("properties", [])),
        }
    except Exception as exc:
        report["proofs"]["ontology_from_data"] = {"ok": False, "error": str(exc)}

    try:
        from semantica.provenance import ProvenanceManager

        manager = ProvenanceManager()
        report["proofs"]["provenance_manager_constructible"] = {
            "ok": True,
            "class": f"{manager.__class__.__module__}.{manager.__class__.__name__}",
        }
    except Exception as exc:
        report["proofs"]["provenance_manager_constructible"] = {"ok": False, "error": str(exc)}

    return report


def capability_feature_gates(report: dict[str, Any]) -> dict[str, dict[str, Any]]:
    modules = report.get("checked_modules", {})
    optional = report.get("optional_dependencies", {})

    def module_available(name: str) -> bool:
        return bool(modules.get(f"semantica.{name}", {}).get("available"))

    def class_available(module_name: str, class_name: str) -> bool:
        module = modules.get(f"semantica.{module_name}", {})
        classes = module.get("classes", {})
        return bool(classes.get(class_name))

    def dependency_available(name: str) -> bool:
        return bool(optional.get(name, {}).get("available"))

    ingest_parse_split_modules = module_available("ingest") and module_available("parse") and module_available("split")
    markdown_intake_classes = (
        class_available("ingest", "FileIngestor")
        and class_available("parse", "MarkdownParser")
        and class_available("split", "StructuralChunker")
    )
    provider_dependency_available = any(dependency_available(name) for name in ["openai", "anthropic", "litellm", "ollama"])
    export_module_available = module_available("export")
    export_dependencies_available = dependency_available("rdflib") and dependency_available("pyshacl")

    return {
        "document_ingest_parse_split": {
            "status": "probe-ready" if ingest_parse_split_modules and markdown_intake_classes else ("partial" if ingest_parse_split_modules else "blocked"),
            "requires": ["semantica.ingest", "semantica.parse", "semantica.split"],
            "note": "MarkdownParser is required before semantica intake can replace local Markdown chunking." if ingest_parse_split_modules and not markdown_intake_classes else "",
            "rawr_adapter_required": "Exact Markdown line-span mapping and source-authority metadata.",
        },
        "semantic_extraction_non_llm": {
            "status": "probe-ready" if module_available("semantic_extract") else "blocked",
            "requires": ["semantica.semantic_extract"],
            "rawr_adapter_required": "Polarity, modality, assertion scope, authority context, and stable ID resolution.",
        },
        "semantic_extraction_llm": {
            "status": "probe-ready" if provider_dependency_available else "blocked-missing-extra",
            "requires": ["semantica.semantic_extract.LLMExtraction", "openai or equivalent provider extra"],
            "rawr_adapter_required": "LLM output remains evidence-only until reviewed.",
        },
        "provenance_lineage": {
            "status": "probe-ready" if module_available("provenance") else "blocked",
            "requires": ["semantica.provenance"],
            "rawr_adapter_required": "Line-span and checksum fields must be queryable.",
        },
        "kg_normalize_dedup": {
            "status": "probe-ready" if module_available("kg") and module_available("normalize") and module_available("deduplication") else "blocked",
            "requires": ["semantica.kg", "semantica.normalize", "semantica.deduplication"],
            "rawr_adapter_required": "Candidates and evidence cannot leak into locked target views.",
        },
        "conflict_reasoning_explanations": {
            "status": "probe-ready" if module_available("conflicts") and module_available("reasoning") else "blocked",
            "requires": ["semantica.conflicts", "semantica.reasoning"],
            "rawr_adapter_required": "RAWR owns decision-grade verdict meanings and review actions.",
        },
        "mcp_agent_interface": {
            "status": "probe-ready" if module_available("mcp_server") else "blocked",
            "requires": ["semantica.mcp_server"],
            "rawr_adapter_required": "Graph questions are review aids, not architecture promotion.",
        },
        "rest_explorer_interface": {
            "status": "blocked-missing-extra" if not (dependency_available("fastapi") and dependency_available("uvicorn")) else "probe-ready",
            "requires": ["fastapi", "uvicorn"],
            "rawr_adapter_required": "Explorer must preserve canonical/evidence/candidate separation.",
        },
        "export_validation": {
            "status": "probe-ready" if export_module_available and export_dependencies_available else ("partial" if export_module_available and dependency_available("rdflib") else "blocked"),
            "requires": ["semantica.export", "rdflib", "pyshacl for SHACL validation"],
            "rawr_adapter_required": "Generated exports are derived artifacts.",
        },
        "pipeline_orchestration": {
            "status": "probe-ready" if module_available("pipeline") else "blocked",
            "requires": ["semantica.pipeline"],
            "rawr_adapter_required": "RAWR keeps recommendation policy and source scope.",
        },
    }


def capability_replacement_matrix() -> list[dict[str, str]]:
    return [
        {
            "surface": "document intake and chunking",
            "target": "replace mechanics with semantica ingest/parse/split where span parity holds",
            "keep": "RAWR manifest scope, authority ranks, quarantine/archive policy",
        },
        {
            "surface": "comparison document parsing",
            "target": "replace primary parser with semantica semantic extraction after fixture parity",
            "keep": "deterministic heuristic extractor as fallback and regression oracle",
        },
        {
            "surface": "provenance",
            "target": "replace local provenance-like JSON as the primary lineage substrate",
            "keep": "exact source path, line span, heading path, and review evidence requirements",
        },
        {
            "surface": "graph construction and candidate discovery",
            "target": "reduce local alias/dedup logic in favor of semantica KG/normalize/dedup",
            "keep": "stable RAWR IDs, locked target view, candidate queue, and promotion rules",
        },
        {
            "surface": "conflict and reasoning",
            "target": "wrap or move verdict explanations into semantica conflict/reasoning surfaces",
            "keep": "RAWR decision-grade policy and review-action semantics",
        },
        {
            "surface": "agent and review access",
            "target": "use semantica MCP/export surfaces where proven",
            "keep": "RAWR CLI commands and portable static review artifacts",
        },
        {
            "surface": "batch sweep orchestration",
            "target": "use semantica pipeline primitives for DAG/checkpoint/retry where proven",
            "keep": "RAWR recommendation categories and source-authority regression policy",
        },
    ]


def render_semantica_capability_report(report: dict[str, Any]) -> str:
    lines = [
        "# semantica Capability Report",
        "",
        "This report records the pinned semantica surfaces available to the RAWR semantic evidence pipeline. It is a capability proof, not an ontology authority document.",
        "",
        "## Status",
        "",
        f"- Available: `{report.get('available')}`",
        f"- Schema: `{report.get('schema_version', 'unknown')}`",
        f"- Version: `{report.get('version', 'unknown')}`",
        f"- Module: `{report.get('module', 'unknown')}`",
        "",
        "## Modules",
        "",
    ]
    for module_name, module_report in sorted(report.get("checked_modules", {}).items()):
        lines.append(f"- `{module_name}`: `{module_report.get('available')}`")
        classes = module_report.get("classes") or {}
        for class_name, available in sorted(classes.items()):
            lines.append(f"  - `{class_name}`: `{available}`")
    lines.extend(["", "## Optional Dependencies", ""])
    for dependency, dependency_report in sorted(report.get("optional_dependencies", {}).items()):
        available = dependency_report.get("available")
        version = dependency_report.get("version", "unavailable")
        enables = ", ".join(dependency_report.get("enables", []))
        lines.append(f"- `{dependency}`: `{available}` ({version})")
        if enables:
            lines.append(f"  - Enables: {enables}")
    lines.extend(["", "## Feature Gates", ""])
    for feature, gate in sorted(report.get("feature_gates", {}).items()):
        lines.append(f"- `{feature}`: `{gate.get('status')}`")
        if gate.get("note"):
            lines.append(f"  - Note: {gate['note']}")
        lines.append(f"  - RAWR adapter: {gate.get('rawr_adapter_required')}")
    mcp = report.get("mcp_server", {})
    lines.extend(["", "## MCP Server", ""])
    lines.append(f"- Available: `{mcp.get('available')}`")
    if mcp.get("server_info"):
        lines.append(f"- Server info: `{mcp['server_info']}`")
    if mcp.get("tool_names"):
        lines.append(f"- Tools: `{', '.join(mcp['tool_names'])}`")
    if mcp.get("resource_uris"):
        lines.append(f"- Resources: `{', '.join(mcp['resource_uris'])}`")
    lines.extend(["", "## Proofs", ""])
    for proof_name, proof in sorted(report.get("proofs", {}).items()):
        lines.append(f"- `{proof_name}`: `{proof.get('ok')}`")
        if proof.get("error"):
            lines.append(f"  - Error: `{proof['error']}`")
        if "preserves_line_spans" in proof:
            lines.append(f"  - Preserves line spans: `{proof['preserves_line_spans']}`")
    lines.extend(["", "## Adversarial Fixtures", ""])
    for fixture in report.get("adversarial_fixtures", []):
        lines.append(f"- `{fixture['id']}` -> `{fixture['expected_policy_bucket']}`: {fixture['text']}")
    lines.extend(["", "## Replace / Reduce / Retain Matrix", ""])
    for item in report.get("replacement_matrix", []):
        lines.append(f"- `{item['surface']}`")
        lines.append(f"  - Target: {item['target']}")
        lines.append(f"  - Keep: {item['keep']}")
    lines.extend(["", "## Decision", ""])
    lines.append(
        "semantica has enough local surface area to be the intended substrate, but each surface must pass pinned-package probes before local workbench logic is replaced. RAWR-specific claim semantics, authority rules, promotion policy, and exact source-span guarantees remain explicit adapters and review gates."
    )
    return "\n".join(lines) + "\n"


def extract_evidence_claims(
    document: Path,
    graph: dict[str, Any],
    candidate_queue: dict[str, Any],
    *,
    fixture: bool = False,
    semantica_pilot_enabled: bool = False,
    extraction_mode: str = "deterministic",
    llm_provider: str = "openai",
    llm_model: str | None = None,
) -> dict[str, Any]:
    if not document.is_absolute():
        document = REPO_ROOT / document
    lines = document.read_text(encoding="utf-8").splitlines()
    indexes = build_semantic_indexes(graph, candidate_queue)
    claims: list[dict[str, Any]] = []
    suppressed_lines: list[dict[str, Any]] = []
    semantica_pilot: dict[str, Any] | None = None
    semantica_llm: dict[str, Any] | None = None
    heading_path: list[str] = []
    in_code_fence = False
    active_table_kind: str | None = None
    nonblank_line_count = 0

    if semantica_pilot_enabled and extraction_mode == "deterministic":
        extraction_mode = "semantica-pattern"

    if extraction_mode == "semantica-llm":
        from .semantica_llm_extraction import semantica_llm_extraction

        semantica_llm = semantica_llm_extraction(document, provider=llm_provider, model=llm_model)

    if extraction_mode == "semantica-pattern":
        try:
            from .semantica_extraction import semantica_extraction_pilot

            semantica_pilot = semantica_extraction_pilot(document, graph, candidate_queue)
        except Exception as exc:
            semantica_pilot = {
                "schema_version": "rawr-semantica-extraction-pilot-v1",
                "document": rel(document),
                "status": {"available": False, "classification": "blocked"},
                "summary": {
                    "raw_item_count": 0,
                    "evidence_claim_count": 0,
                    "decision_grade_source": "rawr-semantic-heuristic-v1",
                    "promotion_allowed": False,
                    "adapter_mode": "blocked",
                },
                "raw_items": [],
                "evidence_claims": [],
                "diagnostics": [{"kind": "semantica_pilot_failed", "error": str(exc)}],
                "fallback": {
                    "deterministic_oracle": "rawr-semantic-heuristic-v1",
                    "removal_trigger": "Fix pilot execution and prove fixture parity before use.",
                },
            }

    for line_number, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped:
            continue
        stripped_span = stripped_line_span(line)
        nonblank_line_count += 1
        if CODE_FENCE_RE.match(stripped):
            in_code_fence = not in_code_fence
            suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, "code-fence-delimiter"))
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            level = len(heading.group(1))
            heading_path = heading_path[: level - 1] + [heading.group(2).strip()]
            active_table_kind = None
            continue
        if is_table_header(stripped):
            active_table_kind = "replacement" if is_replacement_table_header(stripped) else "generic"
            suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, "table-header"))
            continue
        if is_table_separator(stripped):
            suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, "table-scaffold"))
            continue
        if not is_table_row(stripped):
            active_table_kind = None

        matches = resolve_line_terms(stripped, indexes)
        matched = has_resolved_matches(matches)
        if in_code_fence:
            if matched:
                claims.append(
                    build_claim(
                        document,
                        line_number,
                        stripped,
                        heading_path,
                        matches,
                        {
                            "polarity": "unknown",
                            "modality": "illustrative",
                            "assertion_scope": "example",
                            "authority_context": "comparison-document",
                        },
                        confidence=0.58,
                        claim_kind="code-example",
                        char_start=stripped_span.char_start,
                        char_end=stripped_span.char_end,
                    )
                )
            else:
                suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, "code-fence-content"))
            continue

        suppression_reason = suppressible_line_reason(stripped)
        if suppression_reason and (not matched or suppression_reason in {"scaffold-label", "path-only", "structural-marker"}):
            suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, suppression_reason))
            continue

        classification = classify_claim_text(stripped, heading_path, matched=matched)
        if classification["assertion_scope"] == "outside-scope":
            claims.append(
                build_claim(
                    document,
                    line_number,
                    stripped,
                    heading_path,
                    matches,
                    classification,
                    confidence=0.65,
                    claim_kind="outside-scope",
                    char_start=stripped_span.char_start,
                    char_end=stripped_span.char_end,
                )
            )
            continue
        if not matched and not is_review_relevant_line(stripped):
            suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, "no-claim-signal"))
            continue
        if is_table_row(stripped) and active_table_kind == "replacement" and (matches.get("prohibited_patterns") or matches.get("deprecated_terms")):
            claims.extend(
                build_table_claims(
                    document,
                    line_number,
                    stripped,
                    heading_path,
                    matches,
                    indexes,
                    char_start=stripped_span.char_start,
                    char_end=stripped_span.char_end,
                )
            )
            continue
        if is_table_row(stripped) and not matched:
            suppressed_lines.append(suppressed_line(document, line_number, stripped, heading_path, "table-row-no-match"))
            continue
        if is_table_row(stripped):
            claims.append(
                build_claim(
                    document,
                    line_number,
                    stripped,
                    heading_path,
                    matches,
                    classification,
                    claim_kind="table-evidence",
                    char_start=stripped_span.char_start,
                    char_end=stripped_span.char_end,
                )
            )
            continue
        claims.append(
            build_claim(
                document,
                line_number,
                stripped,
                heading_path,
                matches,
                classification,
                char_start=stripped_span.char_start,
                char_end=stripped_span.char_end,
            )
        )

    actual_mode = "semantica-pattern" if extraction_mode == "semantica-pattern" else "deterministic"
    if semantica_llm:
        actual_mode = (
            "deterministic-with-semantica-llm-sidecar"
            if semantica_llm.get("actual_mode") == "semantica-llm"
            else "deterministic-with-blocked-semantica-llm-sidecar"
        )
    return {
        "schema_version": "rawr-semantic-evidence-v1",
        "document": rel(document),
        "fixture": fixture,
        "extraction_mode": {
            "requested": extraction_mode,
            "actual": actual_mode,
            "deterministic_fallback_used": extraction_mode == "semantica-pattern",
            "provider": llm_provider if semantica_llm else None,
            "model": llm_model if semantica_llm else None,
        },
        "semantica": semantic_capability_probe(),
        "summary": {
            "claim_count": len(claims),
            "suppressed_line_count": len(suppressed_lines),
            "input_nonblank_line_count": nonblank_line_count,
            "claim_retention": {
                "input_nonblank_line_count": nonblank_line_count,
                "emitted_claim_count": len(claims),
                "suppressed_line_count": len(suppressed_lines),
            },
            "claims_by_polarity": dict(Counter(claim["polarity"] for claim in claims)),
            "claims_by_modality": dict(Counter(claim["modality"] for claim in claims)),
            "claims_by_scope": dict(Counter(claim["assertion_scope"] for claim in claims)),
            "claims_by_kind": dict(Counter(claim["claim_kind"] for claim in claims)),
            "claims_by_resolution_state": dict(Counter(claim["resolution_state"] for claim in claims)),
            "semantica_pilot": semantica_pilot.get("summary", {"enabled": False}) if semantica_pilot else {"enabled": False},
            "semantica_llm": semantica_llm.get("summary", {"enabled": False}) if semantica_llm else {"enabled": False},
        },
        "semantica_pilot": semantica_pilot or disabled_semantica_pilot(document),
        "semantica_llm": semantica_llm,
        "claims": claims,
        "suppressed_lines": suppressed_lines,
    }


def disabled_semantica_pilot(document: Path) -> dict[str, Any]:
    return {
        "schema_version": "rawr-semantica-extraction-pilot-v1",
        "document": rel(document),
        "status": {"available": True, "classification": "disabled"},
        "summary": {
            "enabled": False,
            "decision_grade_source": "rawr-semantic-heuristic-v1",
            "promotion_allowed": False,
            "adapter_mode": "disabled",
        },
        "raw_items": [],
        "evidence_claims": [],
        "diagnostics": [],
        "fallback": {
            "deterministic_oracle": "rawr-semantic-heuristic-v1",
            "removal_trigger": "Enable pilot mode and prove fixture parity before use.",
        },
    }


def is_table_row(text: str) -> bool:
    return text.startswith("|") and text.endswith("|") and text.count("|") >= 3


def is_table_separator(text: str) -> bool:
    if not is_table_row(text):
        return False
    cells = [cell.strip() for cell in text.strip("|").split("|")]
    return all(set(cell) <= {"-", ":", " "} for cell in cells)


def is_table_header(text: str) -> bool:
    if not is_table_row(text):
        return False
    normalized = normalize_text(text)
    return (
        ("old pattern" in normalized and "replacement" in normalized)
        or ("harness" in normalized and "purpose" in normalized)
        or ("must prove" in normalized and "must not prove" in normalized)
    )


def is_replacement_table_header(text: str) -> bool:
    normalized = normalize_text(text)
    return "old pattern" in normalized and "replacement" in normalized


def has_resolved_matches(matches: dict[str, list[dict[str, Any]]]) -> bool:
    return any(matches.get(bucket) for bucket in MATCH_BUCKETS)


def match_count(matches: dict[str, list[dict[str, Any]]]) -> int:
    return sum(len(matches.get(bucket, [])) for bucket in MATCH_BUCKETS)


def suppressed_line(document: Path, line_number: int, text: str, heading_path: list[str], reason: str) -> dict[str, Any]:
    return {
        "source_path": rel(document),
        "line_start": line_number,
        "line_end": line_number,
        "heading_path": heading_path,
        "text": text,
        "reason": reason,
    }


def suppressible_line_reason(text: str) -> str | None:
    stripped = text.strip()
    if STRUCTURAL_MARKER_RE.match(stripped):
        return "structural-marker"
    if PATH_ONLY_RE.match(stripped):
        return "path-only"
    if SCAFFOLD_LABEL_RE.match(stripped) or SCAFFOLD_PREFIX_RE.match(stripped):
        return "scaffold-label"
    return None


def build_table_claims(
    document: Path,
    line_number: int,
    text: str,
    heading_path: list[str],
    matches: dict[str, list[dict[str, Any]]],
    indexes: dict[str, list[dict[str, Any]]],
    *,
    char_start: int = 0,
    char_end: int | None = None,
) -> list[dict[str, Any]]:
    cells = [cell.strip() for cell in text.strip("|").split("|")]
    if len(cells) < 2 or all(set(cell) <= {"-", " "} for cell in cells):
        return []
    old_matches = resolve_line_terms(cells[0], indexes)
    replacement_matches = resolve_line_terms(cells[1], indexes)
    claims: list[dict[str, Any]] = []
    if old_matches.get("prohibited_patterns") or old_matches.get("deprecated_terms"):
        claims.append(
            build_claim(
                document,
                line_number,
                text,
                heading_path,
                old_matches,
                {
                    "polarity": "prohibitive",
                    "modality": "rejected",
                    "assertion_scope": "migration-note",
                    "authority_context": "comparison-document",
                },
                confidence=0.86,
                claim_suffix="old-side",
                claim_kind="table-old-side",
                char_start=char_start,
                char_end=char_end,
            )
        )
    if replacement_matches.get("prohibited_patterns") or replacement_matches.get("deprecated_terms"):
        claims.append(
            build_claim(
                document,
                line_number,
                text,
                heading_path,
                replacement_matches,
                {
                    "polarity": "positive",
                    "modality": "normative",
                    "assertion_scope": "target-architecture",
                    "authority_context": "comparison-document",
                },
                confidence=0.9,
                claim_suffix="replacement-side",
                claim_kind="table-replacement-side",
                char_start=char_start,
                char_end=char_end,
            )
        )
    return claims or [
        build_claim(
            document,
            line_number,
            text,
            heading_path,
            matches,
            classify_claim_text(text, heading_path, matched=has_resolved_matches(matches)),
            claim_suffix="table-row",
            claim_kind="table-row",
            char_start=char_start,
            char_end=char_end,
        )
    ]


def build_claim(
    document: Path,
    line_number: int,
    text: str,
    heading_path: list[str],
    matches: dict[str, list[dict[str, Any]]],
    classification: dict[str, str],
    *,
    confidence: float = 0.82,
    claim_suffix: str | None = None,
    claim_kind: str | None = None,
    char_start: int = 0,
    char_end: int | None = None,
) -> dict[str, Any]:
    resolved_ids = {
        "canonical": [item["id"] for item in matches.get("canonical", [])],
        "deprecated_terms": [item["id"] for item in matches.get("deprecated_terms", [])],
        "prohibited_patterns": [item["id"] for item in matches.get("prohibited_patterns", [])],
        "verification_policy": [item["id"] for item in matches.get("verification_policy", [])],
        "candidates": [item["id"] for item in matches.get("candidates", [])],
    }
    if char_end is None:
        char_end = char_start + len(text)
    claim_id = stable_id("claim", rel(document), str(line_number), text, claim_suffix or "")
    subject = first_label(matches) or text[:80]
    predicate = infer_claim_predicate(classification, matches)
    return {
        "id": claim_id,
        "source_path": rel(document),
        "line_start": line_number,
        "line_end": line_number,
        "char_start": char_start,
        "char_end": char_end,
        "char_span_kind": "line-offset",
        "heading_path": heading_path,
        "text": text,
        "claim_kind": claim_kind or infer_claim_kind(classification, matches),
        "resolution_state": infer_resolution_state(matches),
        "subject": subject,
        "predicate": predicate,
        "object": first_object_label(matches),
        "polarity": classification["polarity"],
        "modality": classification["modality"],
        "assertion_scope": classification["assertion_scope"],
        "authority_context": classification["authority_context"],
        "confidence": confidence,
        "extractor": "rawr-semantic-heuristic-v1",
        "model": None,
        "resolved_ids": resolved_ids,
        "review_state": "machine-classified",
    }


def compare_evidence_to_ontology(evidence: dict[str, Any], graph: dict[str, Any], candidate_queue: dict[str, Any]) -> dict[str, Any]:
    from .semantica_reasoning import semantica_reasoning_probe

    entities = {entity["id"]: entity for entity in graph["entities"]}
    candidates = {candidate["id"]: candidate for candidate in candidate_queue.get("candidates", [])}
    findings: list[dict[str, Any]] = []

    for claim in evidence.get("claims", []):
        claim_findings = classify_claim_against_constraints(claim, entities, candidates)
        findings.extend(claim_findings)

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for finding in findings:
        grouped[finding["kind"]].append(finding)
    findings_by_rule = Counter(finding.get("rule") or "unknown" for finding in findings)
    ambiguous_by_bucket = Counter(finding.get("ambiguity_bucket") or "none" for finding in grouped.get("ambiguous", []))

    reasoning = semantica_reasoning_probe(findings)
    return {
        "schema_version": "rawr-semantic-compare-v1",
        "document": evidence["document"],
        "ontology_graph": graph["id"],
        "summary": {
            "claim_count": len(evidence.get("claims", [])),
            "finding_count": len(findings),
            "findings_by_kind": dict(Counter(finding["kind"] for finding in findings)),
            "findings_by_rule": dict(findings_by_rule),
            "ambiguous_by_bucket": dict(ambiguous_by_bucket),
            "decision_grade_finding_count": sum(1 for finding in findings if finding.get("decision_grade")),
            "claim_retention": evidence.get("summary", {}).get("claim_retention", {}),
            "suppressed_line_count": len(evidence.get("suppressed_lines", [])),
            "semantica_reasoning": reasoning.get("summary", {}),
        },
        "semantica_reasoning": reasoning,
        "claims": evidence.get("claims", []),
        "suppressed_lines": evidence.get("suppressed_lines", []),
        "findings": findings,
        "aligned": grouped.get("aligned", []),
        "conflicts": grouped.get("conflict", []),
        "deprecated_uses": grouped.get("deprecated-use", []),
        "candidate_new": grouped.get("candidate-new", []),
        "ambiguous": grouped.get("ambiguous", []),
        "outside_scope": grouped.get("outside-scope", []),
        "informational": grouped.get("informational", []),
    }


def classify_claim_against_constraints(
    claim: dict[str, Any],
    entities: dict[str, dict[str, Any]],
    candidates: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    resolved = claim.get("resolved_ids", {})
    prohibited = resolved.get("prohibited_patterns", [])
    deprecated = resolved.get("deprecated_terms", [])
    canonical = resolved.get("canonical", [])
    verification_policy = resolved.get("verification_policy", [])
    candidate_ids = resolved.get("candidates", [])
    polarity = claim.get("polarity")
    modality = claim.get("modality")
    scope = claim.get("assertion_scope")

    if scope == "outside-scope":
        return [finding("outside-scope", claim, reason="Claim is outside the active architecture comparison scope.", decision_grade=False)]

    for entity_id in prohibited:
        entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
        if polarity in {"negative", "prohibitive"} or modality == "rejected":
            findings.append(
                finding(
                    "aligned",
                    claim,
                    entity=entity,
                    rule="negative_or_prohibitive_claim_rejects_prohibited_construction",
                    reason="The document rejects a prohibited construction pattern.",
                    decision_grade=True,
                    review_action="No action required unless surrounding text contradicts this rejection.",
                )
            )
        elif modality in {"historical", "illustrative"} or scope in {"migration-note", "example"}:
            findings.append(
                finding(
                    "informational",
                    claim,
                    entity=entity,
                    rule="historical_or_migration_mention_of_prohibited_construction",
                    reason="The document mentions a prohibited pattern as history or migration context, not target architecture.",
                    decision_grade=False,
                    review_action="Keep as context; do not treat as a target-architecture violation.",
                )
            )
        elif polarity == "positive" and scope == "target-architecture":
            findings.append(
                finding(
                    "conflict",
                    claim,
                    entity=entity,
                    rule="positive_target_claim_asserts_prohibited_construction",
                    reason="The document asserts a prohibited construction pattern as target architecture.",
                    decision_grade=True,
                    review_action="Update the document or ontology only after human review confirms the assertion.",
                )
            )
        else:
            bucket = ambiguity_bucket_for_claim(claim)
            findings.append(
                finding(
                    "ambiguous",
                    claim,
                    entity=entity,
                    rule="prohibited_construction_without_clear_assertion_semantics",
                    reason="The claim references a prohibited construction pattern but polarity or scope is unclear.",
                    decision_grade=False,
                    ambiguity_bucket=bucket,
                    review_action=review_action_for_bucket(bucket),
                )
            )

    for entity_id in deprecated:
        entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
        if polarity == "positive" and scope == "target-architecture":
            findings.append(
                finding(
                    "deprecated-use",
                    claim,
                    entity=entity,
                    rule="target_claim_uses_deprecated_vocabulary",
                    reason="The document uses deprecated vocabulary as target architecture.",
                    decision_grade=True,
                    review_action="Replace deprecated vocabulary with the canonical term or review the ontology replacement.",
                )
            )
        else:
            findings.append(
                finding(
                    "informational",
                    claim,
                    entity=entity,
                    rule="non_target_deprecated_vocabulary_mention",
                    reason="Deprecated vocabulary appears outside a target-architecture assertion.",
                    decision_grade=False,
                    review_action="Keep as context unless the surrounding document promotes it as target architecture.",
                )
            )

    if not prohibited and not deprecated and verification_policy:
        for entity_id in verification_policy:
            entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
            if polarity in {"negative", "prohibitive"} or modality == "rejected":
                findings.append(
                    finding(
                        "ambiguous",
                        claim,
                        entity=entity,
                        rule="verification_policy_rejected_or_negated",
                        reason="The claim rejects or negates subordinate verification policy; review before treating it as aligned.",
                        decision_grade=False,
                        ambiguity_bucket="subordinate-policy-negation",
                        review_action=review_action_for_bucket("subordinate-policy-negation"),
                    )
                )
            elif modality in {"historical", "illustrative"} or scope in {"migration-note", "example"}:
                findings.append(
                    finding(
                        "informational",
                        claim,
                        entity=entity,
                        rule="historical_or_example_verification_policy_mention",
                        reason="The claim references verification policy as context, not as active testing policy.",
                        decision_grade=False,
                        review_action="Keep as context unless the document promotes this as active verification policy.",
                    )
                )
            elif polarity in {"unknown", "conditional"} or scope == "unknown":
                bucket = ambiguity_bucket_for_claim(claim)
                findings.append(
                    finding(
                        "ambiguous",
                        claim,
                        entity=entity,
                        rule="verification_policy_without_clear_assertion_semantics",
                        reason="The claim resolves to subordinate verification policy but its assertion semantics are unclear.",
                        decision_grade=False,
                        ambiguity_bucket=bucket,
                        review_action=review_action_for_bucket(bucket),
                    )
                )
            else:
                findings.append(
                    finding(
                        "aligned",
                        claim,
                        entity=entity,
                        rule="claim_resolves_to_subordinate_verification_policy",
                        reason="The claim resolves to subordinate verification policy, not core architecture truth.",
                        decision_grade=False,
                        review_action="Use as testing-plan alignment evidence; do not promote to core architecture.",
                    )
                )

    if not prohibited and not deprecated and not verification_policy and candidate_ids:
        for candidate_id in candidate_ids:
            candidate = candidates.get(candidate_id, {"id": candidate_id, "label": candidate_id})
            if scope in {"target-architecture", "current-state"} and claim.get("confidence", 0) >= 0.7:
                findings.append(
                    finding(
                        "candidate-new",
                        claim,
                        entity=candidate,
                        rule="in_scope_unresolved_operational_concept",
                        reason="The document introduces an in-scope concept that needs review before promotion.",
                        decision_grade=False,
                        review_action="Review as candidate; do not promote without source authority and operational consequence.",
                    )
                )

    if not prohibited and not deprecated and not verification_policy and not candidate_ids and canonical:
        for entity_id in canonical[:3]:
            entity = entities.get(entity_id, {"id": entity_id, "label": entity_id})
            if polarity in {"positive", "prohibitive", "negative"}:
                findings.append(
                    finding(
                        "aligned",
                        claim,
                        entity=entity,
                        rule="claim_resolves_to_canonical_ontology_entity",
                        reason="The claim resolves to a canonical ontology entity without violating a constraint.",
                        decision_grade=False,
                        review_action="No action required unless the claim conflicts with a more specific rule.",
                    )
                )

    if not findings:
        bucket = ambiguity_bucket_for_claim(claim)
        findings.append(
            finding(
                "ambiguous",
                claim,
                rule="no_resolved_decision_target",
                reason="The claim is review-relevant but did not resolve to a canonical, deprecated, prohibited, or candidate target.",
                decision_grade=False,
                ambiguity_bucket=bucket,
                review_action=review_action_for_bucket(bucket),
            )
        )
    return findings


def finding(
    kind: str,
    claim: dict[str, Any],
    *,
    entity: dict[str, Any] | None = None,
    rule: str = "",
    reason: str,
    decision_grade: bool,
    ambiguity_bucket: str | None = None,
    review_action: str | None = None,
) -> dict[str, Any]:
    target_id = entity.get("id") if entity else None
    review_action_value = review_action or default_review_action(kind)
    explanation_chain = {
        "source_claim": {
            "claim_id": claim["id"],
            "document_path": claim["source_path"],
            "line_start": claim["line_start"],
            "line_end": claim["line_end"],
            "text": claim["text"],
        },
        "resolved_target": {
            "entity_id": target_id,
            "label": entity.get("label") if entity else None,
        },
        "authority_context": {
            "authority_context": claim.get("authority_context"),
            "assertion_scope": claim.get("assertion_scope"),
            "modality": claim.get("modality"),
            "polarity": claim.get("polarity"),
        },
        "rule_result": {
            "rule": rule,
            "reason": reason,
        },
        "finding": {
            "kind": kind,
            "decision_grade": decision_grade,
            "review_action": review_action_value,
        },
    }
    return {
        "id": stable_id("finding", kind, claim["id"], target_id or "none", rule),
        "kind": kind,
        "claim_id": claim["id"],
        "document_path": claim["source_path"],
        "line_start": claim["line_start"],
        "line_end": claim["line_end"],
        "text": claim["text"],
        "entity_id": target_id,
        "label": entity.get("label") if entity else None,
        "rule": rule,
        "reason": reason,
        "claim_kind": claim.get("claim_kind"),
        "resolution_state": claim.get("resolution_state"),
        "ambiguity_bucket": ambiguity_bucket,
        "review_action": review_action_value,
        "explanation_chain": explanation_chain,
        "heading_path": claim.get("heading_path", []),
        "decision_grade": decision_grade,
        "confidence": claim.get("confidence"),
        "polarity": claim.get("polarity"),
        "modality": claim.get("modality"),
        "assertion_scope": claim.get("assertion_scope"),
    }


def render_semantic_compare_report(compare: dict[str, Any]) -> str:
    summary = compare["summary"]
    by_kind = summary.get("findings_by_kind", {})
    lines = [
        "# Semantic Evidence Comparison Report",
        "",
        f"- Document: `{compare['document']}`",
        f"- Ontology graph: `{compare['ontology_graph']}`",
        f"- Claims: `{summary['claim_count']}`",
        f"- Findings: `{summary['finding_count']}`",
        f"- Decision-grade findings: `{summary['decision_grade_finding_count']}`",
        "",
        "## Finding Counts",
        "",
    ]
    for kind in FINDING_KINDS:
        lines.append(f"- `{kind}`: `{by_kind.get(kind, 0)}`")
    retention = summary.get("claim_retention", {})
    if retention:
        lines.extend(
            [
                "",
                "## Claim Retention",
                "",
                f"- Input nonblank lines: `{retention.get('input_nonblank_line_count', 0)}`",
                f"- Emitted claims: `{retention.get('emitted_claim_count', 0)}`",
                f"- Suppressed lines: `{retention.get('suppressed_line_count', 0)}`",
            ]
        )
    if summary.get("ambiguous_by_bucket"):
        lines.extend(["", "## Ambiguity Breakdown", ""])
        for bucket, count in sorted(summary["ambiguous_by_bucket"].items()):
            lines.append(f"- `{bucket}`: `{count}`")
    if summary.get("findings_by_rule"):
        lines.extend(["", "## Rule Breakdown", ""])
        for rule, count in sorted(summary["findings_by_rule"].items()):
            lines.append(f"- `{rule}`: `{count}`")
    lines.extend(["", "## Verdict", ""])
    if by_kind.get("conflict", 0):
        lines.append("Decision-grade conflicts are present. Review the cited claims and ontology constraints before using this document as aligned target architecture.")
    elif by_kind.get("deprecated-use", 0):
        lines.append("No construction conflicts were found, but deprecated target vocabulary needs review.")
    elif by_kind.get("ambiguous", 0):
        lines.append("No decision-grade conflicts were found. Ambiguous claims need review before declaring full alignment.")
    else:
        lines.append("No decision-grade semantic conflicts were found.")

    append_finding_section(lines, "Conflicts", compare.get("conflicts", []))
    append_finding_section(lines, "Deprecated Uses", compare.get("deprecated_uses", []))
    append_finding_section(lines, "Aligned Evidence", compare.get("aligned", []), limit=30)
    append_finding_section(lines, "Candidate New", compare.get("candidate_new", []), limit=25)
    append_finding_section(lines, "Decision Review Queue", decision_review_queue(compare), limit=40)
    append_finding_section(lines, "Ambiguous", compare.get("ambiguous", []), limit=25)
    append_suppressed_section(lines, compare.get("suppressed_lines", []), limit=25)
    append_finding_section(lines, "Informational", compare.get("informational", []), limit=25)
    append_finding_section(lines, "Outside Scope", compare.get("outside_scope", []), limit=25)
    return "\n".join(lines) + "\n"


def append_finding_section(lines: list[str], title: str, findings: list[dict[str, Any]], limit: int = 25) -> None:
    lines.extend(["", f"## {title}", ""])
    if not findings:
        lines.append("None.")
        return
    for item in findings[:limit]:
        target = f" `{item['entity_id']}`" if item.get("entity_id") else ""
        lines.append(
            f"- `{item['kind']}`{target} {item['document_path']}:{item['line_start']} "
            f"({item['polarity']}/{item['modality']}/{item['assertion_scope']}): {item['reason']} "
            f"Action: {item.get('review_action', 'Review source evidence.')} "
            f"Text: {item['text']}"
        )


def append_suppressed_section(lines: list[str], suppressed: list[dict[str, Any]], limit: int = 25) -> None:
    lines.extend(["", "## Suppressed Scaffold", ""])
    if not suppressed:
        lines.append("None.")
        return
    counts = Counter(item.get("reason", "unknown") for item in suppressed)
    for reason, count in sorted(counts.items()):
        lines.append(f"- `{reason}`: `{count}`")
    lines.extend(["", "### Examples", ""])
    for item in suppressed[:limit]:
        lines.append(f"- `{item.get('reason')}` {item['source_path']}:{item['line_start']}: {item['text']}")


def decision_review_queue(compare: dict[str, Any]) -> list[dict[str, Any]]:
    actionable: list[dict[str, Any]] = []
    actionable.extend(compare.get("conflicts", []))
    actionable.extend(compare.get("deprecated_uses", []))
    actionable.extend(compare.get("candidate_new", []))
    actionable.extend(compare.get("ambiguous", []))
    return actionable


def semantic_compare_turtle(compare: dict[str, Any]) -> str:
    lines = [
        "@prefix rawr: <https://rawr.dev/ontology/> .",
        "@prefix evidence: <https://rawr.dev/evidence/> .",
        "@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .",
        "",
    ]
    for claim in compare.get("claims", []):
        node = iri_fragment(claim["id"])
        lines.append(f"evidence:{node} a rawr:EvidenceClaim ;")
        lines.append(f"  rdfs:label {turtle_literal(claim['text'])} ;")
        lines.append(f"  rawr:polarity {turtle_literal(claim['polarity'])} ;")
        lines.append(f"  rawr:modality {turtle_literal(claim['modality'])} ;")
        lines.append(f"  rawr:assertionScope {turtle_literal(claim['assertion_scope'])} .")
        lines.append("")
    for item in compare.get("findings", []):
        node = iri_fragment(item["id"])
        claim = iri_fragment(item["claim_id"])
        lines.append(f"evidence:{node} a rawr:ReviewFinding ;")
        lines.append(f"  rawr:findingKind {turtle_literal(item['kind'])} ;")
        lines.append(f"  rawr:derivedFrom evidence:{claim} ;")
        if item.get("entity_id"):
            lines.append(f"  rawr:resolvedTarget rawr:{iri_fragment(item['entity_id'])} ;")
        if item.get("ambiguity_bucket"):
            lines.append(f"  rawr:ambiguityBucket {turtle_literal(item['ambiguity_bucket'])} ;")
        if item.get("review_action"):
            lines.append(f"  rawr:reviewAction {turtle_literal(item['review_action'])} ;")
        lines.append(f"  rawr:rule {turtle_literal(item.get('rule') or '')} .")
        lines.append("")
    return "\n".join(lines)


def build_semantic_indexes(graph: dict[str, Any], candidate_queue: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    indexes: dict[str, list[dict[str, Any]]] = {
        "canonical": [],
        "deprecated_terms": [],
        "prohibited_patterns": [],
        "verification_policy": [],
        "candidates": [],
    }
    canonical_ids = {entity["id"] for entity in graph.get("canonical_view", {}).get("entities", [])}
    for entity in graph.get("entities", []):
        terms = item_terms(entity)
        row = {**entity, "_terms": terms}
        if entity.get("type") == "DeprecatedTerm" or entity.get("status") == "deprecated":
            indexes["deprecated_terms"].append(row)
        elif entity.get("type") == "ForbiddenPattern" or entity.get("status") == "forbidden":
            indexes["prohibited_patterns"].append(row)
        elif entity.get("type") == "VerificationPolicyConcept":
            indexes["verification_policy"].append(row)
        elif entity.get("id") in canonical_ids:
            indexes["canonical"].append(row)
    for candidate in candidate_queue.get("candidates", []):
        indexes["candidates"].append({**candidate, "_terms": candidate_terms(candidate)})
    return indexes


def resolve_line_terms(text: str, indexes: dict[str, list[dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    normalized = normalize_match_text(text)
    matches: dict[str, list[dict[str, Any]]] = {key: [] for key in indexes}
    for bucket, items in indexes.items():
        for item in items:
            if any(term_in_line(term, normalized) for term in item.get("_terms", [])):
                matches[bucket].append({key: value for key, value in item.items() if key != "_terms"})
    return {key: unique_by_id(value) for key, value in matches.items()}


def classify_claim_text(text: str, heading_path: list[str], *, matched: bool = False) -> dict[str, str]:
    heading_text = " / ".join(heading_path)
    line_has_signal = is_review_relevant_line(text) or bool(REPLACEMENT_RE.search(text))
    combined = f"{heading_text} {text}".strip() if line_has_signal else text
    polarity = "unknown"
    if QUESTION_RE.search(text):
        polarity = "conditional"
    elif PROHIBITIVE_RE.search(combined):
        polarity = "prohibitive"
    elif NEGATIVE_RE.search(combined):
        polarity = "negative"
    elif CONDITIONAL_RE.search(combined):
        polarity = "conditional"
    elif PROPOSED_RE.search(combined) or NORMATIVE_RE.search(combined):
        polarity = "positive"

    modality = "unknown"
    if QUESTION_RE.search(text):
        modality = "unknown"
    elif HISTORICAL_RE.search(combined):
        modality = "historical"
    elif ILLUSTRATIVE_RE.search(combined):
        modality = "illustrative"
    elif polarity in {"negative", "prohibitive"}:
        modality = "rejected"
    elif PROPOSED_RE.search(combined):
        modality = "proposed"
    elif NORMATIVE_RE.search(combined):
        modality = "normative"
    elif polarity == "positive":
        modality = "descriptive"

    assertion_scope = "unknown"
    if QUESTION_RE.search(text):
        assertion_scope = "unknown"
    elif OUTSIDE_SCOPE_RE.search(combined):
        assertion_scope = "outside-scope"
    elif REPLACEMENT_RE.search(combined):
        assertion_scope = "migration-note"
    elif modality in {"historical", "illustrative"}:
        assertion_scope = "migration-note" if modality == "historical" else "example"
    elif re.search(r"\b(target architecture|create|add|introduce|adopt|should|must|canonical|do not|must not|there is no)\b", combined, re.I):
        assertion_scope = "target-architecture"
    elif polarity == "positive":
        assertion_scope = "current-state"

    return {
        "polarity": polarity,
        "modality": modality,
        "assertion_scope": assertion_scope,
        "authority_context": "comparison-document",
    }


def is_review_relevant_line(text: str) -> bool:
    return bool(NORMATIVE_RE.search(text) or PROPOSED_RE.search(text) or PROHIBITIVE_RE.search(text) or NEGATIVE_RE.search(text))


def infer_claim_kind(classification: dict[str, str], matches: dict[str, list[dict[str, Any]]]) -> str:
    if classification["assertion_scope"] == "outside-scope":
        return "outside-scope"
    if matches.get("prohibited_patterns"):
        return "prohibited-construction"
    if matches.get("deprecated_terms"):
        return "deprecated-vocabulary"
    if matches.get("verification_policy"):
        return "verification-policy"
    if matches.get("candidates"):
        return "candidate-concept"
    if matches.get("canonical"):
        return "canonical-reference"
    return "unresolved-review"


def infer_resolution_state(matches: dict[str, list[dict[str, Any]]]) -> str:
    if matches.get("prohibited_patterns"):
        return "resolved-prohibited-construction"
    if matches.get("deprecated_terms"):
        return "resolved-deprecated-vocabulary"
    if matches.get("verification_policy"):
        return "resolved-subordinate-verification-policy"
    if matches.get("candidates"):
        return "resolved-candidate"
    if matches.get("canonical"):
        return "resolved-canonical"
    return "unresolved"


def ambiguity_bucket_for_claim(claim: dict[str, Any]) -> str:
    text = claim.get("text", "")
    if claim.get("resolution_state") == "unresolved" and VERIFICATION_POLICY_RE.search(text):
        return "subordinate-policy-gap"
    if claim.get("polarity") in {"unknown", "conditional"} or claim.get("modality") == "unknown":
        return "weak-modality"
    if claim.get("assertion_scope") in {"unknown", "outside-scope"}:
        return "outside-active-authority"
    if claim.get("resolution_state") == "unresolved":
        return "unresolved-target"
    return "classification-uncertain"


def review_action_for_bucket(bucket: str) -> str:
    return {
        "subordinate-policy-gap": "Review whether this testing-policy concept belongs in the verification-policy overlay or should remain prose.",
        "subordinate-policy-negation": "Review whether the document is rejecting required verification policy or only describing a negative test condition.",
        "weak-modality": "Clarify whether the document asserts, rejects, questions, or illustrates the claim.",
        "outside-active-authority": "Confirm whether this is outside the active architecture comparison scope.",
        "unresolved-target": "Map to an existing ontology entity, candidate, or leave as prose-only guidance.",
        "classification-uncertain": "Review claim classification before using it for document update decisions.",
    }.get(bucket, "Review before using this finding as decision evidence.")


def default_review_action(kind: str) -> str:
    return {
        "aligned": "No immediate document update required.",
        "conflict": "Review and update the document or ontology before relying on this claim.",
        "deprecated-use": "Replace deprecated vocabulary or confirm the context is historical.",
        "candidate-new": "Review as candidate; do not promote automatically.",
        "ambiguous": "Review ambiguity bucket and source line.",
        "outside-scope": "No architecture action unless the scope classification is wrong.",
        "informational": "Keep as context; no target architecture action.",
    }.get(kind, "Review source evidence.")


def item_terms(item: dict[str, Any]) -> list[str]:
    values = [item.get("id"), item.get("label"), item.get("definition"), *(item.get("aliases") or [])]
    constraint = item.get("constraint")
    if isinstance(constraint, dict):
        values.extend(constraint.get("terms") or [])
        values.extend(constraint.get("semantic_keys") or [])
    terms = []
    for value in values:
        text = normalize_match_text(str(value or ""))
        if text:
            terms.append(text)
        if value and "." in str(value):
            terms.append(normalize_match_text(str(value).split(".")[-1].replace("-", " ")))
    return sorted({term for term in terms if len(term) >= 4}, key=len, reverse=True)


def candidate_terms(item: dict[str, Any]) -> list[str]:
    values = [item.get("id"), item.get("label"), item.get("hook")]
    return sorted({normalize_match_text(str(value or "")) for value in values if len(normalize_match_text(str(value or ""))) >= 4}, key=len, reverse=True)


def first_label(matches: dict[str, list[dict[str, Any]]]) -> str | None:
    for bucket in ["prohibited_patterns", "deprecated_terms", "verification_policy", "canonical", "candidates"]:
        if matches.get(bucket):
            item = matches[bucket][0]
            return item.get("label") or item.get("id")
    return None


def first_object_label(matches: dict[str, list[dict[str, Any]]]) -> str | None:
    labels = []
    for bucket in ["prohibited_patterns", "deprecated_terms", "verification_policy", "canonical", "candidates"]:
        labels.extend(item.get("label") or item.get("id") for item in matches.get(bucket, []))
    return ", ".join(labels[:4]) if labels else None


def infer_claim_predicate(classification: dict[str, str], matches: dict[str, list[dict[str, Any]]]) -> str:
    if matches.get("prohibited_patterns"):
        if classification["polarity"] in {"negative", "prohibitive"}:
            return "rejects"
        return "asserts"
    if matches.get("deprecated_terms"):
        return "uses_term"
    if matches.get("verification_policy"):
        return "describes_policy"
    if matches.get("candidates"):
        return "introduces"
    return "mentions"


def term_in_line(term: str, normalized_line: str) -> bool:
    return term_in_normalized_text(term, normalized_line)


def unique_by_id(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result = []
    for item in items:
        item_id = item.get("id")
        if item_id and item_id not in seen:
            seen.add(item_id)
            result.append(item)
    return result


def stable_id(*parts: str) -> str:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]
    prefix = parts[0] if parts else "item"
    return f"{prefix}.{digest}"


def load_fixture_expectations() -> dict[str, Any]:
    return json.loads(FIXTURE_EXPECTED.read_text(encoding="utf-8"))
