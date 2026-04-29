from __future__ import annotations

import importlib
import importlib.metadata
from functools import lru_cache
from typing import Any

from .semantica_adapter import semantica_status


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
        "split": [
            "StructuralChunker",
            "SemanticChunker",
            "EntityAwareChunker",
            "RelationAwareChunker",
            "OntologyAwareChunker",
        ],
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

        ontology = OntologyEngine().from_data(
            {"classes": [{"name": "EvidenceClaim"}], "properties": [{"name": "conflicts_with"}]}
        )
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
    provider_dependency_available = any(
        dependency_available(name) for name in ["openai", "anthropic", "litellm", "ollama"]
    )
    export_module_available = module_available("export")
    export_dependencies_available = dependency_available("rdflib") and dependency_available("pyshacl")

    return {
        "document_ingest_parse_split": {
            "status": "probe-ready"
            if ingest_parse_split_modules and markdown_intake_classes
            else ("partial" if ingest_parse_split_modules else "blocked"),
            "requires": ["semantica.ingest", "semantica.parse", "semantica.split"],
            "note": "MarkdownParser is required before semantica intake can replace local Markdown chunking."
            if ingest_parse_split_modules and not markdown_intake_classes
            else "",
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
            "status": "probe-ready"
            if module_available("kg") and module_available("normalize") and module_available("deduplication")
            else "blocked",
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
            "status": "blocked-missing-extra"
            if not (dependency_available("fastapi") and dependency_available("uvicorn"))
            else "probe-ready",
            "requires": ["fastapi", "uvicorn"],
            "rawr_adapter_required": "Explorer must preserve canonical/evidence/candidate separation.",
        },
        "export_validation": {
            "status": "probe-ready"
            if export_module_available and export_dependencies_available
            else ("partial" if export_module_available and dependency_available("rdflib") else "blocked"),
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
