from __future__ import annotations

import html
from pathlib import Path
from typing import Any


def write_sweep_report_html(path: Path, sweep: dict[str, Any]) -> None:
    summary = sweep["summary"]
    body = [
        hero(
            "Semantic Evidence Sweep",
            "Architecture-document review queues generated from source-backed evidence. This is a review surface, not RAWR truth.",
            [
                ("Run", sweep["run_id"]),
                ("Git", sweep["git_sha"][:12]),
                ("Analyzed", str(summary["documents_analyzed"])),
                ("Skipped", str(summary["documents_skipped"])),
            ],
        ),
        metric_grid(
            [
                ("Claims", summary["total_claims"], "source-backed extracted claims"),
                ("Findings", summary["total_findings"], "alignment/review signals"),
                ("Decision Grade", summary["decision_grade_findings"], "requires closest review"),
                ("Ambiguous", summary["ambiguous"], "needs clarification or suppression"),
            ]
        ),
        recommendation_bars(summary["recommendations"]),
        meaning_block(
            [
                "Start with Source Authority Regression Results and Update Needed. Those are the places where active docs are most likely to mislead future work.",
                "Review Needed usually means the document contains architecture-shaped language but not enough polarity, scope, or target mapping to make a deterministic call.",
                "High ambiguity is signal about either a broad conceptual doc or parser noise. It is not automatically a bad document.",
            ]
        ),
        queue_section("Source Authority Regression Results", records_for(sweep, "source-authority"), priority=True),
        queue_section("Update Needed", records_for(sweep, "update-needed")),
        queue_section("Review Needed", records_for(sweep, "review-needed")),
        queue_section("Outside Scope / No Signal", records_for(sweep, "outside-scope"), quiet=True),
        high_ambiguity_section(sweep["documents"]),
        document_table(sweep["documents"]),
    ]
    write_page(path, "Semantic Evidence Sweep", "".join(body))


def write_proposal_review_html(path: Path, package: dict[str, Any]) -> None:
    frame = package["frame"]
    validation = package["validation"]
    comparisons = package["claim_comparisons"]
    verdict_repair = package["verdict_repair"]
    noun_mappings = package["noun_mappings"]
    verdicts = comparisons.get("summary", {}).get("verdicts", {})
    body = [
        hero(
            "Architecture Proposal Review",
            "Evidence-backed proposal frame, comparison verdicts, and repair actions. Semantica/LLM output remains evidence until reviewed promotion.",
            [
                ("Verdict", verdict_repair["overall_verdict"]),
                ("Action", verdict_repair["recommended_next_action"]),
                ("Frame", frame["frame_id"]),
                ("Valid", str(validation["valid"])),
            ],
        ),
        metric_grid(
            [
                ("Compatible", verdicts.get("compatible", 0), "accepted claims"),
                ("Extensions", verdicts.get("compatible-extension", 0), "valid with mapping"),
                ("Conflicts", verdicts.get("conflicts", 0), "must repair or reject"),
                ("Unclear", verdicts.get("unclear", 0), "needs evidence or human review"),
            ]
        ),
        extraction_panel(frame),
        proposal_review_queue(comparisons.get("comparisons", [])),
        noun_mapping_panel(noun_mappings.get("mappings", [])),
        repair_panel(verdict_repair.get("repair_steps", [])),
        authority_panel(frame),
    ]
    write_page(path, "Architecture Proposal Review", "".join(body))


def write_page(path: Path, title: str, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<style>
{REPORT_CSS}
</style>
</head>
<body>
<main class="shell">
{body}
</main>
</body>
</html>
""",
        encoding="utf-8",
    )


def hero(title: str, subtitle: str, facts: list[tuple[str, str]]) -> str:
    fact_html = "".join(
        f"<div class=\"fact\"><span>{escape(label)}</span><strong>{escape(value)}</strong></div>"
        for label, value in facts
    )
    return f"""
<header class="hero">
  <div>
    <p class="eyebrow">RAWR document intelligence</p>
    <h1>{escape(title)}</h1>
    <p class="lede">{escape(subtitle)}</p>
  </div>
  <div class="facts">{fact_html}</div>
</header>
"""


def metric_grid(metrics: list[tuple[str, Any, str]]) -> str:
    cards = "".join(
        f"""
<article class="metric">
  <span>{escape(label)}</span>
  <strong>{escape(str(value))}</strong>
  <small>{escape(help_text)}</small>
</article>
"""
        for label, value, help_text in metrics
    )
    return f"<section class=\"metric-grid\">{cards}</section>"


def recommendation_bars(recommendations: dict[str, int]) -> str:
    total = max(sum(int(value) for value in recommendations.values()), 1)
    rows = []
    for name, count in recommendations.items():
        width = max(3, round((int(count) / total) * 100)) if count else 0
        rows.append(
            f"""
<div class="bar-row">
  <div class="bar-label"><span class="badge {badge_class(name)}">{escape(name)}</span><strong>{count}</strong></div>
  <div class="bar-track"><span style="width:{width}%"></span></div>
</div>
"""
        )
    return f"<section class=\"panel\"><h2>Recommendation Summary</h2>{''.join(rows)}</section>"


def meaning_block(items: list[str]) -> str:
    return "<section class=\"meaning\"><h2>How To Read This</h2>" + "".join(f"<p>{escape(item)}</p>" for item in items) + "</section>"


def queue_section(title: str, records: list[dict[str, Any]], *, priority: bool = False, quiet: bool = False) -> str:
    if not records:
        return f"<section class=\"panel\"><h2>{escape(title)}</h2><p class=\"muted\">None.</p></section>"
    cards = "".join(record_card(record, priority=priority, quiet=quiet) for record in records[:30])
    more = ""
    if len(records) > 30:
        more = f"<p class=\"muted\">{len(records) - 30} additional records omitted here. Use doc-sweep.json or doc-sweep.csv for the complete queue.</p>"
    return f"<section class=\"panel\"><div class=\"section-title\"><h2>{escape(title)}</h2><span>{len(records)} records</span></div><div class=\"record-list\">{cards}</div>{more}</section>"


def record_card(record: dict[str, Any], *, priority: bool = False, quiet: bool = False) -> str:
    counts = record["counts"]
    report = record.get("artifact_paths", {}).get("report")
    reasons = "".join(f"<span class=\"chip\">{escape(reason)}</span>" for reason in record.get("reason_codes", []))
    top = "".join(finding_line(item) for item in record.get("top_findings", [])[:3])
    return f"""
<article class="record {'priority' if priority else ''} {'quiet' if quiet else ''}">
  <div class="record-main">
    <div class="pathline">{escape(record['document_path'])}</div>
    <div class="meta-row">
      <span class="badge {badge_class(record['recommendation'])}">{escape(record['recommendation'])}</span>
      <span class="badge confidence">{escape(record['confidence'])}</span>
      <span>{escape(record['path_class'])}</span>
    </div>
    <div class="chips">{reasons}</div>
    {f'<div class="findings">{top}</div>' if top else ''}
  </div>
  <div class="record-side">
    <strong>{counts['findings']}</strong><span>findings</span>
    <strong>{counts['ambiguous']}</strong><span>ambiguous</span>
    <strong>{counts['decision_grade']}</strong><span>decision-grade</span>
    {artifact_link(report, 'Open report') if report else ''}
  </div>
</article>
"""


def high_ambiguity_section(records: list[dict[str, Any]]) -> str:
    selected = [
        record
        for record in records
        if record["counts"]["ambiguous"] >= 10
        or (record["counts"]["claims"] and record["counts"]["ambiguous"] / record["counts"]["claims"] >= 0.75)
    ]
    if not selected:
        return "<section class=\"panel\"><h2>High Ambiguity Documents</h2><p class=\"muted\">None.</p></section>"
    cards = "".join(
        f"""
<article class="compact-record">
  <span class="pathline">{escape(record['document_path'])}</span>
  <strong>{record['counts']['ambiguous']} ambiguous</strong>
  <span class="badge {badge_class(record['recommendation'])}">{escape(record['recommendation'])}</span>
</article>
"""
        for record in selected[:35]
    )
    return f"<section class=\"panel\"><div class=\"section-title\"><h2>High Ambiguity Documents</h2><span>{len(selected)} records</span></div>{cards}</section>"


def document_table(records: list[dict[str, Any]]) -> str:
    rows = []
    for record in records:
        counts = record["counts"]
        rows.append(
            "<tr>"
            f"<td><span class=\"pathline table-path\">{escape(record['document_path'])}</span></td>"
            f"<td><span class=\"badge {badge_class(record['recommendation'])}\">{escape(record['recommendation'])}</span></td>"
            f"<td>{escape(record['path_class'])}</td>"
            f"<td>{counts['claims']}</td>"
            f"<td>{counts['findings']}</td>"
            f"<td>{counts['decision_grade']}</td>"
            f"<td>{artifact_link(record['artifact_paths']['report'], 'Report')}</td>"
            "</tr>"
        )
    return f"""
<section class="panel">
  <h2>Per-Document Detail</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Document</th><th>Recommendation</th><th>Class</th><th>Claims</th><th>Findings</th><th>Decision</th><th>Report</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
  </div>
</section>
"""


def extraction_panel(frame: dict[str, Any]) -> str:
    extraction = frame["extraction"]
    diagnostics = [item for item in extraction.get("diagnostics", []) if item.get("kind") == "semantica_llm"]
    diagnostic_html = "".join(
        f"<p class=\"muted\">LLM requested <strong>{escape(str(item.get('requested_mode')))}</strong>, actual <strong>{escape(str(item.get('actual_mode')))}</strong>, blocked <strong>{escape(str(item.get('blocked_reason') or 'none'))}</strong>, claims <strong>{escape(str(item.get('evidence_claim_count', 0)))}</strong>.</p>"
        for item in diagnostics
    )
    return f"""
<section class="panel">
  <h2>Extraction Boundary</h2>
  <div class="kv">
    <div><span>Method</span><strong>{escape(extraction['method'])}</strong></div>
    <div><span>Status</span><strong>{escape(extraction['status'])}</strong></div>
    <div><span>LLM Provider</span><strong>{escape(extraction['llm_provider_status'])}</strong></div>
    <div><span>Promotion</span><strong>{escape(str(extraction['promotion_allowed']))}</strong></div>
  </div>
  {diagnostic_html}
</section>
"""


def proposal_review_queue(comparisons: list[dict[str, Any]]) -> str:
    queue = [
        item
        for item in comparisons
        if item.get("review_action") not in {"none", "accept"}
        or item.get("verdict") in {"conflicts", "needs-canonical-addendum", "unclear"}
    ]
    if not queue:
        return "<section class=\"panel\"><h2>Review Queue</h2><p class=\"muted\">None.</p></section>"
    cards = "".join(comparison_card(item) for item in queue)
    return f"<section class=\"panel\"><div class=\"section-title\"><h2>Review Queue</h2><span>{len(queue)} claims</span></div>{cards}</section>"


def comparison_card(item: dict[str, Any]) -> str:
    source = item["source_claim"]
    return f"""
<article class="record">
  <div class="record-main">
    <div class="pathline">{escape(source['document_path'])}:{escape(str(source['line_start']))}</div>
    <p>{escape(source['text'])}</p>
    <div class="meta-row">
      <span class="badge {badge_class(item['verdict'])}">{escape(item['verdict'])}</span>
      <span class="badge action">{escape(item['review_action'])}</span>
    </div>
    {f"<p class=\"repair\">{escape(item['resolution_hint'])}</p>" if item.get('resolution_hint') else ''}
  </div>
</article>
"""


def noun_mapping_panel(mappings: list[dict[str, Any]]) -> str:
    rows = []
    for mapping in mappings:
        target = mapping.get("maps_to_entity_id") or mapping.get("maps_to_extension_slot") or mapping.get("maps_to_kind") or "unresolved"
        rows.append(
            "<tr>"
            f"<td>{escape(mapping['proposed_noun'])}</td>"
            f"<td><span class=\"badge {badge_class(mapping['mapping_category'])}\">{escape(mapping['mapping_category'])}</span></td>"
            f"<td>{escape(target)}</td>"
            "</tr>"
        )
    return f"<section class=\"panel\"><h2>Noun Mappings</h2><div class=\"table-wrap\"><table><thead><tr><th>Noun</th><th>Mapping</th><th>Target</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></section>"


def repair_panel(steps: list[dict[str, Any]]) -> str:
    if not steps:
        return "<section class=\"panel\"><h2>Repair Steps</h2><p class=\"muted\">None.</p></section>"
    items = "".join(
        f"<article class=\"compact-record\"><span class=\"badge {badge_class(step['verdict'])}\">{escape(step['verdict'])}</span><p>{escape(step.get('repair_hint') or 'Review source claim.')}</p></article>"
        for step in steps
    )
    return f"<section class=\"panel\"><h2>Repair Steps</h2>{items}</section>"


def authority_panel(frame: dict[str, Any]) -> str:
    governance = frame["governance"]
    return f"""
<section class="meaning">
  <h2>Authority Boundary</h2>
  <p>RAWR reviewed ontology remains truth authority. Semantica, LLM, frame, and reference geometry outputs remain evidence until human-governed promotion.</p>
  <div class="kv">
    <div><span>Semantica authoritative</span><strong>{escape(str(governance['semantica_output_authoritative']))}</strong></div>
    <div><span>Reference geometry</span><strong>{escape(governance['reference_geometry_status'])}</strong></div>
    <div><span>Human promotion</span><strong>{escape(str(governance['requires_human_promotion']))}</strong></div>
  </div>
</section>
"""


def finding_line(item: dict[str, Any]) -> str:
    return (
        f"<p><span class=\"badge {badge_class(str(item.get('verdict') or 'finding'))}\">{escape(str(item.get('verdict') or 'finding'))}</span> "
        f"line {escape(str(item.get('line_start') or '?'))}: {escape(str(item.get('summary') or 'Review source claim.'))}</p>"
    )


def records_for(sweep: dict[str, Any], recommendation: str) -> list[dict[str, Any]]:
    return [record for record in sweep["documents"] if record["recommendation"] == recommendation]


def artifact_link(path: str | None, label: str) -> str:
    if not path:
        return ""
    return f"<a class=\"report-link\" href=\"{escape(artifact_href(path))}\">{escape(label)}</a>"


def artifact_href(path: str) -> str:
    if path.startswith(".semantica/runs/"):
        return "../runs/" + path.removeprefix(".semantica/runs/")
    if path.startswith(".semantica/current/"):
        return path.removeprefix(".semantica/current/")
    return path


def badge_class(value: str) -> str:
    safe = "".join(char if char.isalnum() else "-" for char in value.lower()).strip("-")
    return f"badge-{safe or 'default'}"


def escape(value: Any) -> str:
    return html.escape(str(value), quote=True)


REPORT_CSS = """
:root {
  color-scheme: light;
  --page: #f4f2ed;
  --ink: #18212f;
  --muted: #667085;
  --panel: #fffdfa;
  --panel-2: #f8f5ee;
  --line: rgba(65, 74, 88, .18);
  --strong-line: rgba(65, 74, 88, .32);
  --blue: #2457a6;
  --teal: #0f766e;
  --amber: #a16207;
  --red: #b42318;
  --violet: #6845bd;
  --gray: #475467;
  --shadow: 0 18px 50px rgba(24, 33, 47, .08);
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: 0;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background:
    linear-gradient(180deg, rgba(36, 87, 166, .07), transparent 260px),
    var(--page);
  color: var(--ink);
}
.shell {
  width: min(1320px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 28px 0 72px;
}
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 440px);
  gap: 24px;
  align-items: end;
  padding: 30px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: var(--shadow);
}
.eyebrow {
  margin: 0 0 8px;
  color: var(--teal);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 12px;
}
h1, h2, h3, p { margin-top: 0; }
h1 {
  margin-bottom: 10px;
  font-size: 34px;
  line-height: 1.08;
  letter-spacing: 0;
}
h2 {
  margin-bottom: 16px;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: 0;
}
.lede {
  margin-bottom: 0;
  max-width: 760px;
  color: var(--muted);
  font-size: 16px;
}
.facts, .metric-grid, .kv {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.fact, .metric, .kv > div {
  min-width: 0;
  padding: 14px;
  background: var(--panel-2);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.fact span, .metric span, .kv span {
  display: block;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}
.fact strong, .metric strong, .kv strong {
  display: block;
  margin-top: 4px;
  overflow-wrap: anywhere;
  font-size: 18px;
}
.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 18px 0;
}
.metric strong {
  font-size: 28px;
}
.metric small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
}
.panel, .meaning {
  margin-top: 18px;
  padding: 22px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(24, 33, 47, .04);
}
.meaning {
  background: #f7fbf9;
  border-color: rgba(15, 118, 110, .22);
}
.meaning p {
  color: #344054;
}
.section-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
}
.section-title span {
  color: var(--muted);
  font-weight: 700;
}
.bar-row {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  margin: 10px 0;
}
.bar-label {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.bar-track {
  height: 10px;
  overflow: hidden;
  background: #ede8de;
  border-radius: 999px;
}
.bar-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, var(--teal), var(--blue));
  border-radius: inherit;
}
.record-list {
  display: grid;
  gap: 12px;
}
.record, .compact-record {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 164px;
  gap: 18px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid var(--line);
  border-left: 4px solid var(--strong-line);
  border-radius: 8px;
}
.record.priority {
  border-left-color: var(--red);
}
.record.quiet {
  border-left-color: var(--gray);
  opacity: .92;
}
.compact-record {
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  margin: 8px 0;
}
.pathline {
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #1d2939;
}
.table-path {
  font-size: 12px;
}
.meta-row, .chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
  color: var(--muted);
}
.chip, .badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #f8fafc;
  color: #344054;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-source-authority, .badge-conflicts, .badge-quarantine-candidate, .badge-rejected {
  background: #fef3f2;
  color: var(--red);
  border-color: rgba(180, 35, 24, .22);
}
.badge-update-needed, .badge-needs-canonical-addendum, .badge-candidate {
  background: #fffaeb;
  color: var(--amber);
  border-color: rgba(161, 98, 7, .25);
}
.badge-review-needed, .badge-unclear, .badge-unclear-mapping {
  background: #f4f3ff;
  color: var(--violet);
  border-color: rgba(104, 69, 189, .24);
}
.badge-compatible, .badge-compatible-extension, .badge-accepted, .badge-aligned-active {
  background: #ecfdf3;
  color: var(--teal);
  border-color: rgba(15, 118, 110, .24);
}
.record-side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
  align-content: start;
  padding-left: 18px;
  border-left: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
}
.record-side strong {
  color: var(--ink);
  font-size: 18px;
}
.findings {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.findings p, .repair {
  margin: 7px 0 0;
  color: #344054;
}
.report-link {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 30px;
  margin-top: 8px;
  padding: 5px 10px;
  border-radius: 6px;
  background: var(--ink);
  color: #fff;
  text-decoration: none;
  font-weight: 700;
}
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  background: #fff;
}
th, td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: top;
  font-size: 13px;
}
th {
  background: #f3f0e8;
  color: #344054;
  font-size: 12px;
  text-transform: uppercase;
}
td:nth-child(4), td:nth-child(5), td:nth-child(6) {
  width: 72px;
  font-variant-numeric: tabular-nums;
}
.muted {
  color: var(--muted);
}
@media (max-width: 860px) {
  .shell { width: min(100vw - 24px, 1320px); padding-top: 12px; }
  .hero, .record { grid-template-columns: 1fr; }
  .facts, .metric-grid, .kv { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 1fr; }
  .record-side { border-left: 0; border-top: 1px solid var(--line); padding-left: 0; padding-top: 12px; }
}
"""
