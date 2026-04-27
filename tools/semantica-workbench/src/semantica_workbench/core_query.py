from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .core_config import CORE_GRAPH_FILENAMES, NAMED_QUERY_DESCRIPTIONS
from .io import read_json, resolve_run
from .paths import QUERIES_ROOT, REPO_ROOT

SEMANTIC_NAMED_QUERIES = {
    "semantic-conflicts",
    "aligned-rejections",
    "deprecated-uses",
    "ambiguous-claims",
    "candidate-new",
    "ambiguity-summary",
    "entityless-findings",
    "verification-policy-gaps",
    "decision-review-queue",
}


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
    if name == "forbidden-terms":
        forbidden = [entity for entity in graph["entities"] if entity.get("status") == "forbidden" or entity.get("type") == "ForbiddenPattern"]
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
            item
            for item in semantic.get("ambiguous", [])
            if item.get("ambiguity_bucket") == "subordinate-policy-gap"
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
    ttl_path = run_dir / CORE_GRAPH_FILENAMES["semantica_data_graph"]
    if not ttl_path.exists():
        raise FileNotFoundError(f"No RDF data graph exists at {ttl_path}. Run `bun run semantica:core:export` first.")
    if not sparql_path.is_absolute():
        sparql_path = REPO_ROOT / sparql_path
    query = sparql_path.read_text(encoding="utf-8")
    graph = Graph()
    graph.parse(ttl_path, format="turtle")
    evidence_ttl = run_dir / CORE_GRAPH_FILENAMES["semantic_evidence_ttl"]
    if evidence_ttl.exists():
        graph.parse(evidence_ttl, format="turtle")
    result = graph.query(query)
    variables = [str(variable) for variable in result.vars]
    rows = []
    for row in result:
        rows.append({variable: stringify_sparql_value(value) for variable, value in zip(variables, row, strict=False)})
    return {
        "query": str(sparql_path.relative_to(REPO_ROOT)),
        "data_graph": display_path(ttl_path),
        "evidence_graph": display_path(evidence_ttl) if evidence_ttl.exists() else None,
        "row_count": len(rows),
        "variables": variables,
        "rows": rows,
    }


def stringify_sparql_value(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


def render_query_text(result: dict[str, Any]) -> str:
    if "rows" in result and "variables" in result:
        return render_sparql_table(result)
    if "named_queries" in result:
        lines = ["Named queries"]
        for name, description in sorted(result["named_queries"].items()):
            lines.append(f"- {name}: {description}")
        if result.get("sparql_examples"):
            lines.extend(["", "SPARQL examples"])
            lines.extend(f"- {path}" for path in result["sparql_examples"])
        return "\n".join(lines)
    if result.get("query") == "relations-by-predicate":
        return "\n".join(f"{row['predicate']}: {row['count']}" for row in result["predicates"])
    if result.get("query") == "summary":
        lines = ["Graph summary"]
        for key, value in result["summary"].items():
            if isinstance(value, (str, int, float, bool)):
                lines.append(f"- {key}: {value}")
        if "candidate_count" not in result["summary"]:
            lines.append(f"- candidate_count: {result['candidate_count']}")
        return "\n".join(lines)
    if result.get("query") == "ambiguity-summary":
        lines = semantic_query_header(result, "Ambiguity summary")
        for row in result.get("buckets", []):
            lines.append(f"- {row['bucket']}: {row['count']} ({row.get('review_action') or 'review'})")
        return "\n".join(lines)
    if result.get("query") in SEMANTIC_NAMED_QUERIES:
        item_count = len(result.get("items", []))
        lines = semantic_query_header(result, result["query"])
        lines.append(f"- items: {item_count}")
        summary = result.get("summary", {})
        for key in ["finding_count", "decision_grade_finding_count", "suppressed_line_count"]:
            if key in summary:
                lines.append(f"- {key}: {summary[key]}")
        return "\n".join(lines)
    counts = Counter()
    for key, value in result.items():
        if isinstance(value, list):
            counts[key] = len(value)
    if counts:
        return "\n".join(f"{key}: {count}" for key, count in counts.items())
    return str(result)


def semantic_query_header(result: dict[str, Any], title: str) -> list[str]:
    return [
        title,
        f"- document: {result.get('document') or 'unknown document'}",
        f"- run: {result.get('run')}",
        f"- artifact: {result.get('artifact')}",
    ]


def render_sparql_table(result: dict[str, Any]) -> str:
    variables = result["variables"]
    rows = result["rows"]
    if not rows:
        return f"{result['query']}: 0 rows"
    widths = {name: max(len(name), *(len(str(row.get(name) or "")) for row in rows)) for name in variables}
    header = " | ".join(name.ljust(widths[name]) for name in variables)
    rule = "-+-".join("-" * widths[name] for name in variables)
    body = [" | ".join(str(row.get(name) or "").ljust(widths[name]) for name in variables) for row in rows]
    return "\n".join([header, rule, *body])
