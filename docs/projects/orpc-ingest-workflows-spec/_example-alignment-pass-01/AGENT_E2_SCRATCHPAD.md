# Agent E2 Scratchpad

## Scope + Guardrails
- Owned target:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-02-api-workflows-composed.md`
- Allowed artifacts:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E2_PLAN_VERBATIM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/_example-alignment-pass-01/AGENT_E2_SCRATCHPAD.md`
- No runtime code changes.
- No policy drift.

## Skills Introspection Notes

### Literal skills explicitly applied (required)
1. `system-design`
- Applied focus: preserve explicit boundary/control-plane separation and prevent route-role collapse.
- Enforcement in rewrite: keep caller-facing workflow routes and runtime ingress as separate surfaces with explicit mount ownership and ordering.

2. `api-design`
- Applied focus: caller model clarity, contract ownership, and route/publication guarantees.
- Enforcement in rewrite: explicit first-party `/rpc` default, external OpenAPI publication boundaries, and plugin-owned boundary contracts.

3. `typebox`
- Applied focus: schema-artifact-first contract posture and static type co-location.
- Enforcement in rewrite: keep TypeBox-first contract/procedure snippets and avoid non-TypeBox contract/procedure schema authoring.

### Additional required skills applied
1. `information-design`
- Applied for structure: goal -> topology -> file tree -> concrete snippets -> wiring steps -> runtime sequences -> guardrails -> anchors.

2. `orpc`
- Applied for transport/mount correctness (`RPCHandler`, `OpenAPIHandler`, `RPCLink`, `OpenAPILink`) and contract-first router ownership.

3. `architecture`
- Applied for locked-decision preservation (D-005, D-006, D-007, D-008, D-011, D-012, D-013, D-014, D-015).

4. `typescript`
- Applied for typed context seams and explicit interface boundaries in snippets.

5. `inngest`
- Applied for runtime-ingress-only path and durable execution semantics (`step.run`, retries, callback ingress).

6. `docs-architecture`
- Applied for document role discipline and canonical-source traceability.

7. `decision-logging`
- Applied to capture non-trivial rewrite choices and risk notes.

### Skill availability/fallback note
- All required skill files were present and read directly.
- No fallback substitution was required.

## Conformance Map (E2E-02)

| Example segment | Canonical source(s) | Required conformance outcome | Planned rewrite action |
| --- | --- | --- | --- |
| Goal + framing | `README.md`, `ARCHITECTURE.md` | Example remains non-normative, policy-aligned, and split-aware | tighten scope language to explicit API+workflow+runtime split |
| Caller transport semantics | `ARCHITECTURE.md` section 2.1, `axes/01`, `axes/03`, `axes/08` | first-party `/rpc` default, external OpenAPI publication, `/api/inngest` runtime-only | add explicit caller/auth matrix and route constraints |
| Topology diagram | `axes/03`, `axes/07`, `axes/08` | preserve split control planes and shared package client reuse | update diagram labels for `/rpc`, published boundaries, runtime ingress |
| Internal package layer | `axes/02`, `DECISIONS.md` D-011/D-012 | package remains transport-neutral with internal client reuse | retain concrete package snippets with clarified ownership notes |
| API plugin boundary | `axes/01`, `axes/02`, `DECISIONS.md` D-006 | API boundary contract is plugin-owned and maps to package client | retain snippets, tighten ownership wording |
| Workflow trigger boundary | `axes/08`, `DECISIONS.md` D-005/D-006 | workflow trigger/status are caller-facing boundary contracts; enqueue to Inngest | retain trigger preflight+enqueue pattern with clearer route semantics |
| Manifest composition | `ARCHITECTURE.md`, `axes/07`, `axes/11` | manifest-driven wiring (`rawr.hq.ts`) is explicit composition authority | rewrite manifest snippet to canonical `orpc` + `workflows` + `inngest` shape |
| Host composition + mount order | `DECISIONS.md` D-008, `axes/07` | explicit mount order: `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*` | replace OpenAPI-only register snippet with explicit multi-handler mount snippet |
| Context injection seams | `axes/04`, `axes/07`, `axes/11` | boundary/workflow context factories are explicit; injected ports are clear | add host context seam section/snippets (`createBoundaryContext`, `createWorkflowBoundaryContext`) |
| Runtime sequence section | `axes/05`, `axes/08`, `axes/09` | preserve trigger->enqueue->durable->status flow with route-correct assertions | revise flows to include first-party `/rpc` default and runtime-ingress isolation |
| Guardrails + checklist | `DECISIONS.md`, `axes/12` | include negative route assertions and no ownership drift | tighten guardrails and checklist items to canonical wording |
| Conformance traceability | `CANONICAL_EXPANSION_NAV.md` | major segments map to canonical policy docs | add dedicated `Conformance Anchors` section |

## Detail Preservation Ledger

### Retained snippets/details
1. TypeBox-first domain schemas and static types in package layer.
2. Internal package procedures for start/queue/mark-result behavior.
3. API plugin operations delegating into `context.invoicing.*`.
4. Workflow trigger operation preflight + `inngest.send` event enqueue.
5. Durable function with `step.run` and package client status updates.
6. Explicit file-tree and wiring-step walkthrough.
7. Runtime sequence decomposition (API flow, trigger flow, durable flow).

### Updated snippets/details (policy-tightened)
1. Route family and transport semantics:
- from implicit OpenAPI-first usage to explicit first-party `/rpc` default + external OpenAPI publication.
2. Manifest shape:
- from mixed ad hoc route registration to canonical manifest-driven namespaces with explicit workflow trigger router and runtime bundle.
3. Host route registration:
- from OpenAPI-only route helper to explicit `RPCHandler` + `OpenAPIHandler` + ingress callback mounts and parse-safe forwarding.
4. Context injection seams:
- from generic context pass-through to explicit host context factory seams and typed boundary/workflow context contracts.
5. Caller/auth table:
- expanded to canonical matrix projection including forbidden-route constraints.
6. Section references:
- add explicit canonical links and anchor mapping for auditability.

### Removed/replaced snippets/details
1. Removed: helper pattern that only mounted OpenAPI API/workflow surfaces without `/rpc` first-party path.
- Replacement: explicit split mount snippets with `/rpc`, `/api/orpc/*`, `/api/workflows/*`, `/api/inngest`.

2. Removed: ambiguous language implying equivalent default usage of `/api/orpc/*` and `/api/workflows/*` for all callers.
- Replacement: caller-mode split with first-party/internal vs external/public semantics.

3. Removed: context wiring that did not expose explicit seam ownership.
- Replacement: dedicated context factory snippets and injection boundaries.

4. Removed: sections lacking policy traceability index.
- Replacement: dedicated `Conformance Anchors` section.

## Rewrite Decisions (Decision-Logging Contract)
1. Decision: preserve high code specificity rather than converting to abstract pseudocode.
- Context: mission requires detail/code specificity retention.
- Options: concise conceptual rewrite vs concrete snippet-preserving rewrite.
- Choice: concrete snippet-preserving rewrite.
- Rationale: keeps operational value and reviewer trust.
- Risk: longer doc; mitigated by clearer structure + anchors.

2. Decision: make first-party `/rpc` default explicit even where example originally used boundary OpenAPI snippets.
- Context: canonical caller-mode semantics are locked.
- Options: keep implicit multi-route tone vs explicit default/exception split.
- Choice: explicit default/exception split.
- Rationale: avoids policy drift and ambiguity.
- Risk: requires more routing detail; acceptable.

3. Decision: add dedicated context-seam section.
- Context: mission requires explicit context injection seams.
- Options: leave seams implied in route snippets vs add explicit seam module guidance.
- Choice: explicit seam section with typed examples.
- Rationale: aligns with axes 04/07/11 and D-014.
- Risk: slight duplication with host section; acceptable.

## 4-Pass Self-Check Results (Pre-Edit Baseline)

### Pass 1: Policy Conformance
- Result: **Needs correction**.
- Findings:
  1. Example leans OpenAPI-only in composition snippets, under-representing first-party `/rpc` default semantics.
  2. Host mount ordering is not fully aligned with D-008 explicit control-plane sequence.

### Pass 2: Contradiction Scan
- Result: **Needs correction**.
- Findings:
  1. Route semantics and caller defaults are not uniformly expressed across sections.
  2. Context seam ownership is implied rather than explicit in key wiring snippets.

### Pass 3: Detail Preservation
- Result: **Strong baseline**.
- Findings:
  1. Rich package/API/workflow snippets should be retained.
  2. Keep durable execution and preflight+enqueue sequence intact during conformance rewrite.

### Pass 4: Information-Design Clarity
- Result: **Needs improvement**.
- Findings:
  1. Canonical policy traceability is distributed and hard to audit quickly.
  2. Add dedicated conformance anchors and tighten section purpose boundaries.

## Post-Edit Verification (Completed)

### Pass 1: Policy Conformance
- Result: **Pass**.
- Checks:
  1. Caller-mode semantics now explicitly encode `/rpc` first-party default, OpenAPI publication boundaries, and runtime-only `/api/inngest`.
  2. Mount/control-plane order is explicitly documented as `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`.
  3. Plugin-owned boundary contract ownership and package transport-neutral ownership are explicit and consistent.

### Pass 2: Contradiction Scan
- Result: **Pass**.
- Checks:
  1. No conflicting statements between route families, caller classes, and transport defaults.
  2. Context seam ownership is explicit and consistent across manifest, host, and router snippets.
  3. Runtime ingress remains non-caller in all sections and guardrails.

### Pass 3: Detail Preservation
- Result: **Pass**.
- Checks:
  1. Core concrete snippets for package/API/workflow/runtime composition were retained.
  2. Preflight + enqueue + durable execution + status-update sequence remains concrete and intact.
  3. Example still contains actionable file-tree and wiring-step detail.

### Pass 4: Information-Design Clarity
- Result: **Pass**.
- Checks:
  1. Section flow now follows a stable narrative from intent to implementation to validation.
  2. `Conformance Anchors` section provides auditable mapping from example segments to canonical policy docs.
  3. Guardrails and checklist sections are route-policy explicit and scan-friendly.

### Residual Risk Note
- Risk level: **low**.
- Remaining risk is documentation-snippet drift over time if canonical route or manifest contracts change; `Conformance Anchors` reduces this by making authoritative update points explicit.

## COMPACTION SNAPSHOT
- Locked invariants:
  1. Route/caller split is fixed: first-party default `/rpc`, external published `/api/orpc/*` and `/api/workflows/<capability>/*`, runtime-only `/api/inngest`.
  2. Workflow/API boundary contracts are plugin-owned; packages remain transport-neutral and do not own workflow trigger/status boundary I/O.
  3. Host composition remains manifest-driven with explicit mount/control-plane order and explicit context seam factories.
  4. One runtime-owned Inngest bundle per process; no alternate first-party trigger authoring path.
- Key decisions in this loop:
  1. Remove unnecessary `operations/*` indirection where handlers only forwarded `context + input` unchanged.
  2. Keep direct oRPC procedure handler exports in plugin routers for clarity.
  3. Simplify context typing to avoid redundant extension/rewiring while preserving explicit host seam ownership.
  4. Remove `any`-heavy manifest scaffolding patterns in favor of cleaner explicit composition snippets.
- Current example structure (after loop):
  1. Package: domain/service/procedures/router/client.
  2. API plugin: `context.ts` + `contract.ts` + direct handler exports in `router.ts`.
  3. Workflow plugin: `context.ts` + `contract.ts` + direct trigger procedure handler in `router.ts` + durable function.
  4. Host: explicit `createBoundaryContext`/`createWorkflowBoundaryContext` seams + explicit mount order.
- Explicit answer: Does canonical spec forbid direct oRPC procedure exports in this case?
  - **No.** The packet sets `operations/*` as a canonical/default shape, but policy language does not forbid direct procedure handlers.
  - Supporting policy: `axes/08-workflow-api-boundaries.md` allows procedure-local modules adjacent to handlers; no lock in `DECISIONS.md` requires operation-function indirection.
  - Applied outcome: revised E2E-02 to cleaner direct-procedure pattern while preserving plugin-owned contract boundaries and explicit composition semantics.

## QUALITY LOOP 3 FINDINGS + FIXES

### Re-grounding log (this loop)
- Re-read canonical authorities: `ARCHITECTURE.md`, `DECISIONS.md`, all files under `axes/`, and all four `examples/*`.
- Re-introspected and applied: `information-design`, `orpc`, `inngest`, `docs-architecture`, `decision-logging`, `system-design`, `api-design`, `typebox`, `typescript`.

### Broad error-class audit (10 classes)
1. Error class: Policy drift vs D-005..D-015.
- Location: `examples/e2e-02-api-workflows-composed.md` section 4.4 (`rawr.hq.ts`) and section 4.5 (`apps/server/src/rawr.ts`).
- Before: manifest objects were precomposed at module top (`export const rawrHqManifest = ...`), while host baseline traces were initialized later in route registration.
- After: switched to `createRawrHqManifest(invoicingDeps)` factory and invoked it after `initializeExtendedTracesBaseline()` in host wiring snippet.
- Why: removes D-008 ordering ambiguity and keeps composition/mount sequencing explicitly host-controlled.

2. Error class: Route-surface misuse (`/rpc` vs `/api/orpc/*` vs `/api/workflows/*` vs `/api/inngest`).
- Location: whole example.
- Before: no direct misuse found in this pass.
- After: no route-path change needed.
- Why: route-family semantics already conformed to D-005/D-007 and axes 03/07/08.

3. Error class: Ownership violations (plugin vs package boundaries).
- Location: whole example.
- Before: no ownership inversion found.
- After: no ownership change needed.
- Why: workflow/API contracts remained plugin-owned and package logic remained transport-neutral.

4. Error class: Client/link misuse.
- Location: section 4.6 (`plugins/web/invoicing-console/src/client.ts`).
- Before: `capabilityClients` and `externalContracts` were referenced without declaration, creating unclear client source wiring.
- After: added explicit `declare const capabilityClients` and `declare const externalContracts` stubs typed from `createORPCClient` argument shape.
- Why: keeps first-party `/rpc` vs published OpenAPI link usage explicit without introducing phantom imports.

5. Error class: Context/middleware misuse.
- Location: section 4.5 (`apps/server/src/rawr.ts`).
- Before: `deps: { invoicingDeps: any }` weakened seam contract.
- After: replaced with `deps: { invoicingDeps: InvoicingServiceDeps }` and imported `InvoicingServiceDeps`.
- Why: preserves explicit context seam ownership and avoids untyped rewiring drift.

6. Error class: Type/schema mistakes (TypeBox/schema ownership/payload boundaries).
- Location: sections 4.1-4.3 and 4.5.
- Before: main schema ownership posture already conformed; only host dep typing was weak (`any`).
- After: host dep typing made explicit via `InvoicingServiceDeps`.
- Why: keeps package boundary typing aligned with D-011/D-012 and avoids payload/port ambiguity.

7. Error class: Wiring black boxes.
- Location: sections 4.4-4.5.
- Before: top-level manifest construction could be read as implicit pre-bootstrap composition.
- After: explicit manifest factory call in host path after baseline init; mount order remains explicit.
- Why: makes composition lifecycle auditable and host-owned per axes 07/11.

8. Error class: Snippet quality issues (dead names/mismatch/impossible path).
- Location: sections 4.5, 4.6, and heading sequence.
- Before: unresolved client-contract symbols in 4.6, `any` in host deps, and unnumbered `Conformance Anchors` heading between sections 9 and 11.
- After: declared contract sources in 4.6, removed `any`, and renamed heading to `## 10) Conformance Anchors`.
- Why: improves runnable/credible snippet quality and removes obvious review friction.

9. Error class: Hidden ambiguity.
- Location: sections 4.4-4.6 and section heading flow.
- Before: could be interpreted as manifest composition occurring before baseline middleware init; client-contract provenance was implied but not stated.
- After: manifest factory explicitly called post-baseline init; contract sources explicitly declared; section numbering made sequential.
- Why: reduces implementer branching risk.

10. Error class: Information-design clarity.
- Location: section ordering and anchor heading.
- Before: heading sequence had a numbering gap (`9` then unnumbered anchors then `11`).
- After: anchors explicitly numbered as `10)`; structure now reads as continuous flow.
- Why: improves scan path and conformance trace readability.

## QUALITY LOOP 3 FINAL 4-PASS SELF-CHECK

### Pass 1: Policy conformance
- Result: **Pass**.
- Check: D-005/D-006/D-007 route and ownership invariants remain intact; D-008 ordering ambiguity removed by host-time manifest factory; no new drift against D-009..D-015 introduced.

### Pass 2: Contradiction scan
- Result: **Pass**.
- Check: route-family matrix, host mount snippets, client link examples, and runtime sequence statements are mutually consistent.

### Pass 3: Detail preservation
- Result: **Pass**.
- Check: retained package/service/procedure code specificity, workflow trigger preflight/enqueue logic, durable function example, and explicit host wiring snippets.

### Pass 4: Information-design clarity
- Result: **Pass**.
- Check: section numbering and anchor flow are coherent; client contract provenance and manifest composition timing are now explicit.

### Residual risk (post-loop)
- Risk level: **low**.
- Remaining risk: snippet-level placeholders (for generated contract trees and host helpers) still require implementer-local binding choices, but branching risk is reduced by explicit declarations and conformance anchors.
