from __future__ import annotations

from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from .core_config import CORE_GRAPH_FILENAMES, NAMED_QUERY_DESCRIPTIONS
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
    candidate_queue_path = run_dir / CORE_GRAPH_FILENAMES["candidate_queue"]
    diff = read_json(diff_path) if diff_path.exists() else {"summary": {}}
    candidate_queue = read_json(candidate_queue_path) if candidate_queue_path.exists() else {}
    if name == "summary":
        return {
            "query": name,
            "run": str(run_dir.relative_to(REPO_ROOT)),
            "summary": graph["summary"],
            "diff_summary": diff.get("summary", {}),
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
    raise ValueError(f"Unknown named query `{name}`. Use --list to see available queries.")


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
    result = graph.query(query)
    variables = [str(variable) for variable in result.vars]
    rows = []
    for row in result:
        rows.append({variable: stringify_sparql_value(value) for variable, value in zip(variables, row, strict=False)})
    return {
        "query": str(sparql_path.relative_to(REPO_ROOT)),
        "data_graph": str(ttl_path.relative_to(REPO_ROOT)),
        "row_count": len(rows),
        "variables": variables,
        "rows": rows,
    }


def stringify_sparql_value(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


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
    counts = Counter()
    for key, value in result.items():
        if isinstance(value, list):
            counts[key] = len(value)
    if counts:
        return "\n".join(f"{key}: {count}" for key, count in counts.items())
    return str(result)


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
