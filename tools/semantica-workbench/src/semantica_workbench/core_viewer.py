from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from .core_config import (
    CYTOSCAPE_BUNDLE,
    VIEWER_CSS,
    VIEWER_JS,
    VIEWER_SUBTITLE,
    VIEWER_TITLE,
    layer_color,
    status_color,
    viewer_config,
)


def build_cytoscape_payload(
    graph: dict[str, Any],
    candidate_queue: dict[str, Any] | None = None,
    diff: dict[str, Any] | None = None,
) -> dict[str, Any]:
    candidate_queue = candidate_queue or {}
    diff = diff or {}
    canonical_entity_ids = {entity["id"] for entity in graph["canonical_view"]["entities"]}
    canonical_relation_ids = {relation["id"] for relation in graph["canonical_view"]["relations"]}
    diff_overlay = build_diff_overlay(diff)
    elements: list[dict[str, Any]] = []
    for entity in graph["entities"]:
        data = {
            **entity,
            "id": entity["id"],
            "label": entity.get("label") or entity["id"],
            "isCanonical": entity["id"] in canonical_entity_ids,
            "diffKinds": sorted(diff_overlay.get(entity["id"], set())),
            "color": layer_color(entity.get("layer")),
            "statusColor": status_color(entity.get("status")),
        }
        elements.append({"group": "nodes", "data": data})
    for candidate in candidate_queue.get("candidates", []):
        candidate_id = candidate["id"]
        elements.append(
            {
                "group": "nodes",
                "data": {
                    **candidate,
                    "id": candidate_id,
                    "label": candidate.get("label") or candidate_id,
                    "type": "Candidate",
                    "layer": "candidate-queue",
                    "status": "candidate",
                    "source_refs": candidate.get("source_span_suggests_it", []),
                    "operational_consequence": [candidate.get("why_it_might_matter", "")],
                    "classifier_readiness": {"status": "candidate"},
                    "isCanonical": False,
                    "diffKinds": [],
                    "color": layer_color("candidate-queue"),
                    "statusColor": status_color("candidate"),
                },
            }
        )
    for relation in graph["relations"]:
        overlay = sorted(diff_overlay.get(relation["subject"], set()) | diff_overlay.get(relation["object"], set()))
        elements.append(
            {
                "group": "edges",
                "data": {
                    **relation,
                    "id": relation["id"],
                    "source": relation["subject"],
                    "target": relation["object"],
                    "label": relation["predicate"],
                    "isCanonical": relation["id"] in canonical_relation_ids,
                    "diffKinds": overlay,
                    "color": status_color(relation.get("status")),
                },
            }
        )
    return {
        "id": graph["id"],
        "summary": graph["summary"],
        "elements": elements,
        "canonicalEntityCount": len(canonical_entity_ids),
        "canonicalRelationCount": len(canonical_relation_ids),
        "candidateCount": len(candidate_queue.get("candidates", [])),
        "viewerConfig": viewer_config(),
        "diff": {
            "summary": diff.get("summary", {}),
            "review_needed": diff.get("review_needed", []),
            "underrepresented_gates": diff.get("underrepresented_gates", []),
            "semantic_findings": diff.get("findings", []),
            "entityless_findings": [item for item in diff.get("findings", []) if not item.get("entity_id")],
            "claims": diff.get("claims", []),
            "suppressed_lines": diff.get("suppressed_lines", []),
        },
        "sweep": diff.get("sweep", {}),
    }


def build_diff_overlay(diff: dict[str, Any]) -> dict[str, set[str]]:
    overlay: dict[str, set[str]] = defaultdict(set)
    for item in diff.get("aligned", []):
        if item.get("entity_id"):
            overlay[item["entity_id"]].add("aligned")
    for item in diff.get("stale", []):
        if item.get("entity_id"):
            overlay[item["entity_id"]].add("stale")
    for item in diff.get("candidate_new", []):
        if item.get("entity_id"):
            overlay[item["entity_id"]].add("candidate_new")
    for item in diff.get("underrepresented_gates", []):
        if item.get("entity_id"):
            overlay[item["entity_id"]].add("underrepresented_gate")
    for item in diff.get("findings", []):
        if item.get("entity_id"):
            overlay[item["entity_id"]].add(item.get("kind", "semantic_finding").replace("-", "_"))
    return overlay


def write_html_viewer(
    path: Path,
    graph: dict[str, Any],
    candidate_queue: dict[str, Any] | None = None,
    diff: dict[str, Any] | None = None,
) -> None:
    payload = build_cytoscape_payload(graph, candidate_queue, diff)
    data = json.dumps(payload).replace("</", "<\\/")
    cytoscape = read_cytoscape_bundle().replace("</script", "<\\/script")
    css = VIEWER_CSS.read_text(encoding="utf-8")
    app_js = VIEWER_JS.read_text(encoding="utf-8").replace("</script", "<\\/script")
    html = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{VIEWER_TITLE}</title>
<style>
{css}
</style>
</head>
<body>
<div class="app">
  <header class="topbar">
    <div class="title">
      <strong>{VIEWER_TITLE}</strong>
      <small>{VIEWER_SUBTITLE}</small>
    </div>
    <div class="toolbar" id="summary"></div>
  </header>
  <aside class="panel">
    <div class="control-group">
      <h2>Throughline</h2>
      <div class="stack">
        <select id="preset"></select>
        <div class="notice" id="presetDescription"></div>
      </div>
    </div>
    <div class="control-group">
      <h2>Search</h2>
      <div class="stack">
        <input id="search" type="search" placeholder="Find entity, relation, type, source...">
        <div class="search-results" id="searchResults"></div>
      </div>
    </div>
    <div class="control-group">
      <h2>Layout</h2>
      <div class="row">
        <select id="layout">
          <option value="preset">Preset default</option>
          <option value="cose">CoSE</option>
          <option value="breadthfirst">Breadthfirst</option>
          <option value="concentric">Concentric</option>
          <option value="grid">Grid</option>
        </select>
      </div>
    </div>
    <div class="control-group">
      <h2>Actions</h2>
      <div class="button-grid">
        <button id="fit">Fit</button>
        <button id="reset">Reset</button>
        <button id="neighborhood">Neighborhood</button>
        <button id="path">Path</button>
        <button id="copyJson">Copy JSON</button>
        <button id="exportPng">Export PNG</button>
      </div>
    </div>
    <div class="control-group"><h2>Layers</h2><div class="checks" id="layerFilters"></div></div>
    <div class="control-group"><h2>Status</h2><div class="checks" id="statusFilters"></div></div>
    <div class="control-group"><h2>Types</h2><div class="checks" id="typeFilters"></div></div>
    <div class="control-group"><h2>Predicates</h2><div class="checks" id="predicateFilters"></div></div>
  </aside>
  <main class="graph-wrap"><div id="cy"></div></main>
  <aside class="panel details" id="details"></aside>
  <footer class="statusbar">
    <span id="counts"></span>
    <span>Generated from `.semantica` run artifacts; browser state is not persisted.</span>
  </footer>
</div>
<script id="graph-data" type="application/json">{data}</script>
<script>
{cytoscape}
</script>
<script>
{app_js}
</script>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def read_cytoscape_bundle() -> str:
    if not CYTOSCAPE_BUNDLE.exists():
        raise FileNotFoundError(
            f"Cytoscape bundle not found at {CYTOSCAPE_BUNDLE}. Run `bun install` or `bun add -D cytoscape` from the repository root."
        )
    return CYTOSCAPE_BUNDLE.read_text(encoding="utf-8")
