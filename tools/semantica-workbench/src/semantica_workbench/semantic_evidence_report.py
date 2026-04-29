from __future__ import annotations

from collections import Counter
from typing import Any

FINDING_KINDS = [
    "aligned",
    "conflict",
    "deprecated-use",
    "candidate-new",
    "ambiguous",
    "outside-scope",
    "informational",
]


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
        lines.append(
            "Decision-grade conflicts are present. Review the cited claims and ontology constraints before using this document as aligned target architecture."
        )
    elif by_kind.get("deprecated-use", 0):
        lines.append("No construction conflicts were found, but deprecated target vocabulary needs review.")
    elif by_kind.get("ambiguous", 0):
        lines.append(
            "No decision-grade conflicts were found. Ambiguous claims need review before declaring full alignment."
        )
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
