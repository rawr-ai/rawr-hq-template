const payload = JSON.parse(document.getElementById("graph-data").textContent);
const allElements = payload.elements;
const allNodes = allElements.filter((element) => !element.data.source);
const allEdges = allElements.filter((element) => element.data.source);
const selectedNodeIds = [];
let selectedItem = null;
const viewerConfig = payload.viewerConfig || {};
const layerColors = viewerConfig.layerColors || {};
const statusColors = viewerConfig.statusColors || {};

const presets = {
  canonical: {
    label: "Canonical Core",
    layout: "cose",
    description: "Locked canonical graph. Candidates and evidence-only material stay hidden.",
    matchNode: (data) => data.isCanonical && data.status !== "candidate",
    matchEdge: (data) => data.isCanonical,
  },
  layered: {
    label: "Layered Graph",
    layout: "cose",
    description: "Canonical graph plus explicit overlays. Candidate queue remains hidden unless selected.",
    matchNode: (data) => data.status !== "candidate",
    matchEdge: () => true,
  },
  runtime: {
    label: "Runtime Realization",
    layout: "breadthfirst",
    description: "Runtime artifacts, lifecycle, gates, and handoffs.",
    matchNode: (data) =>
      data.layer === "runtime-realization-overlay" ||
      ["RuntimeArtifact", "RuntimeMachinery", "RuntimePhase", "ValidationGate"].includes(data.type),
    matchEdge: (data) =>
      data.layer === "runtime-realization-overlay" ||
      ["produces", "requires", "orders", "provisions", "compiles_to", "validated_by", "finalizes", "lowers_to"].includes(
        data.predicate,
      ),
  },
  authority: {
    label: "Ownership And Authority",
    layout: "concentric",
    description: "Document authority, ownership, projection, replacement, and prohibition edges.",
    matchNode: (data) =>
      data.layer === "authority-and-document-overlay" ||
      ["DocumentAuthority", "ArchitectureRoot", "ConstructionLaw", "ForbiddenPattern"].includes(data.type),
    matchEdge: (data) =>
      data.layer === "authority-and-document-overlay" ||
      ["is_authority_for", "owns_truth", "owns_projection", "does_not_own", "replaces", "forbids"].includes(data.predicate),
  },
  gates: {
    label: "Gates And Validation",
    layout: "breadthfirst",
    description: "Validation gates and the requirements that connect to them.",
    matchNode: (data) => data.type === "ValidationGate" || data.diffKinds.includes("underrepresented_gate"),
    matchEdge: (data) => ["requires", "validated_by", "observes", "supports"].includes(data.predicate),
  },
  forbidden: {
    label: "Forbidden And Replacement",
    layout: "breadthfirst",
    description: "Forbidden target terms, replacement rules, and stale-overlap review paths.",
    matchNode: (data) => data.status === "forbidden" || data.type === "ForbiddenPattern",
    matchEdge: (data) => ["forbids", "replaces"].includes(data.predicate),
  },
  "testing-plan-diff": {
    label: "Semantic Evidence",
    layout: "concentric",
    description: "Semantic comparison findings from parsed evidence claims, plus legacy diff overlays when present.",
    matchNode: (data) => data.diffKinds.length > 0 || data.type === "ValidationGate",
    matchEdge: (data) => data.diffKinds.length > 0 || ["requires", "validated_by", "observes", "supports"].includes(data.predicate),
  },
  classifier: {
    label: "Classifier Readiness",
    layout: "cose",
    description: "Classifier-readiness annotations and explicit candidate queue items.",
    matchNode: (data) =>
      data.layer === "classifier-readiness-overlay" ||
      data.status === "candidate" ||
      Boolean(data.classifier_readiness?.status),
    matchEdge: (data) => data.layer === "classifier-readiness-overlay",
  },
};

const cy = cytoscape({
  container: document.getElementById("cy"),
  elements: allElements,
  wheelSensitivity: 0.16,
  minZoom: 0.12,
  maxZoom: 3,
  style: [
    {
      selector: "node",
      style: {
        label: "data(label)",
        "font-size": 10,
        "text-max-width": 110,
        "text-wrap": "wrap",
        "text-valign": "center",
        "text-halign": "center",
        color: "#101828",
        "background-color": "data(color)",
        "border-color": "data(statusColor)",
        "border-width": 3,
        width: 44,
        height: 44,
      },
    },
    {
      selector: "node[type = 'DocumentAuthority']",
      style: { shape: "round-rectangle", width: 62, height: 36 },
    },
    {
      selector: "node[type = 'ValidationGate']",
      style: { shape: "diamond", width: 50, height: 50 },
    },
    {
      selector: "node[status = 'candidate']",
      style: { "border-style": "dashed", "background-opacity": 0.65 },
    },
    {
      selector: "edge",
      style: {
        width: 2,
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "target-arrow-color": "#98a2b3",
        "line-color": "#98a2b3",
        label: "data(predicate)",
        "font-size": 8,
        "text-rotation": "autorotate",
        "text-background-color": "#f6f7f9",
        "text-background-opacity": 0.88,
        "text-background-padding": "2px",
      },
    },
    {
      selector: ".hidden",
      style: { display: "none" },
    },
    {
      selector: ".dim",
      style: { opacity: 0.14 },
    },
    {
      selector: ".focus",
      style: {
        "border-color": "#fdb022",
        "border-width": 6,
        "line-color": "#fdb022",
        "target-arrow-color": "#fdb022",
        "z-index": 10,
      },
    },
    {
      selector: ".diffAligned",
      style: { "border-color": "#12b76a" },
    },
    {
      selector: ".diffReview",
      style: { "border-color": "#f79009", "border-width": 6 },
    },
    {
      selector: ".diffStale",
      style: { "border-color": "#f04438", "border-width": 6 },
    },
  ],
  layout: { name: "cose", animate: false, fit: true, padding: 50 },
});

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function listValues(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item.data[key] || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderCheckboxes(id, items, key) {
  const container = document.getElementById(id);
  container.innerHTML = listValues(items, key)
    .map(
      ([value, count]) =>
        `<label><input type="checkbox" value="${esc(value)}" checked><span>${esc(value)}</span><span class="count">${count}</span></label>`,
    )
    .join("");
  container.addEventListener("change", applyFilters);
}

function checkedValues(id) {
  return new Set([...document.querySelectorAll(`#${id} input:checked`)].map((input) => input.value));
}

function selectedPreset() {
  return presets[document.getElementById("preset").value] || presets.canonical;
}

function elementSearchText(data) {
  return [data.id, data.label, data.type, data.layer, data.status, data.predicate, data.definition, ...(data.aliases || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesSearch(data) {
  const query = document.getElementById("search").value.trim().toLowerCase();
  return !query || elementSearchText(data).includes(query);
}

function applyFilters() {
  const preset = selectedPreset();
  const layers = checkedValues("layerFilters");
  const statuses = checkedValues("statusFilters");
  const types = checkedValues("typeFilters");
  const predicates = checkedValues("predicateFilters");
  const visibleNodeIds = new Set();

  cy.nodes().forEach((node) => {
    const data = node.data();
    const visible =
      preset.matchNode(data) &&
      layers.has(data.layer || "unknown") &&
      statuses.has(data.status || "unknown") &&
      types.has(data.type || "unknown") &&
      matchesSearch(data);
    node.toggleClass("hidden", !visible);
    if (visible) visibleNodeIds.add(data.id);
    node.toggleClass("diffAligned", data.diffKinds.includes("aligned"));
    node.toggleClass(
      "diffReview",
      data.diffKinds.includes("review_needed") ||
        data.diffKinds.includes("underrepresented_gate") ||
        data.diffKinds.includes("ambiguous") ||
        data.diffKinds.includes("candidate_new"),
    );
    node.toggleClass(
      "diffStale",
      data.diffKinds.includes("stale") ||
        data.diffKinds.includes("forbidden") ||
        data.diffKinds.includes("conflict") ||
        data.diffKinds.includes("deprecated_use"),
    );
  });

  cy.edges().forEach((edge) => {
    const data = edge.data();
    const visible =
      preset.matchEdge(data) &&
      predicates.has(data.predicate || "unknown") &&
      layers.has(data.layer || "unknown") &&
      statuses.has(data.status || "unknown") &&
      visibleNodeIds.has(data.source) &&
      visibleNodeIds.has(data.target) &&
      matchesSearch(data);
    edge.toggleClass("hidden", !visible);
  });

  document.getElementById("presetDescription").textContent = preset.description;
  renderSearchResults();
  updateStatus();
}

function visibleElements() {
  return cy.elements().not(".hidden");
}

function runLayout(name = document.getElementById("layout").value) {
  const layoutName = name === "preset" ? selectedPreset().layout : name;
  visibleElements().layout({ name: layoutName, animate: false, fit: true, padding: 50, directed: true }).run();
}

function updateStatus() {
  const visibleNodes = cy.nodes().not(".hidden").length;
  const visibleEdges = cy.edges().not(".hidden").length;
  document.getElementById("counts").textContent =
    `${visibleNodes}/${cy.nodes().length} nodes, ${visibleEdges}/${cy.edges().length} edges visible`;
}

function renderSearchResults() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const container = document.getElementById("searchResults");
  if (!query) {
    container.innerHTML = "";
    return;
  }
  const matches = cy
    .nodes()
    .filter((node) => elementSearchText(node.data()).includes(query))
    .slice(0, 25);
  container.innerHTML = matches
    .map(
      (node) =>
        `<button class="search-result" data-id="${esc(node.id())}"><strong>${esc(node.data("label") || node.id())}</strong><small>${esc(
          node.data("type"),
        )} · ${esc(node.data("layer"))}</small></button>`,
    )
    .join("");
}

function selectElement(element) {
  if (!element || element.empty()) return;
  cy.elements().removeClass("focus dim");
  selectedItem = element;
  element.select();
  renderDetails(element);
  if (element.isNode()) {
    selectedNodeIds.push(element.id());
    while (selectedNodeIds.length > 2) selectedNodeIds.shift();
  }
}

function focusElement(id) {
  const element = cy.getElementById(id);
  if (!element || element.empty()) return;
  selectElement(element);
  cy.animate({ center: { eles: element }, zoom: Math.max(cy.zoom(), 1.2) }, { duration: 180 });
}

function renderDetails(element) {
  const data = element.data();
  const refs = data.source_refs || [];
  const consequences = data.operational_consequence || [];
  const diffKinds = data.diffKinds || [];
  const relatedFindings = (payload.diff?.semantic_findings || []).filter((finding) => finding.entity_id === data.id).slice(0, 12);
  document.getElementById("details").innerHTML = `
    <div class="detail-block">
      <h2>${esc(data.label || data.id)}</h2>
      <p class="mono">${esc(data.id)}</p>
      <span class="pill">${esc(element.isNode() ? data.type : data.predicate)}</span>
      <span class="pill">${esc(data.layer)}</span>
      <span class="pill ${data.status === "forbidden" ? "bad" : data.status === "candidate" ? "warn" : "good"}">${esc(data.status)}</span>
      ${diffKinds.map((kind) => `<span class="pill warn">${esc(kind)}</span>`).join("")}
    </div>
    ${data.definition ? `<div class="detail-block"><h3>Definition</h3><p>${esc(data.definition)}</p></div>` : ""}
    ${data.subject ? `<div class="detail-block"><h3>Relation</h3><p class="mono">${esc(data.subject)} --${esc(data.predicate)}--> ${esc(data.object)}</p></div>` : ""}
    <div class="detail-block"><h3>Operational Consequence</h3>${
      consequences.length ? consequences.map((value) => `<span class="pill">${esc(value)}</span>`).join("") : '<p class="muted">None recorded.</p>'
    }</div>
    <div class="detail-block"><h3>Source References</h3>${
      refs.length ? refs.map(renderSourceRef).join("") : '<p class="muted">No source refs recorded.</p>'
    }</div>
    ${relatedFindings.length ? `<div class="detail-block"><h3>Semantic Findings</h3>${relatedFindings.map(renderSemanticFinding).join("")}</div>` : ""}
    <div class="detail-block"><h3>Connected Relations</h3>${renderConnected(element)}</div>
    <div class="detail-block"><h3>Raw Data</h3><pre>${esc(JSON.stringify(data, null, 2))}</pre></div>
  `;
}

function renderSemanticFinding(finding) {
  return `<div class="source-ref">
    <strong>${esc(finding.kind)} · ${esc(finding.rule || "")}</strong><br>
    <span>${esc(finding.document_path)}:${esc(finding.line_start)} (${esc(finding.polarity)}/${esc(finding.modality)}/${esc(finding.assertion_scope)})</span><br>
    ${finding.ambiguity_bucket ? `<span class="pill warn">${esc(finding.ambiguity_bucket)}</span>` : ""}
    ${finding.review_action ? `<span>${esc(finding.review_action)}</span><br>` : ""}
    <span>${esc(finding.text)}</span>
  </div>`;
}

function renderSourceRef(ref) {
  const lines = ref.line_start ? `:${ref.line_start}${ref.line_end && ref.line_end !== ref.line_start ? `-${ref.line_end}` : ""}` : "";
  return `<div class="source-ref"><strong>${esc(ref.path)}${esc(lines)}</strong><br><span>${esc(ref.section || "")}</span></div>`;
}

function renderConnected(element) {
  const connected = element.isNode() ? element.connectedEdges().slice(0, 20) : element.connectedNodes();
  if (!connected.length) return '<p class="muted">No connected visible relations.</p>';
  return connected
    .map((item) => {
      const data = item.data();
      const label = item.isEdge() ? `${data.subject} --${data.predicate}--> ${data.object}` : `${data.label || data.id}`;
      return `<button class="search-result" data-id="${esc(item.id())}"><span class="mono">${esc(label)}</span></button>`;
    })
    .join("");
}

function showNeighborhood() {
  if (!selectedItem || !selectedItem.isNode()) return;
  const neighborhood = selectedItem.closedNeighborhood().union(selectedItem.closedNeighborhood().connectedNodes());
  cy.elements().addClass("dim");
  neighborhood.removeClass("dim hidden").addClass("focus");
  cy.animate({ fit: { eles: neighborhood, padding: 60 } }, { duration: 180 });
}

function showPath() {
  const [sourceId, targetId] = selectedNodeIds;
  if (!sourceId || !targetId || sourceId === targetId) return;
  const source = cy.getElementById(sourceId);
  const target = cy.getElementById(targetId);
  const dijkstra = visibleElements().dijkstra(source, () => 1, true);
  const path = dijkstra.pathTo(target);
  if (!path.length) return;
  cy.elements().addClass("dim");
  path.removeClass("dim hidden").addClass("focus");
  cy.animate({ fit: { eles: path, padding: 70 } }, { duration: 180 });
}

function copySelectedJson() {
  if (!selectedItem) return;
  navigator.clipboard?.writeText(JSON.stringify(selectedItem.data(), null, 2));
}

function exportPng() {
  const url = cy.png({ full: true, scale: 2, bg: "#f6f7f9" });
  const link = document.createElement("a");
  link.href = url;
  link.download = "rawr-core-ontology-graph.png";
  link.click();
}

function renderSummary() {
  const summary = payload.summary || {};
  const diffSummary = payload.diff?.summary || {};
  const sweepSummary = payload.sweep?.summary || {};
  document.getElementById("summary").innerHTML = `
    <span class="pill">${esc(summary.canonical_entity_count || payload.canonicalEntityCount || 0)} canonical entities</span>
    <span class="pill">${esc(summary.canonical_relation_count || payload.canonicalRelationCount || 0)} canonical relations</span>
    <span class="pill warn">${esc(payload.candidateCount || 0)} candidates hidden by default</span>
    <span class="pill">${esc(sweepSummary.documents_analyzed || 0)} swept docs</span>
    <span class="pill warn">${esc(sweepSummary.recommendations?.["review-needed"] || 0)} sweep review-needed</span>
    <span class="pill bad">${esc(sweepSummary.recommendations?.["quarantine-candidate"] || 0)} sweep quarantine candidates</span>
    <span class="pill">${esc(diffSummary.review_needed_count || 0)} review-needed diff items</span>
    <span class="pill warn">${esc(diffSummary.findings_by_kind?.ambiguous || 0)} ambiguous semantic findings</span>
    <span class="pill">${esc(payload.diff?.entityless_findings?.length || 0)} entityless findings</span>
    <span class="pill">${esc(payload.diff?.suppressed_lines?.length || 0)} suppressed scaffold lines</span>
  `;
}

function initControls() {
  document.getElementById("preset").innerHTML = Object.entries(presets)
    .map(([key, value]) => `<option value="${esc(key)}">${esc(value.label)}</option>`)
    .join("");
  renderCheckboxes("layerFilters", allNodes, "layer");
  renderCheckboxes("statusFilters", allNodes, "status");
  renderCheckboxes("typeFilters", allNodes, "type");
  renderCheckboxes("predicateFilters", allEdges, "predicate");
  document.getElementById("preset").addEventListener("change", () => {
    applyFilters();
    runLayout("preset");
  });
  document.getElementById("layout").addEventListener("change", () => runLayout());
  document.getElementById("search").addEventListener("input", applyFilters);
  document.getElementById("fit").addEventListener("click", () => cy.fit(visibleElements(), 50));
  document.getElementById("reset").addEventListener("click", () => {
    document.getElementById("search").value = "";
    cy.elements().removeClass("dim focus");
    applyFilters();
    runLayout("preset");
  });
  document.getElementById("neighborhood").addEventListener("click", showNeighborhood);
  document.getElementById("path").addEventListener("click", showPath);
  document.getElementById("copyJson").addEventListener("click", copySelectedJson);
  document.getElementById("exportPng").addEventListener("click", exportPng);
  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (button) focusElement(button.dataset.id);
  });
}

cy.on("tap", "node, edge", (event) => selectElement(event.target));
cy.on("dbltap", "node", (event) => {
  selectElement(event.target);
  showNeighborhood();
});

initControls();
renderSummary();
applyFilters();
runLayout("preset");
document.getElementById("details").innerHTML = '<div class="notice">Select a node or edge to inspect provenance, semantics, and connected relations.</div>';
