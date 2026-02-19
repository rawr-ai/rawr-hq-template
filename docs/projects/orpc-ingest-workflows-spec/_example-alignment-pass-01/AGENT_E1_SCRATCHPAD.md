# AGENT E1 Scratchpad

## Scope Lock
- Owned target: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-01-basic-package-api.md`
- Mission: canonical conformance for minimal package+API baseline with no workflow/runtime leakage.

## Skills Introspection Notes

### Skill application summary (explicit)
- `information-design`: reshape example so scope, flow, and constraints are instantly scannable; preserve content fidelity while improving hierarchy.
- `orpc`: keep contract-first boundary ownership, typed contracts, `implement(contract)` router bindings, and route-prefix correctness.
- `architecture`: maintain clear split between target-state policy and reference walkthrough semantics; avoid introducing migration language.
- `typescript`: preserve type-level/runtime parity in snippets (TypeBox + static types + explicit context contracts), avoid type drift.
- `inngest`: enforce boundary that runtime ingress and durable lifecycle are distinct; in this baseline example they are out-of-scope and non-implemented.
- `docs-architecture`: keep example as non-normative reference while explicitly anchoring canonical policy sources.
- `decision-logging`: record interpretation choices that could drift policy.
- `system-design` (literal): keep boundary choices explicit and avoid second-order coupling where baseline doc accidentally implies runtime behavior.
- `api-design` (literal): align surface to consumer model of baseline API only; remove implied multi-surface API behavior from the baseline example.
- `typebox` (literal): keep JSON Schema-first pattern via TypeBox and standard-schema bridge, with object-root wrapper discipline.

### API/system/TS emphasis used for rewrite
1. API surface discipline: only package+API boundary behavior belongs in E2E-01; workflow/runtime belongs in later examples.
2. System boundary discipline: mention split semantics as policy context, but do not encode runtime ingress flow or workflow trigger authoring in baseline snippets.
3. TypeScript discipline: keep co-located schema+type patterns and explicit context contracts; no implicit/hand-wavy types.

## Decision Log (pre-edit)

### Decision 1: How to handle `/api/workflows` and `/api/inngest` in baseline
- Context: Existing E2E-01 includes runtime wiring and `/api/inngest` snippet despite API-only baseline framing.
- Options:
  - A) Keep full runtime snippets and add disclaimer.
  - B) Remove runtime snippets entirely and keep a strict out-of-scope note.
- Choice: B.
- Rationale: Canonical split policy allows mention, but baseline example must avoid workflow/runtime leakage.
- Risk: Reader could miss route-family awareness; mitigated by explicit non-goal paragraph and conformance anchors to axis docs.

### Decision 2: Keep or remove shared TypeBox adapter snippet
- Context: Adapter is shared infrastructure and appears in baseline docs.
- Options:
  - A) Remove to reduce scope.
  - B) Keep as core package+API contract enabler.
- Choice: B.
- Rationale: Adapter is directly relevant to TypeBox-first API contract baseline and does not introduce runtime ingress semantics.
- Risk: Adds setup detail; mitigated by concise framing and scoped file tree.

### Decision 3: Host composition snippet depth
- Context: Existing host snippet includes runtime adapter + Inngest bundle.
- Options:
  - A) Keep full host runtime wiring.
  - B) Restrict host snippet to boundary mounts (`/rpc`, `/api/orpc/*`) only.
- Choice: B.
- Rationale: Keeps baseline focused while still concrete on boundary registration.
- Risk: Less continuity with later examples; mitigated by bridge section to E2E-02.

## Conformance Map for E2E-01 Rewrite

| Planned E2E-01 segment | Canonical anchor(s) | Conformance intent |
| --- | --- | --- |
| Goal/scope + non-goals | `ARCHITECTURE.md` §2, §4; `axes/03-split-vs-collapse.md`; `axes/08-workflow-api-boundaries.md` | Baseline is package+API only; explicitly non-workflow/runtime implementation. |
| Route policy statement | `ARCHITECTURE.md` §2.1; `axes/01-external-client-generation.md`; `axes/07-host-composition.md` | Keep caller/publication semantics accurate without implementing workflow/runtime paths. |
| Internal package structure and client path | `axes/02-internal-clients.md`; `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` | Preserve in-process package internal client default and transport-neutral package layering. |
| API plugin contract ownership and operations mapping | `DECISIONS.md` D-006, D-011, D-012; `axes/01-external-client-generation.md`; `axes/08-workflow-api-boundaries.md` | Keep plugin-owned boundary contracts, procedure/contract I/O ownership, and inline I/O default. |
| Host boundary mount snippet | `axes/07-host-composition.md`; `axes/12-testing-harness-and-verification-strategy.md` | Show parse-safe `/rpc` + `/api/orpc/*` registration only; avoid runtime ingress code. |
| Guardrails and failure modes | `axes/05-errors-observability.md`; `axes/06-middleware.md`; `axes/12-testing-harness-and-verification-strategy.md` | Keep practical risks for baseline while preventing route-semantic confusion. |
| Conformance Anchors section | `README.md`; `CANONICAL_EXPANSION_NAV.md`; `ARCHITECTURE.md`; `DECISIONS.md`; `axes/*` | Make traceability explicit for reviewers and downstream updates. |

## Detail Preservation Ledger

### Retained snippets/details (as-is or near-as-is)
| Item retained | Why retained |
| --- | --- |
| TypeBox standard-schema adapter (`typeBoxStandardSchema`) | Core to TypeBox-first contract flow in minimal baseline. |
| Package domain/service/procedure/client snippets | Baseline package API flow depends on these details. |
| API plugin contract + operations mapping snippets | Demonstrates boundary ownership and input/output adaptation clearly. |
| `parse: "none"` mount behavior in host boundary routes | Canonical host forwarding correctness for oRPC handlers. |
| Endpoint divergence examples (boundary vs internal shapes) | Useful demonstration of boundary adaptation without runtime leakage. |

### Updated snippets/details
| Existing item | Update | Replacement direction |
| --- | --- | --- |
| Quick coordinates route table includes `/api/workflows` and `/api/inngest` in baseline path | Restrict operational path to `/rpc` and `/api/orpc/*`; move workflow/runtime to explicit non-goal note | Clarifies minimal baseline while retaining route-policy awareness |
| Composition path includes runtime adapter chain | Replace with package+API boundary chain only | Prevents implied runtime coupling |
| Host section includes runtime adapter + Inngest bundle creation | Replace with boundary-only route registration excerpt | Keeps host code specificity without runtime leakage |
| Wiring steps mention runtime ingress mounting | Reframe as boundary-only steps plus explicit pointer to E2E-02 for workflow/runtime | Aligns with example progression |
| Failure-mode table mixes API and runtime concerns | Keep only baseline-relevant items; move runtime concerns to “out-of-scope/by policy” line | Prevents mixed-plane confusion |

### Removed snippets/details and replacements
| Removed from E2E-01 | Why removed | Replacement |
| --- | --- | --- |
| `rawr.hq.ts` snippet with `inngest` runtime bundle | Workflow/runtime leakage in baseline | `rawr.hq.ts` boundary-only contract/router composition snippet |
| `apps/server/src/rawr.ts` example using `createCoordinationInngestFunction` and `/api/inngest` mount | Introduces runtime semantics in baseline walkthrough | `registerOrpcRoutes` focused boundary host snippet |
| Runtime sequence steps involving Inngest ingress | Not baseline package+API flow | Sequence remains API boundary -> operation -> internal client -> package procedures |
| “Split semantics preserved” section with operational workflow/runtime route wording | Over-indexes non-baseline implementation | concise out-of-scope note + bridge to E2E-02 |

## Rewrite Shape (planned)
1. Keep title and baseline positioning.
2. Tighten section 1-2 to declare API-only executable scope.
3. Keep file tree and code blocks for package/API path, trimming runtime files.
4. Keep wiring and runtime sequence strictly on API boundary path.
5. Add `Conformance Anchors` section mapping major segments to canonical docs.
6. Preserve bridge to E2E-02 for workflow/runtime composition.

## 4-Pass Self-Check Results (pre-edit design pass)

### Pass 1: Policy conformance
- Status: PASS (planned)
- Evidence:
  - Baseline content aligns with plugin-owned API boundary and package internal client defaults.
  - Workflow/runtime implementation snippets are removed from baseline.
  - Caller/publication semantics remain consistent with canonical matrix.

### Pass 2: Contradiction scan
- Status: PASS (planned)
- Checks:
  - No statement allows caller use of `/api/inngest`.
  - No statement implies external `/rpc` publication.
  - No shift of workflow boundary contract ownership into packages.

### Pass 3: Detail preservation
- Status: PASS (planned)
- Checks:
  - Concrete TypeBox/oRPC/package/API code remains, including adaptation examples.
  - Lossy simplification avoided; removed content is only out-of-scope runtime leakage.

### Pass 4: Information-design clarity
- Status: PASS (planned)
- Checks:
  - Scope, non-goals, and sequence are explicit near top.
  - Section flow moves from purpose -> topology -> code -> steps -> guardrails -> anchors.
  - Conformance anchors provide direct traceability for reviewers.

## Residual Risk Watchlist (pre-edit)
1. Over-trimming host context may reduce readability for route policy newcomers.
2. Mentioning out-of-scope workflow/runtime routes must avoid accidental pseudo-implementation language.
3. Bridge text must clearly route workflow/runtime details to E2E-02, not backfill E2E-01.

## 4-Pass Self-Check Results (post-edit execution pass)

### Pass 1: Policy conformance
- Status: PASS
- Result: E2E-01 now stays API-only in executable snippets; workflow/runtime routes are referenced as out-of-scope policy context only.

### Pass 2: Contradiction scan
- Status: PASS
- Result: No caller path is shown for `/api/inngest`; no external `/rpc` publication language; no workflow boundary contract ownership moved into packages.

### Pass 3: Detail preservation
- Status: PASS
- Result: TypeBox adapter, package domain/service/procedures/client, API boundary contract/operations/router, and parse-safe host mounts remain concrete and code-specific.

### Pass 4: Information-design clarity
- Status: PASS
- Result: Top-level scope and non-goals are explicit, sequence stays package+API focused, and `Conformance Anchors` gives direct canonical traceability.

## COMPACTION SNAPSHOT

### Locked invariants (current)
- Keep E2E-01 as package+API baseline only; workflow trigger/runtime ingress implementation remains out-of-scope.
- Preserve plugin-owned boundary contract ownership and package transport-neutrality.
- Preserve TypeBox-first schema authoring with inline `.input/.output` default.
- Keep explicit route semantics: `/rpc` first-party/internal, `/api/orpc/*` boundary publication path, `/api/inngest` not caller-facing.

### Key decisions (current)
- Removed runtime wiring snippets from E2E-01 and deferred to E2E-02+.
- Kept concrete package and API code specificity (adapter, domain/service/procedures/client, contract/router).
- Added `Conformance Anchors` for policy traceability.

### Current E2E-01 structure (compact)
1. Scope/in-scope/out-of-scope framing.
2. API-only topology.
3. Baseline file tree.
4. Concrete code blocks:
   - TypeBox adapter.
   - Package layers and internal client.
   - API plugin contract/context/operations/router.
   - Boundary-only manifest + host mount snippet.
5. Wiring steps and request sequences.
6. Guardrails + checklist + conformance anchors + bridge.

## Quality Loop 2 — Re-Audit and Direct-Procedure Decision

### Stupid-Mistakes Audit Focus
1. Unnecessary operation-function indirection:
- Finding: `startInvoiceOperation` and `getStatusOperation` in E2E-01 were thin wrappers adding little value over direct handler exports.
- Action: replaced wrapper indirection with direct router-bound procedure exports.

2. Redundant context import/passing rewiring:
- Finding: no additional rewiring was required; context contract remained singular (`InvoicingApiContext`) and unchanged.
- Action: preserved single context contract path; no extra pass-through scaffolding added.

3. AI-boilerplate patterns:
- Finding: separate operations files for two trivial boundary adaptations looked boilerplate-heavy for a minimal baseline.
- Action: collapsed to direct procedure exports in `router.ts` while keeping adaptation logic explicit.

### Explicit Question Response
- Question: Does canonical spec forbid direct ORPC procedure exports in this case?
- Answer: **No, not explicitly forbidden.**
- Basis:
  1. Canonical docs repeatedly present `operations/*` as default/canonical layout and role naming.
  2. No explicit prohibition language says direct router-bound procedure exports are invalid for minimal cases.
  3. Hard invariants remain ownership, caller-route boundaries, and context/schema policy (all preserved after refactor).

### If-not-forbidden action
- Applied cleaner direct-procedure pattern in E2E-01 plugin API section:
  - removed `operations/{start.ts,get-status.ts}` from baseline file tree/snippets,
  - moved adaptation/projection logic into direct exported procedures in `router.ts`,
  - retained plugin-owned contract + `implement(contract)` + explicit transformations.

## Final Loop 2 Self-Check

### Policy conformance
- PASS: plugin contract ownership unchanged; package transport-neutral path unchanged; route policy unchanged; workflow/runtime still out-of-scope for executable snippets.

### Contradiction scan
- PASS: no `/api/inngest` caller usage, no external `/rpc` publication, no package ownership drift for boundary contracts.

### Detail preservation
- PASS: concrete code specificity preserved (TypeBox adapter, package stack, API contract, host mounts), with only unnecessary wrapper indirection removed.

### Information-design clarity
- PASS: baseline flow is cleaner; procedure adaptation logic is now visible in one place with less boilerplate navigation.

## Exactly What Changed and Why (Loop 2)
1. Changed `In Scope` wording from `operations mapping` to direct router-bound procedures.
- Why: align document intent with simplified implementation pattern.

2. Updated topology and file trees to remove `operations/*` from E2E-01 baseline structure.
- Why: remove non-essential scaffolding for this minimal case.

3. Refactored API plugin code in E2E-01:
- removed separate `operations/start.ts` and `operations/get-status.ts` snippets,
- introduced `startInvoiceProcessingProcedure` and `getInvoiceProcessingStatusProcedure` direct exports in `router.ts`.
- Why: eliminate wrapper indirection while preserving explicit boundary adaptation/projection.

4. Updated wiring steps, sequence text, rationale, guardrails, checklist, and conformance anchor wording to match direct-procedure pattern.
- Why: prevent documentation/code-shape drift and keep the example internally consistent.

## QUALITY LOOP 3 FINDINGS + FIXES

### Mandatory grounding completion (Loop 3)
- COMPACTION SNAPSHOT already existed in this scratchpad (no duplicate snapshot appended).
- Re-read authoritative canonical docs for this loop: `ARCHITECTURE.md`, `DECISIONS.md`, all `axes/*.md`, and all four examples (`e2e-01` through `e2e-04`).
- Re-introspected required skills and applied their constraints:
  - `information-design`, `orpc`, `inngest`, `docs-architecture`, `decision-logging`, `system-design`, `api-design`, `typebox`, `typescript`.
- Literal skill files requested by contract are present and were used:
  - `/Users/mateicanavra/.codex-rawr/skills/system-design/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/api-design/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`
- Fallback note: no literal-skill fallback was required.

### Explicit direct-procedure policy check
- Question: Does canonical spec forbid direct ORPC procedure exports for this baseline plugin API case?
- Answer: **No.**
- Evidence:
  1. `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` explicitly allows boundary procedures either as direct router handlers or `operations/*`, while keeping `operations/*` as canonical default for larger mapping logic.
  2. Locked decisions constrain ownership/routes/context/schema semantics, not a blanket prohibition on direct exports for small/local mapping.
- Loop-3 action: retained the cleaner direct-procedure pattern and focused fixes on broader error classes.

### Findings + Fixes Log (by error class)

1. Error class 2 — Route-surface misuse
- Location: E2E topology + request sequences (`Section 2`, `Section 6`) and route coordinates.
- Before: caller route examples used `/api/orpc/invoicing/api/*` and operation-name-like paths.
- After: route examples align to OpenAPI prefix + contract paths:
  - `POST /api/orpc/invoices/processing/start`
  - `GET /api/orpc/invoices/processing/{runId}`
- Why: boundary contract owns concrete OpenAPI paths; host prefixing should not imply operation-name URLs.

2. Error class 7 — Wiring black boxes
- Location: composition chain and host-wiring section (`Quick Coordinates`, `Section 3`, `Section 4.4`, `Section 5`).
- Before: composition claimed behavior but did not show explicit `rawr.ts` invocation path from manifest to route registration.
- After: added `apps/server/src/rawr.ts` snippet showing:
  - context construction (`invoicing` internal client),
  - explicit call to `registerOrpcRoutes(app, rawrHqManifest.orpc.router, context)`.
- Why: canonical host composition policy requires explicit mount ownership and deterministic wiring seams.

3. Error class 5 — Context/middleware misuse (unnecessary rewiring)
- Location: `apps/server/src/orpc.ts` snippet (`Section 4.4`).
- Before: `RegisterOrpcRoutesOptions` carried extra fields (`repoRoot`, `baseUrl`) and `invoicing: unknown`.
- After: reduced to boundary-required context:
  - `RegisterOrpcRoutesContext = { invoicing: ReturnType<typeof createInvoicingInternalClient> }`.
- Why: minimal baseline should avoid redundant context surface and ambiguous pass-through fields not used by boundary handlers.

4. Error class 8 — Snippet quality issues
- Location: `Section 2` diagram + `Section 4.4` host snippet.
- Before: ambiguous mount label (`/api/orpc*`) and low-signal `router: unknown`.
- After:
  - mount labels normalized to `/api/orpc/*` and `/rpc/*`,
  - route registrar uses generic router type parameter `<TRouter>` instead of raw `unknown`.
- Why: remove boilerplate smell and reduce impossible/hand-wavy typing patterns.

5. Error class 9 — Hidden ambiguity
- Location: `Section 6`, Sequence B step description.
- Before: `GET` sequence said caller “sends `{ runId }`” (ambiguous body-vs-path).
- After: explicitly states `runId` is sent as route path parameter.
- Why: prevents implementers from branching into incorrect request-shape assumptions.

6. Error class 10 — Information-design / anchor quality
- Location: `Section 10` Conformance Anchors.
- Before: included non-canonical anchor (`typebox` skill guidance) in canonical mapping table.
- After: anchors now reference canonical packet docs only (`ARCHITECTURE.md`, `DECISIONS.md`, `axes/*`, `README.md`).
- Why: conformance anchors must map major segments to canonical policy docs, not skill metadata.

### Broad error-class audit results (no change needed)
- Error class 1 (Policy drift D-005..D-015): no contradiction found after patch.
- Error class 3 (Ownership violations): plugin-owned boundary contract and package-owned domain/internal-client split remained intact.
- Error class 4 (Client/link misuse): no incorrect publication of `/rpc` as external client surface in this baseline.
- Error class 6 (Type/schema mistakes): TypeBox-first and boundary/package schema ownership posture remained intact.

## Final 4-Pass Self-Check (Loop 3)

### Pass 1: Policy conformance
- PASS.
- D-005..D-015 semantics preserved; route-family correctness improved; no workflow/runtime leakage introduced.

### Pass 2: Contradiction scan
- PASS.
- No `/api/inngest` caller-surface implication, no external `/rpc` publication implication, no boundary ownership drift.

### Pass 3: Detail preservation
- PASS.
- Preserved code specificity (adapter, package stack, boundary contract/router, host mounting) while correcting route and wiring clarity errors.

### Pass 4: Information-design clarity
- PASS.
- Read path improved: route examples now contract-accurate, host wiring is explicit, anchors are policy-authority aligned.
