from __future__ import annotations

from collections import Counter
from typing import Any

from .core_query_contracts import EVIDENCE_NAMED_QUERIES, SEMANTIC_NAMED_QUERIES, SWEEP_NAMED_QUERIES


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
    if result.get("query") == "semantica-review-surface":
        surface = result["surface"]
        mcp = surface["mcp"]
        separation = surface["separation"]
        export = surface["export"]
        visualization = surface["visualization"]
        return "\n".join(
            [
                "semantica review surface",
                f"- run: {result.get('run')}",
                f"- mcp_available: {mcp.get('available')}",
                f"- mcp_tools_present: {', '.join(mcp.get('required_review_tools_present', []))}",
                f"- mcp_missing_tools: {', '.join(mcp.get('missing_review_tools', [])) or 'none'}",
                f"- canonical_entities: {separation.get('canonical_entity_count', 0)}",
                f"- candidates: {separation.get('candidate_count', 0)}",
                f"- semantic_compare_status: {separation.get('semantic_compare_status')}",
                f"- findings: {separation.get('finding_count', 0)}",
                f"- target_view_excludes_candidates: {separation.get('target_view_excludes_candidates')}",
                f"- export_available: {export.get('available')}",
                f"- export_preservation_validated: {export.get('rawr_export_contract', {}).get('preservation_validated')}",
                f"- visualization_available: {visualization.get('available')}",
                f"- static_viewer_present: {visualization.get('static_viewer_present')}",
            ]
        )
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
    if result.get("query") == "proposal-review-summary":
        lines = [
            "Proposal review summary",
            f"- run: {result.get('run')}",
            f"- artifact: {result.get('artifact')}",
            f"- frame: {result.get('frame', {}).get('frame_id')}",
            f"- document: {result.get('frame', {}).get('document', {}).get('source_path')}",
            f"- overall_verdict: {result.get('overall_verdict')}",
            f"- recommended_next_action: {result.get('recommended_next_action')}",
            f"- repair_steps: {result.get('summary', {}).get('repair_step_count', 0)}",
        ]
        for item in result.get("claim_comparisons", [])[:10]:
            source = item.get("source_claim", {})
            lines.append(
                "- "
                f"{item.get('verdict')} / {item.get('review_action')} "
                f"{source.get('document_path')}:{source.get('line_start')} "
                f"{source.get('text')}"
            )
        return "\n".join(lines)
    if result.get("query") == "proposal-repair-queue":
        lines = [
            "Proposal repair queue",
            f"- run: {result.get('run')}",
            f"- artifact: {result.get('artifact')}",
            f"- frame: {result.get('frame_id')}",
            f"- document: {result.get('document')}",
            f"- items: {len(result.get('items', []))}",
        ]
        for item in result.get("items", [])[:10]:
            source = item.get("source_claim", {})
            lines.append(
                "- "
                f"{item.get('id')} {item.get('verdict')} / {item.get('review_action')} "
                f"{source.get('document_path')}:{source.get('line_start')} "
                f"{item.get('repair_hint')}"
            )
        return "\n".join(lines)
    if result.get("query") in SWEEP_NAMED_QUERIES:
        items = result.get("items", result.get("documents", []))
        item_count = len(items)
        lines = [
            result["query"],
            f"- run: {result.get('run')}",
            f"- artifact: {result.get('artifact')}",
            f"- items: {item_count}",
        ]
        summary = result.get("summary", {})
        lines.append(f"- documents_analyzed: {summary.get('documents_analyzed', 0)}")
        lines.append(f"- decision_grade_findings: {summary.get('decision_grade_findings', 0)}")
        lines.append(f"- recommendations: {summary.get('recommendations', {})}")
        for item in items[:10]:
            lines.append(
                "- "
                f"{item.get('document_path', 'unknown document')} "
                f"[{item.get('recommendation', 'unknown')}/{item.get('confidence', 'unknown')}] "
                f"reasons={','.join(item.get('reason_codes', [])) or 'none'} "
                f"report={item.get('artifact_paths', {}).get('report', 'none')}"
            )
        if len(items) > 10:
            lines.append(f"- ... {len(items) - 10} additional items omitted; use --format json for full records")
        return "\n".join(lines)
    if result.get("query") in EVIDENCE_NAMED_QUERIES:
        lines = [
            result["query"],
            f"- run: {result.get('run')}",
            f"- artifact: {result.get('artifact')}",
        ]
        summary = result.get("summary", {})
        if summary:
            lines.append(f"- documents_indexed: {summary.get('documents_indexed', 0)}")
            lines.append(f"- claim_count: {summary.get('claim_count', 0)}")
            lines.append(f"- finding_count: {summary.get('finding_count', 0)}")
            lines.append(f"- decision_grade_finding_count: {summary.get('decision_grade_finding_count', 0)}")
            lines.append(f"- warning_count: {summary.get('warning_count', 0)}")
        for key in ["items", "documents", "hotspots", "entities"]:
            if key in result:
                rows = result.get(key, [])
                lines.append(f"- {key}: {len(rows)}")
                for row in rows[:10]:
                    lines.append(evidence_text_row(row))
                if len(rows) > 10:
                    lines.append(f"- ... {len(rows) - 10} additional {key} omitted; use --format json for full records")
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


def evidence_text_row(row: dict[str, Any]) -> str:
    if "kind_counts" in row:
        return (
            "- "
            f"{row.get('entity_id')} findings={row.get('finding_count', 0)} "
            f"decision={row.get('decision_grade_count', 0)} docs={row.get('document_count', 0)}"
        )
    if "weak_modality_count" in row:
        return f"- {row.get('document_path')} weak-modality={row.get('weak_modality_count', 0)}"
    if "claim_count" in row:
        return (
            "- "
            f"{row.get('document_path')} [{row.get('recommendation')}/{row.get('confidence')}] "
            f"claims={row.get('claim_count', 0)} findings={row.get('finding_count', 0)} "
            f"decision={row.get('decision_grade_count', 0)} candidates={row.get('candidate_new_count', 0)} "
            f"report={row.get('report_html_artifact') or row.get('artifact_paths', {}).get('report_html') or 'none'}"
        )
    return (
        "- "
        f"{row.get('kind', 'finding')} / {row.get('rule', 'unknown')} "
        f"{row.get('document_path', row.get('sweep_document_path', 'unknown-document'))}:{row.get('line_start', '?')} "
        f"{row.get('entity_id') or row.get('label') or ''} "
        f"{row.get('review_action') or 'review'} "
        f"report={row.get('report_html_artifact') or 'none'}"
    )


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
