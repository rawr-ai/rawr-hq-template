# Architecture Document Intelligence Execution Workflow

Status: active execution workflow
Date: 2026-04-29
Branch: `codex/semantica-first-pipeline-implementation`

## Artifact Roles And Reading Order

Read `architecture-document-intelligence-next-stage-draft.md` first for the work-to-be-done plan. Use this document second as the execution control loop: phase inputs, review teams, verification gates, stop conditions, and outputs.

## Goal

Move architecture-document intelligence from per-document reports to corpus-level review capability:

```text
doc sweep -> global evidence index -> index-backed queries -> evidence HTML -> RDF/Semantica projection -> agent-facing access -> optional LLM evidence sidecar -> developer acceptance
```

Generated evidence remains review evidence only. RAWR reviewed ontology, source-authority policy, candidate promotion, prohibited/deprecated semantics, and deterministic verdict policy remain authoritative.

## Current Baseline

- Latest submitted evidence-index commit: `767d1b6c feat(semantica): add sweep evidence index`
- PR: `https://app.graphite.com/github/pr/rawr-ai/rawr-hq-template/251`
- Current generated sweep run: `.semantica/runs/20260429T014150Z-ebad0be0adf8-doc-sweep`
- Current index: `46` documents, `4247` claims, `4795` findings, `0` warnings

The generated run/count values are a local snapshot. `.semantica/current` and `.semantica/runs` are local generated review artifacts, not committed source.

## Stop Conditions

Stop and escalate rather than proceeding if a phase would modify finalized source specs, track generated `.semantica` state, promote evidence to ontology truth, weaken deterministic RAWR verdict policy, or require Semantica/LLM capability that is missing or materially different from the proven local package.

## Phase Review Loop

Every phase uses fresh review agents before commit.

- Orchestrator: owns scope, integration, final call, and Graphite hygiene.
- Quality/correctness reviewer: checks code soundness, edge cases, and regression risk.
- Coherence reviewer: checks consistency with prior artifacts and RAWR authority boundaries.
- Objective-alignment reviewer: challenges whether the phase materially improves architecture-review capability.
- Phase-specific reviewer: covers schema/API/info-design/RDF/MCP/LLM dimensions as needed.
- Verification steward: checks tests are falsifying enough and not only happy-path confirmation.

Each phase output feeds the next phase. A phase is complete only when verification passes, material review findings are fixed or recorded, generated `.semantica/` state is ignored, the worktree is clean, and the phase has been committed/submitted through Graphite when tracked files changed.

## Phase Sequence

### Execution Phase 0: Plan Artifact Refresh And Baseline Lock

- Input: submitted `767d1b6c` evidence-index implementation and current generated sweep snapshot.
- Work: update the work-to-be-done draft with current index implementation status and create this workflow artifact.
- Review axes: docs navigability, current/target/transition separation, objective alignment.
- Verification: `git status --short --branch`, `gt status`, `git diff --check`, and explicit confirmation that the draft references the current baseline.
- Output: active work-to-be-done draft plus this execution workflow.

### Execution Phase 1: Index Baseline Validation

- Input: `sweep-evidence-index.json`, `sweep-evidence-index.jsonl`, and `sweep-evidence-index-summary.json`.
- Work: validate the existing index contract as the substrate for later work and add only gap-closing contract tests/notes if needed.
- Review axes: schema stability, source-span preservation, claim/finding referential integrity, authority boundary.
- Verification: full workbench unittest discovery, `bun run semantica:doc:sweep`, `bun run semantica:doc:index -- --run latest`, zero index warnings, and totals matching per-document artifacts.
- Output: trusted JSON evidence index contract.

### Execution Phase 2: Index-Backed Query Layer

- Input: trusted JSON evidence index.
- Work: add durable evidence named queries over `sweep-evidence-index.json`.
- Review axes: query API stability, JSON/text output shape, source-span/report-link preservation, reviewer usefulness.
- Verification: unit tests for each named query, text/JSON CLI smokes, missing-index failure test, and proof that queries do not scrape HTML or source Markdown.
- Output: structured cross-document query capability.

### Execution Phase 3: Evidence Index HTML Review View

- Input: index-backed query layer and JSON evidence index.
- Work: add `sweep-evidence-index.html` rendered from the JSON index.
- Review axes: information design, responsive path wrapping, content fidelity, no invented interpretation.
- Verification: HTML existence tests, fixture/full-sweep smoke, report-link existence checks, and manual/browser inspection when available.
- Output: human corpus evidence audit surface.

### Execution Phase 4: RDF And Semantica Projection

- Input: stable JSON evidence index and evidence HTML/query contract.
- Work: add `sweep-evidence-index.ttl` and SPARQL support over the evidence projection.
- Review axes: RDF vocabulary coherence, Semantica projection fit, count parity, canonical-view leakage prevention.
- Verification: RDF parse test, JSON/TTL count parity, SPARQL smoke queries, and leakage tests against canonical target graph.
- Output: graph projection with JSON as generated evidence contract.

### Execution Phase 5: Agent-Facing Query Access

- Input: stable query layer and RDF/Semantica projection.
- Work: add a stable agent-facing manifest and honest MCP capability/status surface.
- Review axes: agent handoff clarity, MCP capability truthfulness, security/authority boundary.
- Verification: `core:query --list` includes evidence queries, manifest points to stable commands/artifacts, MCP probe records available/blocked state, and a fresh agent can answer three cross-document questions from query outputs.
- Output: agent access path that avoids scraping generated internals.

### Execution Phase 6: LLM Evidence Augmentation Sandbox

- Input: stable deterministic index, queries, and agent-facing contract.
- Work: add optional sidecar augmentation for ambiguous/unresolved/candidate evidence rows.
- Review axes: LLM provenance, fail-closed behavior, source anchoring, deterministic regression safety.
- Verification: no-credentials blocked-mode test, mock/provider sidecar-shape test, confidence/source-span tests, and unchanged deterministic index/query outputs when LLM is disabled.
- Output: evidence-only LLM sidecar, disabled/fail-closed by default.

### Execution Phase 7: End-To-End Developer Capability Acceptance

- Input: full sweep/index/query/HTML/RDF/agent/LLM pipeline.
- Work: run the full gate and record final state.
- Review axes: developer capability, skeptical architecture usefulness, release hygiene.
- Verification: full unittest gate, `semantica:semantic:capability`, fixture compare/proposal-compare, full sweep/index, representative evidence queries, HTML link checks, RDF/SPARQL checks, ignored-state checks, `git diff --check`, and `gt status`.
- Output: submitted, clean, review-ready corpus evidence intelligence pipeline.
