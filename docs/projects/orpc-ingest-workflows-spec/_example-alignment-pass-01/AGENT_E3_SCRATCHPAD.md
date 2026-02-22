# Agent E3 Scratchpad

## Scope + Guardrails
- Owned target: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-03-microfrontend-integration.md`
- Allowed artifacts only:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E3_PLAN_VERBATIM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E3_SCRATCHPAD.md`
- No runtime code changes.
- No policy drift.

## Skills Introspection Notes

### Literal skills explicitly applied (required)
1. `system-design`
- Applied focus: boundary choices, control-plane separation, second-order effects when routes/mount semantics are ambiguous.
- Enforcement in rewrite: preserve explicit split between caller-facing boundaries and runtime ingress; avoid collapsing surfaces.

2. `api-design`
- Applied focus: consumer model and contract authority, interaction style split (first-party RPC vs external OpenAPI), explicit contract ownership.
- Enforcement in rewrite: make MFE default `/rpc` path explicit, keep OpenAPI usage as external/exception path, tighten route/auth matrix wording.

3. `typebox`
- Applied focus: schema-artifact-first framing and ownership boundaries for where I/O schema declarations live.
- Enforcement in rewrite: keep TypeBox-first snippet posture and boundary-owned workflow trigger/status I/O emphasis.

### Additional required skills applied
1. `information-design`
- Applied for restructuring flow: intent -> caller model -> topology -> concrete snippets -> failure modes -> conformance anchors.
2. `orpc`
- Applied for link/handler path correctness (`RPCLink` vs `OpenAPILink`) and contract-first plugin boundary shape.
3. `architecture`
- Applied for invariant preservation and no-drift rewrite under locked D-005/D-006/D-007/D-008 semantics.
4. `typescript`
- Applied for snippet clarity, typed context boundaries, and avoiding implicit ambiguity in client construction examples.
5. `inngest`
- Applied for runtime-ingress-only semantics and durable-function separation from caller boundary APIs.
6. `docs-architecture`
- Applied for document role clarity and canonical-source references.
7. `decision-logging`
- Applied to explicitly document where the rewrite resolves ambiguity without changing locked policy meaning.

## Conformance Map (E2E-03)

| Example segment | Canonical source(s) | Required conformance outcome | Edit action |
| --- | --- | --- | --- |
| Goal + axes framing | `ARCHITECTURE.md`, `README.md` | Keep example non-normative but policy-aligned; no invented policy | tighten language, avoid overreach |
| Caller/auth semantics table | `ARCHITECTURE.md` section 2.1, `axes/01`, `axes/03`, `axes/08` | first-party MFE default `/rpc`; external OpenAPI surfaces only; `/api/inngest` forbidden to callers | normalize wording to canonical matrix |
| Chosen default path | `DECISIONS.md` D-006/D-007, `axes/02`, `axes/08` | plugin-owned boundary contracts; package domain reuse without boundary ownership transfer | clarify ownership statements |
| Topology + route semantics | `axes/07`, `axes/08`, `axes/09` | split path explicit: caller routes vs runtime ingress | keep diagram intent, tighten labels |
| Workflow contract + router snippets | `DECISIONS.md` D-011/D-012, `axes/08` | workflow trigger/status I/O schemas owned in plugin boundary contracts | rewrite note/snippets to keep ownership explicit |
| Host composition snippet | `DECISIONS.md` D-008, `axes/07` | explicit control-plane order (`/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`) and baseline traces-first | adjust excerpt ordering language |
| MFE client usage snippet | `axes/01`, `axes/03`, `axes/08`, `axes/12` | default first-party `/rpc` via `RPCLink`; OpenAPI path explicit external/exception path | keep both snippets, elevate default vs exception text |
| Risks + checklist | `axes/05`, `axes/06`, `axes/12` | maintain negative-route constraints and no route-role confusion | align wording to canonical constraints |
| New Conformance Anchors section | `ARCHITECTURE.md`, `DECISIONS.md`, all relevant axes | trace major example segments to policy authorities | add dedicated section |

## Detail Preservation Ledger

### Retained (as-is or near-as-is)
1. Multi-caller matrix and MFE-centric framing.
2. Topology diagram showing MFE, workflow trigger router, runtime ingress, and durable function.
3. Browser-safe package exports (`browser.ts`) and `toRunBadge` style projection helper.
4. Concrete code snippets for workflow contract/router/function/context.
5. Explicit risk/guardrail section and policy checklist intent.

### Updated (policy-tightened while preserving detail)
1. Caller-mode defaults language:
- Update: make `/rpc` + `RPCLink` first-party default language explicit and repeated at usage points.
- Why: align with D-007 + axes 01/03/08.

2. OpenAPI usage path wording:
- Update: external/third-party default + explicit first-party exception path.
- Why: avoid implied equivalence between first-party and published surfaces.

3. Workflow boundary I/O ownership notes:
- Update: define trigger/status I/O in `plugins/workflows/*/contract.ts`; package schemas referenced only as domain reuse, not boundary ownership transfer.
- Why: align with D-006 + D-011.

4. Host composition ordering excerpt:
- Update: show/describe canonical mount/control-plane order and traces bootstrap baseline.
- Why: align with D-008 + axis 07.

5. Client creation snippets:
- Update: remove ambiguous generic-only client constructor shape; keep route-specific link semantics explicit.
- Why: reduce interpretation risk while keeping code-specific guidance.

### Removed or replaced
1. Any phrasing that could imply `/api/inngest` is callable as boundary API.
- Replacement: explicit runtime-ingress-only language + forbidden routes assertions.

2. Any phrasing that implies OpenAPI and RPC are co-default for first-party MFE.
- Replacement: clear default/exception split.

3. Any snippet narrative that could read as package owning workflow trigger/status boundary contract schemas.
- Replacement: plugin boundary ownership statements co-located with contract examples.

## Rewrite Decisions (Decision-Logging Style)
1. Decision: keep API plugin optional language.
- Context: Example is workflow + MFE focused.
- Options: remove optional language vs keep optional language with explicit guardrails.
- Choice: keep optional language with explicit boundary constraints.
- Rationale: aligns with existing example intent without changing locked policy.
- Risk: readers may still overgeneralize; mitigated via Conformance Anchors.

2. Decision: keep high-detail code snippets instead of reducing to pseudocode.
- Context: mission requires detail/code specificity preservation.
- Options: shorten aggressively vs preserve concrete snippets.
- Choice: preserve concrete snippets, tighten comments and route semantics.
- Rationale: preserves example operational value.
- Risk: longer doc, mitigated with clearer sectioning + anchors.

3. Decision: add explicit Conformance Anchors section near end.
- Context: requirement calls for mapping major segments to canonical docs.
- Options: inline many parenthetical refs only vs dedicated map section.
- Choice: dedicated map section + existing inline references.
- Rationale: easier auditability for alignment pass.
- Risk: minor duplication, acceptable.

## 4-Pass Self-Check Results (Pre-Edit Baseline)

### Pass 1: Policy Conformance
- Result: **Needs correction**.
- Findings:
  1. Some wording allows perceived parity between first-party and OpenAPI paths rather than default/exception posture.
  2. Host excerpt does not consistently foreground D-008 control-plane order.

### Pass 2: Contradiction Scan
- Result: **Needs correction**.
- Findings:
  1. Contract-ownership narrative is mostly correct but can be interpreted as package-owned workflow boundary I/O due to schema imports.
  2. Client constructor snippet style is potentially ambiguous against canonical examples.

### Pass 3: Detail Preservation
- Result: **Good baseline**.
- Findings:
  1. Strong snippet depth and practical integration detail present.
  2. Preserve breadth while tightening policy language.

### Pass 4: Information-Design Clarity
- Result: **Needs improvement**.
- Findings:
  1. Policy references are distributed but not audit-friendly.
  2. Add explicit `Conformance Anchors` section for faster verification.

## Post-Edit Verification (Completed)

### Pass 1: Policy Conformance
- Result: **Pass**.
- Validated:
  1. First-party MFE default `/rpc` + `RPCLink` is explicit in framing, usage snippet, and checklist.
  2. OpenAPI usage is explicitly external/third-party default with first-party exception-only wording.
  3. Host composition excerpt now states traces-first + mount/control-plane order semantics consistent with D-008.

### Pass 2: Contradiction Scan
- Result: **Pass**.
- Validated:
  1. Workflow boundary I/O ownership now uses plugin-local output schemas in `contract.ts` snippet.
  2. Package domain schema imports are positioned as domain-concept reuse only, not boundary ownership transfer.
  3. Client construction snippets now match canonical route-specific link posture and avoid ambiguous constructor shape.

### Pass 3: Detail Preservation
- Result: **Pass**.
- Validated:
  1. High-detail concrete snippets retained for package, workflow router, durable function, host wiring, and web client mount.
  2. Operational guardrail and checklist sections remain intact and specific.
  3. No runtime code behavior instructions removed; only conformance-tight wording and snippet corrections added.

### Pass 4: Information-Design Clarity
- Result: **Pass**.
- Validated:
  1. Added dedicated `Conformance Anchors` section mapping major segments to canonical policy docs.
  2. Section flow still reads as practical example while making policy traceability auditable.
  3. Default-vs-exception transport rules are now consistently discoverable.

## Residual Risk Notes
1. Snippets are example-shaped and may still require local import-path adaptation in real repositories.
2. API plugin optionality remains context-sensitive; this doc now states that explicitly but implementers must still validate per-capability boundary requirements.

## COMPACTION SNAPSHOT

### Locked Invariants (carried forward)
1. First-party MFE default transport is `/rpc` via `RPCLink`; OpenAPI route families are external/default publication surfaces with first-party exception-only usage.
2. `/api/inngest` is runtime ingress only; never a caller-facing browser/API route.
3. Workflow/API boundary contracts remain plugin-owned; package domain reuse does not transfer boundary ownership.
4. Host composition stays explicit with control-plane order: `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`.
5. TypeBox-first contract/procedure schema authoring posture remains intact.

### Key Decisions in Loop 2
1. Re-audit for needless indirection and AI boilerplate against canonical packet + skill guidance.
2. Explicitly evaluate whether direct ORPC procedure exports are forbidden by canonical policy.
3. If not forbidden, shift E2E-03 workflow boundary snippet to a cleaner direct-procedure export pattern and remove redundant wrapper indirection.

### Current Example Structure (pre-Loop-2 edits)
1. Section 4.2 defines plugin-owned workflow boundary contract with inline I/O defaults.
2. Section 4.3 router snippet contains inline handlers but does not export procedures directly.
3. Section 4.5 manifest snippet contains redundant router wrapping (`implement(..., any)` + extra composition layer) and placeholder `{} as any` package context.
4. File-tree snippets still advertise `plugins/workflows/.../operations/*` although core workflow snippet logic is router-local.

## Quality Loop 2 — Explicit Answers + Recheck

### Explicit Answer 1: Does canonical spec forbid direct ORPC procedure exports here?
- **Answer: No, not forbidden in this case.**
- Basis:
  1. Axis 08 requires workflow trigger APIs to be authored as oRPC procedures and boundary-owned (`contract.ts`) with explicit mounts; it does not impose a MUST for separate `operations/*` files for every handler.
  2. Axis 08 naming defaults mention `operations/*` as a role-oriented default pattern, but the hard MUST constraints focus on route split, ownership, ingress boundaries, and context injection.
  3. Axis 01 and E2E-01 demonstrate `operations/*` for explicit boundary/package adaptation cases; they do not establish a universal prohibition on direct procedure exports when adaptation logic is local and clear.

### Explicit Answer 2: If not forbidden, did we revise to cleaner direct-procedure pattern?
- **Answer: Yes.**
- Applied revisions in E2E-03:
  1. Workflow router now exports direct procedure handlers (`triggerReconciliationProcedure`, `getRunStatusProcedure`, `getRunTimelineProcedure`) and composes them into `invoicingWorkflowRouter`.
  2. Removed redundant manifest wrapper indirection (`implement<typeof triggerContract, any>(...)` + extra router re-wrapping).
  3. Replaced placeholder `{} as any` package-context wiring with `createRawrHqManifest(packageContext)` factory shape.
  4. Updated file-tree and narrative notes to reflect direct-procedure pattern (no thin workflow `operations/*` wrappers in this variant).

### Final Re-Audit ("stupid mistakes" pass)

1. Unnecessary operation-function indirection
- Status: **Addressed**.
- Change: direct workflow procedure exports now used in router snippet; guidance explicitly says use `operations/*` only when mapping/adaptation is non-trivial.

2. Redundant context import/passing rewiring
- Status: **Addressed**.
- Change: manifest creation now parameterized via `createRawrHqManifest(packageContext)`; removed redundant contract/router re-implementation and `any` placeholder.

3. AI-boilerplate patterns
- Status: **Reduced**.
- Change: removed extra wrapper composition layer, removed stale workflow `operations/*` tree hint, and aligned examples with explicit, policy-grounded route ownership + mount order semantics.

### Exactly What Changed and Why (Loop 2 delta)
1. **Workflow direct-procedure exports**: clearer ownership and fewer indirection hops while preserving policy invariants.
2. **Manifest composition cleanup**: removed non-essential wrapper + `any` placeholder to make host/plugin composition realistic and deterministic.
3. **File-tree/narrative cleanup**: aligned displayed structure with actual snippet architecture to prevent implementation confusion.
4. **No policy drift**: preserved `/rpc` first-party default, OpenAPI exception/publication posture, plugin boundary ownership, and ingress/runtime split semantics.

## Quality Loop 3 Re-Introspection (Required)

Re-applied skills before edits:
1. `information-design`
- Used to tighten read path and conformance traceability (segment-to-authority anchors and snippet/tree consistency).
2. `orpc`
- Used to enforce route/link defaults and contract/procedure snippet posture (`RPCLink` first-party default; OpenAPI external/exception).
3. `inngest`
- Used to preserve runtime-ingress-only semantics and explicit trigger-vs-durable split.
4. `docs-architecture`
- Used to keep this file as authoritative example while preserving canonical policy source hierarchy.
5. `decision-logging`
- Used to record explicit before/after rationale by error class and avoid silent drift.
6. `system-design`
- Used to validate boundary control planes (caller APIs vs runtime ingress) and avoid collapsed semantics.
7. `api-design`
- Used to verify publication boundary model, caller mode defaults, and external exception framing.
8. `typebox`
- Used to align schema ownership and TypeBox-first authoring while avoiding boundary payload ownership drift.
9. `typescript`
- Used to remove unsafe casts/ambiguous snippet logic and keep typed procedure behavior explicit.

## QUALITY LOOP 3 FINDINGS + FIXES

### Fix Ledger (every applied fix)

1. Error class: `6) Type/schema mistakes` + `1) Policy drift risk (D-012 inline posture)`
- Location: `e2e-03-microfrontend-integration.md` section `4.2` (`plugins/workflows/invoicing/src/contract.ts` snippet)
- Before: extracted output-only constants (`WorkflowRunStatusOutputSchema`, `WorkflowRunTimelineOutputSchema`) wrapped via `std(...)` for object-root outputs.
- After: `getRunStatus` and `getRunTimeline` now use inline `.output(schema({...}))` object-root declarations directly in route definitions.
- Why: re-aligns with D-012 inline-I/O default and object-root wrapper preference while preserving workflow boundary contract ownership.

2. Error class: `3) Ownership violations` + `6) payload-boundary confusion`
- Location: `e2e-03-microfrontend-integration.md` section `4.1` (`packages/invoicing/src/domain/status.ts` + `view.ts` snippets)
- Before: package `domain/status.ts` defined `RunStatusSchema` and `RunTimelineSchema` that mirrored workflow boundary route payload semantics.
- After: replaced with projection-only `RunBadgeInputSchema`; `toRunBadge` now consumes `RunBadgeInput`.
- Why: removes second-source ambiguity for workflow route payload ownership; preserves browser-safe package semantics without transferring boundary I/O ownership from plugin contracts.

3. Error class: `8) Snippet quality issues` (unsafe cast / possible impossible state)
- Location: `e2e-03-microfrontend-integration.md` section `4.3` (`plugins/workflows/invoicing/src/router.ts` snippet)
- Before: unchecked cast `run.status as "queued" | "running" | "completed" | "failed"` and duplicated terminal-state logic.
- After: added `normalizeReconciliationState(status: string)` guard + explicit typed fallback error; reused `isTerminalReconciliationState(...)` from package domain helper.
- Why: eliminates unsafe TS cast boilerplate, keeps domain invariants explicit, and avoids silent impossible-path acceptance.

4. Error class: `8) Snippet quality issues` (import-path realism / brittle snippet)
- Location: `e2e-03-microfrontend-integration.md` section `4.5` (`apps/server/src/rawr.ts` snippet)
- Before: split imports for tracing helper (`@rawr/coordination-inngest` + `@rawr/coordination-inngest/tracing`).
- After: consolidated import to `@rawr/coordination-inngest` for both `createInngestServeHandler` and `initializeExtendedTracesBaseline`.
- Why: reduces likely path mismatch and keeps host bootstrap snippet coherent with manifest-level composition narrative.

5. Error class: `10) Information-design failures` + `9) Hidden ambiguity`
- Location: `e2e-03-microfrontend-integration.md` section `10` (Conformance Anchors table)
- Before: no explicit anchor row for direct-procedure-export pattern, which could invite re-branching toward unnecessary wrapper/operations assumptions.
- After: added dedicated conformance anchor row mapping direct procedure exports to `DECISIONS.md` D-004 and `axes/08-workflow-api-boundaries.md`.
- Why: improves policy traceability and prevents agent/implementer ambiguity about when direct exports are canonical-safe.

6. Error class: `8) Snippet quality issues` (tree/snippet mismatch)
- Location: `e2e-03-microfrontend-integration.md` section `11` (Canonical File Tree comment for `domain/status.ts`)
- Before: comment claimed `status.ts` contained run status/timeline schemas.
- After: comment now states browser projection input schema.
- Why: reconciles tree commentary with updated snippet content and prevents implementation drift.

### Broad Audit Classes Checked (no additional patch required)
1. `2) Route-surface misuse`: no drift found; `/rpc` first-party default and `/api/inngest` runtime-only constraints remain explicit.
2. `4) Client/link misuse`: default `RPCLink` vs external `OpenAPILink` split remains explicit and exception-scoped.
3. `5) Context/middleware misuse`: boundary vs runtime context split preserved; no invented universal context.
4. `7) Wiring black boxes`: host composition/mount order remains explicit with manifest-driven wiring shown.

## Quality Loop 3 — Final 4-Pass Self-Check

### Pass 1: Policy Conformance (D-005..D-015)
- Result: **Pass**.
- Notes:
  1. D-005/D-007 route and caller transport split remains explicit (`/rpc` first-party default; published OpenAPI external/exception; `/api/inngest` runtime-only).
  2. D-006/D-011 ownership posture tightened by removing boundary-like payload duplication from package domain snippet.
  3. D-012 inline-I/O default restored in workflow contract snippet.
  4. D-008 mount/bootstrap order remains explicit and unchanged.
  5. D-013/D-014/D-015 constraints remain intact (manifest-first, one-way ownership/import posture, route-aware verification guardrails).

### Pass 2: Contradiction Scan
- Result: **Pass**.
- Notes:
  1. No remaining contradiction between package-domain snippet intent and workflow boundary I/O ownership narrative.
  2. Direct procedure export posture now has explicit policy anchor, reducing conflicting interpretation with `operations/*` defaults.

### Pass 3: Detail Preservation
- Result: **Pass**.
- Notes:
  1. Kept concrete code depth across package, workflow contract/router, durable function, host wiring, and MFE client usage.
  2. Changes were precision edits (ownership clarity, schema posture, typed safety), not simplification/removal of critical integration detail.

### Pass 4: Information-Design Clarity
- Result: **Pass**.
- Notes:
  1. Conformance anchors now better cover direct-procedure pattern and reduce branching ambiguity.
  2. Tree/snippet alignment improved, making read path and implementation intent clearer.
