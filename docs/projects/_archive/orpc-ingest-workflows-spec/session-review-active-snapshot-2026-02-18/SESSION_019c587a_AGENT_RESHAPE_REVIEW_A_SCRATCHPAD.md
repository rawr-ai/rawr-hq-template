# SESSION_019c587a_AGENT_RESHAPE_REVIEW_A — Scratchpad

## Mission
Independent validity/safety review of reshape plan for logical correctness, structural soundness, and migration safety.

## Compact Capture

### Locked Invariants (from canonical packet)
1. Split architecture is locked: oRPC boundary APIs and Inngest durability remain separate.
2. `/rpc` is first-party/internal transport; external publication is `/api/orpc/*` and `/api/workflows/<capability>/*`.
3. `/api/inngest` is runtime-only signed ingress, never a browser/API caller surface.
4. Workflow/API boundary contracts are plugin-owned; packages are transport-neutral and own shared domain logic only.
5. Workflow trigger/status I/O schema ownership remains at workflow plugin boundary contracts.
6. TypeBox-only authoring for contract/procedure schemas is required.
7. Procedure I/O schemas live with procedures/contracts; not in `domain/*`.
8. Context metadata contracts (request/correlation/principal/network) belong in `context.ts`, not `domain/*`.
9. Host bootstrap order is locked: initialize baseline traces first; then mount `/api/inngest`; then `/api/workflows/*`; then `/rpc` and `/api/orpc/*`.
10. One runtime-owned Inngest bundle (`client + functions`) per process.

### No-Drift Rules (reshape execution)
1. Exactly one canonical caller/auth matrix source in reshaped docs; all others must be explicitly derived views.
2. No decision ID reuse or repurposing in `DECISIONS.md`.
3. No policy text changes masked as structural edits; semantic deltas require explicit decision entries.
4. No content-drop moves: every relocated section/snippet requires source -> destination trace.
5. No rename ambiguity: one locked filename manifest must supersede all draft variants.
6. No archive-before-verify: parity/link checks must pass before source doc retirement.

### Unresolved Gates (must resolve or bound before execution)
1. Canonical matrix authority conflict (ARCHITECTURE vs AXIS_02 claim divergence across reshape inputs).
2. Decision numbering gate (planned new D-012 collides with existing D-012).
3. Content-preservation gate (formal non-loss protocol not yet specified in reshape plan).
4. Ownership/process gate for `rawr.hq.ts` (generated vs hand-authored contract unclear; impacts maintenance policy).
5. Risk framing gate (current “LOW risk” statement does not match known migration hazards).

### Reshape Blockers (current)
1. **BLOCKER:** Decision ID collision in planned DECISIONS changes.
2. **BLOCKER:** Canonical caller/auth authority not consistently locked.
3. **BLOCKER:** “No content loss” claim lacks deterministic migration safeguards.

## Mandatory Inputs Read

### Skills (required)
1. `/Users/mateicanavra/.codex-rawr/skills/information-design/SKILL.md`
2. `/Users/mateicanavra/.codex-rawr/skills/docs-architecture/SKILL.md`
3. `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
4. `/Users/mateicanavra/.codex-rawr/skills/deep-search/SKILL.md`

### Official spec packet docs (required)
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_01_EXTERNAL_CLIENT_GENERATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_02_INTERNAL_CLIENTS_INTERNAL_CALLING.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_03_SPLIT_VS_COLLAPSE.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_04_CONTEXT_CREATION_AND_PROPAGATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_09_DURABLE_ENDPOINTS_VS_DURABLE_FUNCTIONS.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/REDISTRIBUTION_TRACEABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`

### Reshape + assessments (required)
- `docs/projects/flat-runtime-session-review/RESHAPE_PROPOSAL.md`
- `docs/projects/flat-runtime-session-review/CANONICAL_ASSESSMENT.md`
- `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md`
- `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md`
- `docs/projects/flat-runtime-session-review/_RESHAPE_PLAN_PACKET_INTERIOR.md`

## Truth Set Used for Validation
1. Current canonical decision ledger identity and IDs come from `orpc-ingest-spec-packet/DECISIONS.md`.
2. Packet authority model says packet index + axis docs are canonical slices; reshape must avoid introducing authority ambiguity.
3. Safety claim in reshape requires demonstrable non-loss migration controls, especially for code-heavy examples.

## Findings Draft (evidence log)

### B1 — Decision ID collision introduced by reshape text
- Severity candidate: BLOCKER
- Evidence:
  - `RESHAPE_PROPOSAL.md:409` says “Add new closed D-012 entry for path strategy”.
  - Existing `DECISIONS.md:68` already has `### D-012 — Inline-I/O docs posture and extracted shape normalization`.
- Why this matters:
  - Decision identity becomes ambiguous and cross-links become untrustworthy.
  - Violates the plan’s own no-breaking-IDs claim (`RESHAPE_PROPOSAL.md:572`).
- Required fix direction:
  - Allocate next unused ID (e.g., D-013), update all D-012-path-strategy references.

### B2 — Canonical caller/auth authority is internally inconsistent across plan inputs
- Severity candidate: BLOCKER
- Evidence:
  - `RESHAPE_PROPOSAL.md:259` sets canonical matrix in `ARCHITECTURE.md`.
  - `_RESHAPE_PLAN_AUTHORITY_CONSOLIDATION.md:381` sets canonical in `ARCHITECTURE.md` (consistent with above).
  - `_RESHAPE_PLAN_PACKET_INTERIOR.md:235` declares AXIS_02 as canonical matrix.
- Why this matters:
  - Two canonical sources create recurrence of the exact dual-authority defect the reshape is trying to remove.
- Required fix direction:
  - `RESHAPE_PROPOSAL.md` must explicitly lock one canonical source and mark other tables as “derived/specialized views”.

### B3 — “No content loss” guarantee is not operationalized with migration gates
- Severity candidate: BLOCKER
- Evidence:
  - `RESHAPE_PROPOSAL.md:23` claims all content preserved/nothing deleted.
  - Same plan introduces removals/reductions (`RESHAPE_PROPOSAL.md:399`, `RESHAPE_PROPOSAL.md:347`, `RESHAPE_PROPOSAL.md:409`).
  - Validation step is generic (`RESHAPE_PROPOSAL.md:563`) without deterministic parity method.
- Why this matters:
  - High risk of dropping implementation-legible snippets while deduplicating/rewriting trees and debates.
- Required fix direction:
  - Add explicit “content preservation protocol”: snippet inventory, section-level move map, link parity checks, and completion gate before deleting originals.

### M1 — Filename map divergence across reshape artifacts
- Severity candidate: MAJOR
- Evidence:
  - `RESHAPE_PROPOSAL.md:48` uses `e2e-02-api-workflows-composed.md`.
  - `_RESHAPE_PLAN_SYSTEM_ARCHITECTURE.md:116` uses `e2e-02-api-workflows.md`.
- Why this matters:
  - Renames become nondeterministic; ref updates can target wrong file names.
- Required fix direction:
  - `RESHAPE_PROPOSAL.md` should include a single locked rename table and mark all other naming mentions as non-authoritative.

### M2 — Risk statement materially understates known hazards
- Severity candidate: MAJOR
- Evidence:
  - `RESHAPE_PROPOSAL.md:572` says low risk, no content deletion, no decision-ID breaks.
  - Conflicts with known ID collision + planned line removals + relocation complexity.
- Why this matters:
  - Teams may execute without required safeguards because risk is framed too low.
- Required fix direction:
  - Reclassify risk to medium until blockers are resolved and add explicit failure modes.

### M3 — Execution order is not migration-safe for high-volume refactoring
- Severity candidate: MAJOR
- Evidence:
  - `RESHAPE_PROPOSAL.md:526-533` front-loads move/rename before consolidation and parity verification.
- Why this matters:
  - Increases chance of temporary orphaned references and missed content during merge.
- Required fix direction:
  - Change to copy+validate+cutover sequence (build new canonical docs first, then move/archive originals).

### M4 — Open-question handling underestimates architecture-affecting ambiguity
- Severity candidate: MAJOR
- Evidence:
  - `RESHAPE_PROPOSAL.md:468` says open questions are non-blocking.
  - Q-06 (`RESHAPE_PROPOSAL.md:510`) about `rawr.hq.ts` generated vs hand-authored affects ownership/update pipeline.
- Why this matters:
  - This directly changes where updates are allowed and what tooling contract must exist.
- Required fix direction:
  - Reclassify Q-06 as pre-execution gate (or explicitly constrain plan to documentation-only target not implementation process contract).

### m1 — Cross-reference cleanup scope omits non-local backlinks
- Severity candidate: MINOR
- Evidence:
  - `RESHAPE_PROPOSAL.md:415-443` focuses on internal packet refs.
- Impact:
  - Possible orphaned links from docs outside this folder (runbooks, AGENTS, other docs indexes).
- Fix:
  - Add global repo grep/backlink check as final gate.

### note1 — Proposal section numbering includes embedded pseudo-headings from AXIS_07 sample block
- Severity candidate: NOTE
- Evidence:
  - `rg '^## '` on proposal catches inline mock headings around section 6 block.
- Impact:
  - Low; may confuse skim readers.
- Fix:
  - Fence/indent section-shape example clearly as code block (if not already clearly rendered in all viewers).

## Required RESHAPE_PROPOSAL.md Edit Targets (section-level)
1. `## 1. What This Proposal Does` — replace absolute “nothing deleted” language with measurable preservation guarantee.
2. `## 5. Caller/Auth Matrix Consolidation` — add canonical-source lock and conflict resolution note vs AXIS_02 perspective table.
3. `## 8. E2E Example Improvements` — add explicit non-loss strategy for implementation snippets when switching full trees to diff views.
4. `## 9. DECISIONS.md Improvements` — fix D-012 collision; reserve next ID for path-strategy decision.
5. `## 13. Execution Sequence` — convert to safe order: construct new canonical files, verify parity, then archive/move.
6. `## 14. Risk Assessment` — update risk level and enumerate real hazards and gates.
7. `## 12. Open Questions` — elevate Q-06 to gated decision or explicitly bounded assumption.

## Preliminary Verdict
Not implementation-ready as written. Requires blocker fixes before execution.
