# semantica-First Pipeline Implementation Plan

Status: concrete implementation plan
Date: 2026-04-27
Scope: RAWR architecture-document semantic comparison, semantica substrate adoption, ontology/evidence governance, review tooling, and developer capability
Filename note: this file retains the earlier `draft` filename for continuity, but it is now the active implementation plan.

## Summary

This plan turns the semantica-first reframe into implementation work. The current workbench already has valuable RAWR governance: reviewed ontology YAML, source authority, evidence claims, candidate queues, conservative document sweep recommendations, and static review artifacts. The next step is to stop treating local heuristic code as the semantic engine and move progressively toward semantica as the substrate.

The target contract is:

```text
RAWR owns truth, authority policy, ontology promotion, review semantics, source spans, and developer-facing review actions.
semantica owns the semantic substrate where proven: ingest, parse, split, extraction, provenance, graph construction, normalization, conflicts, reasoning, pipeline, MCP/server, export, and visualization.
```

Implementation must proceed through capability proofs. Missing semantica extras block the corresponding feature; they do not justify building another parallel semantic platform.

## Current Baseline

The active workbench has three relevant paths:

- Manifest extraction: source manifest -> Markdown chunks -> seed graph -> heuristic or direct OpenAI extraction -> normalized ontology/evidence artifacts -> report.
- Reviewed core ontology: YAML layers -> validation -> canonical/layered graph JSON -> semantica ontology/export probes -> viewer/query artifacts.
- Document comparison: comparison document -> local evidence claims -> local resolution and Python verdict rules -> semantic compare report and sweep outputs.

The document comparison path is better than raw lexical matching, but it is still mostly local heuristic machinery. It uses regex-style claim signals, local suppression rules, local term resolution, local polarity/modality/scope classification, and local verdict branches. semantica is presently used mainly for package status, ontology export probes, pattern triplet extraction, and RDF/SPARQL compatibility.

The implementation goal is not to delete this work. It should become fallback, adapter, regression oracle, and RAWR policy layer while semantica takes over more substrate responsibilities as each surface proves usable.

## Source And Authority Inputs

Use these inputs as the current authority model for implementation:

- Finalized source specs: canonical architecture and runtime realization specs under `docs/projects/rawr-final-architecture-migration/resources/spec/`.
- Active workbench contract: `tools/semantica-workbench/README.md`, current CLI commands, fixture docs, tests, and generated artifact shapes.
- Reviewed ontology inputs: `tools/semantica-workbench/ontologies/rawr-core-architecture/`.
- Current implementation packet: this plan, `Workflow.md`, and the semantica-first synthesis/report artifacts in this context directory.
- Generated state: `.semantica/` is ignored derived output and is never source authority.
- Historical/quarantined docs: useful for provenance and regression context only; they should not route future agents as current implementation guidance.

## Artifact Contract

Tracked artifacts may include:

- Implementation plans, capability reports, review reports, fixture definitions, tests, and workbench source code.
- Ontology YAML, manifest policy, and RAWR-owned adapters that preserve source authority, spans, review state, and promotion gates.

Ignored/generated artifacts include:

- `.semantica/current/*`, generated RDF/JSON-LD/GraphML/Cytoscape outputs, temporary probe output, and temporary agent scratch notes.

Each phase handoff must state:

- Commands run.
- Tracked files changed.
- Generated artifacts inspected.
- Residual uncertainty.
- Whether the Graphite branch/worktree is clean.

## Uncertainty Ledger

Carry these uncertainties explicitly until proven by tests or source inspection:

- The pinned semantica package API may not match public docs or assumptions.
- Optional extras may be absent; missing extras block that feature rather than authorizing a local rebuild.
- semantica chunking/provenance may not preserve exact Markdown line spans without a RAWR adapter.
- LLM extraction can manufacture structure; outputs remain evidence until reviewed.
- The current manual core entity model may be too constrained or incomplete.
- Forbidden, deprecated, historical, ambiguous, and candidate semantics are distinct and must not collapse into raw phrase hits.

## Implementation Phases

### Phase 0: Active Plan And Workflow

Purpose:

- Make the active context packet safe for future agents.

Inputs:

- Previous semantica-first draft.
- Existing `Workflow.md`.
- Current Graphite stack.

Changes:

- Convert this file into the active concrete implementation plan.
- Replace `Workflow.md` with the active orchestration workflow for the agent team.
- Keep finalized architecture/runtime source specs untouched.
- Work on a clean Graphite branch above `codex/semantica-underutilization-review`.

Outputs:

- Active implementation plan.
- Active orchestration workflow.

Commands:

- `git status --short --branch`
- `gt status`
- `git diff --check`

Acceptance:

- The plan and workflow are tracked.
- The old CloudPro/core-ontology workflow is no longer the first-hop active workflow for this effort.
- Worktree hygiene is clean after commit.

Deferrals:

- No source-spec changes.
- No operational semantica replacement beyond the capability proof slice.

### Phase 1: Pinned semantica Capability Proof

Purpose:

- Classify pinned semantica surfaces as ready, blocked, partial, or adapter-required.

Inputs:

- Pinned semantica package in `tools/semantica-workbench/pyproject.toml` and `uv.lock`.
- Current capability probe and tests.

Changes:

- Expand the capability report to inventory relevant semantica modules, classes, MCP tools/resources, optional dependencies, and blocked feature gates.
- Record adversarial semantic fixtures and expected policy buckets.
- Record a replace/reduce/retain matrix for local workbench logic.
- Keep the report explicit that semantica output is evidence, not RAWR truth.

Outputs:

- Capability report schema and renderer.
- Unit tests for module gates, optional dependencies, MCP inventory, fixtures, and replacement matrix.

Commands:

- `UV_PROJECT_ENVIRONMENT="$PWD/.semantica/venv" uv run --project tools/semantica-workbench --python 3.12 python -m unittest discover -s tools/semantica-workbench/tests`
- `bun run semantica:semantic:capability`

Acceptance:

- `bun run semantica:semantic:capability` produces a reviewer-useful report.
- Missing extras such as OpenAI, LiteLLM, FastAPI/Uvicorn, or PySHACL are recorded as feature blockers.
- Unit tests verify module inventory, MCP inventory, feature gates, fixture list, and replacement matrix.

Deferrals:

- Do not replace extraction, graph, reasoning, or MCP workflows until later phases prove parity and developer value.

### Phase 2: Ingest, Split, And Provenance Foundation

Purpose:

- Introduce semantica-backed intake without weakening source identity or span guarantees.

Inputs:

- Existing source manifests.
- Markdown fixtures.
- `chunk_markdown` behavior and generated evidence artifacts.

Changes:

- Add a semantica-backed intake/split probe for the same scoped documents the workbench already processes.
- Preserve manifest source identity, authority ranks, path classes, quarantine/archive exclusions, and exact line spans.
- Add a small RAWR line-span adapter only if semantica split/provenance output cannot preserve exact Markdown spans.
- Keep `chunk_markdown` as fallback and parity oracle.

Outputs:

- Intake/split adapter or proof module.
- Span parity tests and fixture outputs.

Commands:

- Unit tests for chunk parity and span fidelity.
- Fixture extract/compare smoke commands.

Acceptance:

- Tests prove parity between current chunking and semantica-backed intake for fixture sources.
- Any lost span/provenance information downgrades the path to evidence-only or fallback.

Deferrals:

- Do not feed semantica chunks into decision-grade findings until exact span mapping is proven.

### Phase 3: semantica Extraction Pilot

Purpose:

- Use semantica extraction as the pilot parser while preserving RAWR evidence semantics.

Inputs:

- Current evidence claim schema.
- Adversarial semantic fixtures.
- semantica extraction and optional LLM-provider gates.

Changes:

- Add a parser mode that attempts semantica extraction first and maps results into the existing RAWR evidence claim shape.
- Keep deterministic extraction as fallback and fixture oracle.
- Use semantica LLM provider paths only if provider extras are installed and proven.
- Prevent all extracted entities from entering locked ontology facts without review.

Outputs:

- semantica-backed parser mode.
- Evidence adapter tests.
- Fallback and blocked-feature reporting.

Commands:

- Fixture unit tests.
- `bun run semantica:doc:extract -- --fixture`
- `bun run semantica:doc:compare -- --fixture`

Acceptance:

- Fixture tests cover negated prohibited patterns, positive prohibited patterns, historical mentions, deprecated replacement context, ambiguity, and candidates.
- Behavioral tests prove opposite claims do not collapse into the same finding.
- Missing provider extras are reported clearly rather than silently falling back as if semantica LLM extraction succeeded.

Deferrals:

- Do not auto-promote extracted entities into the locked core.

### Phase 4: Graph, Normalization, And Candidate Handling

Purpose:

- Move graph intelligence toward semantica while preserving RAWR target-authority views.

Inputs:

- Reviewed ontology YAML.
- Evidence claims.
- Candidate queue and current graph outputs.

Changes:

- Add probes or adapters for semantica KG construction, entity resolution, normalization, and deduplication.
- Preserve stable RAWR IDs, controlled predicates, target-architecture view, candidate queue, and evidence-only separation.
- Route semantica-discovered gaps to candidate/evidence status, never locked facts.

Outputs:

- KG/normalization adapter proof.
- Leakage tests for target, candidate, and evidence views.

Commands:

- Core build/export/query tests.
- Candidate/evidence leakage unit tests.

Acceptance:

- Tests prove candidate and evidence nodes cannot leak into the target architecture view.
- Review reports separate core counts from evidence, candidates, review findings, and verification-policy concepts.

Deferrals:

- Do not replace stable RAWR IDs or controlled predicate governance.

### Phase 5: Conflict, Reasoning, And Explanation

Purpose:

- Make review findings explainable as source evidence plus rule/reasoning output.

Inputs:

- Local verdict rules.
- semantica conflict/reasoning surfaces.
- Source authority and review-action policy.

Changes:

- Move a small set of verdict proofs into semantica conflict/reasoning surfaces, or wrap RAWR-authored rules with semantica explanation/provenance support.
- Emit an explanation chain for every decision-grade finding: source claim -> resolved target -> authority context -> rule/conflict/reasoning result -> finding kind -> review action.
- Keep RAWR decision-grade semantics explicit.

Outputs:

- Explanation-chain artifacts.
- Verdict rule tests.
- Behavioral false-positive tests.

Commands:

- Rule-level unit tests.
- Integration tests over generated graph/evidence artifacts.

Acceptance:

- Unit tests cover each rule and explanation chain.
- Adversarial tests prove raw phrase hits alone cannot create conflicts.
- Ambiguous evidence stays ambiguous instead of being forced into a false conflict.

Deferrals:

- Do not delegate RAWR-owned review-action meanings to semantica.

### Phase 6: MCP, Query, Export, And Review Surfaces

Purpose:

- Give agents and developers stable query/export surfaces without scraping generated files.

Inputs:

- semantica MCP constants/tools/resources.
- Current CLI query/export/visualization commands.
- Generated review artifacts.

Changes:

- Add MCP smoke proof where local semantica MCP can load or summarize graph/evidence state.
- Keep the CLI as the RAWR command wrapper.
- Evaluate semantica export and visualization before extending custom Cytoscape.
- Reduce custom named queries to durable review affordances.

Outputs:

- MCP smoke tests.
- Export parity reports.
- Review-surface information-design findings.

Commands:

- MCP smoke command or import test.
- Core export/query/visualize smoke checks.

Acceptance:

- A developer can ask graph/provenance questions through a stable interface without scraping `.semantica/current`.
- Exported graph/evidence formats preserve canonical IDs and source lineage.
- Generated reports remain clear about canonical, candidate, evidence, and review-finding separation.

Deferrals:

- Keep Cytoscape static artifacts if semantica visualization is not mature enough.

### Phase 7: Pipeline And Sweep Orchestration

Purpose:

- Move batch orchestration mechanics toward semantica pipeline primitives only where they improve reliability.

Inputs:

- Current sweep commands and fixtures.
- Recommendation categories.
- semantica pipeline capability proof.

Changes:

- Rebuild document sweep orchestration as RAWR policy over semantica pipeline DAG/checkpoint/retry/run-state primitives.
- Preserve recommendation categories and review queues.
- Keep existing sweep behavior as parity oracle until semantica pipeline passes regression.

Outputs:

- Pipeline wrapper proof.
- Sweep regression tests.
- Checkpoint/retry limitations or support notes.

Commands:

- Sweep fixture tests.
- Multi-document integration smoke.

Acceptance:

- Multi-document sweep tests pass.
- Recommendation policy remains RAWR-owned.
- Restart/checkpoint behavior is documented if supported; otherwise the limitation is explicit.

Deferrals:

- Do not move RAWR recommendation semantics into generic pipeline state.

### Phase 8: Developer Capability Acceptance

Purpose:

- Confirm the migration improves developer capability, not just internals.

Inputs:

- One canonical architecture doc.
- One runtime realization doc.
- One testing-policy or review-policy doc.
- Final graph/evidence/reasoning outputs.

Changes:

- Polish the end-to-end workflow and review reports based on behavioral findings.

Outputs:

- Acceptance report or handoff.
- Final verification record.

Commands:

- Full workbench gate.
- Real-doc compare and query smoke.
- `git diff --check`
- `gt status`

Acceptance:

- A developer can compare an architecture doc and understand aligned, conflicting, deprecated, ambiguous, candidate, and outside-scope findings with exact source spans.
- A developer can inspect why a finding exists and what action is expected.
- A developer can query graph/provenance through a stable interface.
- semantica is materially used where proven.
- RAWR truth remains reviewed and locked.

Deferrals:

- Any unfinished semantica surface must have a scoped blocker, owner, and removal trigger for the fallback.

## Verification Plan

Run verification in layers.

Unit:

- Python unit tests under `tools/semantica-workbench/tests`.
- Capability report structure and missing-extra gates.
- Fixture verdicts, span preservation, canonical/candidate/evidence leakage checks, and rule explanations.

Integration:

- `bun run semantica:setup`
- `bun run semantica:check`
- `bun run semantica:core:validate`
- `bun run semantica:core:build`
- `bun run semantica:core:export`
- `bun run semantica:semantic:capability`
- `bun run semantica:doc:extract -- --fixture`
- `bun run semantica:doc:compare -- --fixture`
- `bun run semantica:doc:sweep` over fixture roots
- representative query and visualization smoke checks

Behavioral:

- Fixture cases for negation, prohibition, deprecated terms, historical mentions, ambiguity, and candidates.
- Real-doc compares over canonical architecture, runtime realization, and testing-policy docs.
- Review reports checked by code quality, information design, semantica usage, target-authority, testing, and developer-capability stewards.

Repo hygiene:

- `git diff --check`
- generated `.semantica/` artifacts remain ignored
- `gt status`
- clean Graphite commit after each completed phase

## Non-Negotiable Boundaries

- semantica output is evidence unless reviewed.
- Reviewed RAWR ontology governs RAWR truth.
- Source spans are required for decision-grade findings.
- Missing semantica extras are blockers for those features.
- Compatibility/fallback paths require scope and removal trigger.
- Finalized architecture/runtime specs are not modified by this implementation unless explicitly planned later.
