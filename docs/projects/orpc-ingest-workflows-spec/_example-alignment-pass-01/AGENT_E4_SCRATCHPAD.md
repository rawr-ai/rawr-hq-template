# Agent E4 Scratchpad

## Mission Lock
- Target: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md`
- Objective: make this the golden full-picture example with zero contradiction to canonical policy and D-005..D-015.
- Constraints: no runtime code edits; no edits outside owned example + E4 pass artifacts.

## Skills Introspection Notes (Applied)

### `information-design`
- Applied for structure redesign: purpose-first hierarchy, scannable sections, reduced repetition, explicit route/ownership signaling.
- Mandate used: skim test + scent test for section headers, not decoration-heavy structure.

### `api-design` (literal)
- API emphasis applied: caller-mode explicitness, contract ownership clarity, route-family semantics, typed error surfaces.
- Guardrails applied: avoid flat resource soup, keep explicit publication boundaries, make error semantics first-class.

### `system-design` (literal)
- System emphasis applied: preserve split control planes (boundary vs durable runtime), show second-order effects of route misuse, and maintain feedback-path observability separation.
- Boundary test applied: caller routes and runtime ingress remain explicit and non-overlapping.

### `typebox` (literal)
- Type emphasis applied: TypeBox-first schema contracts, explicit wrapper defaults (`schema({...})` for object roots, explicit `std(...)` for non-object roots), static type continuity.
- Avoided drift: no Zod-authored contract/procedure schema examples.

### `orpc`
- Applied for contract-first router/implementation patterns and transport split (`RPCLink` vs `OpenAPILink`).

### `architecture`
- Applied for target-state/no-drift posture and decision-lock alignment (D-005..D-015).

### `typescript`
- Applied for typed factory/context surfaces and avoiding implicit `any` in canonical helper snippets.

### `inngest`
- Applied for durable ingress/runtime semantics, lifecycle caveats, middleware hook idempotency caveat, and step-boundary clarity.

### `docs-architecture`
- Applied by preserving packet authority boundaries: canonical policy docs remain authority; example remains reference.

### `decision-logging`
- Ambiguity calls made explicit in this scratchpad (see contradiction scan + preservation ledger).

## Golden-Example Quality Checklist
- [x] Full-path architecture shown (`/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`) with explicit mount order.
- [x] Canonical caller/auth model consistent with `ARCHITECTURE.md` matrix.
- [x] Plugin-owned boundary contract ownership stated and reflected in snippets.
- [x] Package remains transport-neutral and internal-client-first for server-internal paths.
- [x] Context envelope split explicit (boundary request context vs runtime function context).
- [x] Middleware control planes split explicit (oRPC/Elysia boundary vs Inngest runtime).
- [x] D-008 bootstrap semantics explicit and non-contradictory.
- [x] D-009 and D-010 remain open/non-blocking, represented as guidance not hard lock.
- [x] D-013/D-014/D-015 compatibility language present where relevant.
- [x] Route-negative testing blueprint present and aligned to Axis 12.
- [x] Added `Conformance Anchors` section mapping segments to canonical docs.

## Current Contradiction Scan (Pre-Edit)
1. Manifest structure drift risk:
   - Current snippet uses `rawrHqManifest.api` at top level; canonical posture centers manifest `orpc` + `workflows` + `inngest` composition view.
   - Planned fix: align example snippets to canonical manifest composition semantics and explicit route-family mapping.
2. D-008 bootstrap placement ambiguity:
   - Current snippets initialize traces in both `rawr.hq.ts` and host context; canonical lock is host bootstrap-first ordering.
   - Planned fix: keep bootstrap/order authority in host composition snippet.
3. Route-family specificity ambiguity:
   - Current API mount snippet uses `/api/orpc/invoicing/*`; canonical family is `/api/orpc/*` with capability routing under it.
   - Planned fix: preserve capability detail while documenting route-family semantics canonically.
4. D-012 helper default drift in some snippets:
   - Object-root schemas sometimes wrapped via `std(...)` instead of default `schema({...})` without explicit exception rationale.
   - Planned fix: normalize object-root default and keep explicit exceptions clearly labeled.
5. Code-specific correctness gap:
   - One package procedure snippet references `schema(...)` without importing it.
   - Planned fix: correct import to keep snippet trustworthy.
6. D-014 seam clarity gap:
   - Current placeholder `{} as any` injection obscures concrete host-owned adapter assembly/injection responsibilities.
   - Planned fix: keep typed seam representation and state injection ownership explicitly.

## Rewrite Blueprint (Draft-First)
1. Keep section coverage broad (goal, routes, topology, file tree, code, middleware, runtime sequence, testing, decisions) but tighten authority language.
2. Keep and improve high-signal code snippets:
   - package context + middleware markers
   - API operation role/network checks
   - workflow trigger + runtime function
   - host route registration with explicit ordering
   - route-negative test assertions
3. Reduce duplicated policy text where section-level references can anchor canonical docs.
4. Add explicit `Conformance Anchors` section near the end with segment -> authority map.
5. Ensure every snippet either reflects locked behavior or is explicitly labeled guidance/example.

## Conformance Map (Segment -> Canonical Authority)
| Segment | Canonical anchor(s) |
| --- | --- |
| Goal/scope + golden intent | `README.md`, `ARCHITECTURE.md` sections 1-2 |
| Route semantics + caller/auth table | `ARCHITECTURE.md` sections 2.1, 4, 5; `DECISIONS.md` D-005/D-007 |
| Runtime ingress enforcement | `axes/08-workflow-api-boundaries.md`, `axes/12-testing-harness-and-verification-strategy.md` |
| Bootstrap + mount order | `DECISIONS.md` D-008; `axes/07-host-composition.md` |
| Context envelope split | `axes/04-context-propagation.md`; `ARCHITECTURE.md` invariants 18-19, 29 |
| Middleware split + dedupe guidance | `axes/06-middleware.md`; `DECISIONS.md` D-009/D-010 |
| Boundary errors + run observability | `axes/05-errors-observability.md` |
| Contract ownership + package neutrality | `DECISIONS.md` D-006/D-011; `axes/02-internal-clients.md`; `axes/08-workflow-api-boundaries.md` |
| TypeBox wrapper defaults + inline I/O posture | `DECISIONS.md` D-012; `ARCHITECTURE.md` invariants 20-24 |
| Metadata/runtime simplification compatibility | `DECISIONS.md` D-013; `axes/10-legacy-metadata-and-lifecycle-simplification.md` |
| Infrastructure seam ownership/import direction | `DECISIONS.md` D-014; `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` |
| Harness blueprint + negative-route matrix | `DECISIONS.md` D-015; `axes/12-testing-harness-and-verification-strategy.md`; `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` |

## Detail Preservation Ledger

### Retained snippets (intent + specificity preserved)
1. Package context modeling (`principal`, `request`, `deps`, `middlewareState`).
2. Manual dedupe marker middleware (`roleChecked`, `depsHydrated`).
3. API/workflow boundary operations with explicit role/policy checks.
4. Inngest function with `step.run` and trace-aware logging.
5. Host route registration showing all route families.
6. Axis-12 style harness blueprint and negative-route tests.

### Updated snippets (policy realignment)
1. Manifest composition shape and naming alignment to canonical route-family semantics.
2. Host bootstrap/mount ordering made explicit and single-sourced in host snippet.
3. Object-root schema wrapper defaulting corrected to `schema({...})` where applicable.
4. Missing `schema` import fixed in procedure snippet.
5. D-014 injection seam language strengthened (host-owned concrete adapter assembly, plugin/package consumption via typed ports).

### Removed/replaced elements
1. Removed ambiguous/duplicative bootstrap placement in non-host snippets.
2. Replaced route-family-specific wording that could imply non-canonical publication boundaries.
3. Replaced weak placeholder seam language where it obscured ownership boundaries.

## 4-Pass Self-Check Results

### Pass 1: Policy Conformance
- Status: **PASS**.
- Evidence:
  - Route/caller matrix and forbidden-route semantics match canonical contract sections.
  - Plugin boundary ownership and package transport-neutrality are explicit in sections 2 and 5.
  - D-008/D-013/D-014/D-015 compatibility called out directly in sections 5, 8, and 9.

### Pass 2: Contradiction Scan
- Status: **PASS**.
- Resolved contradictions:
  - Manifest shape aligned to canonical `orpc` + `workflows` + `inngest` composition semantics.
  - Bootstrap order now host-owned and explicit (`/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`).
  - Route-family wording normalized to canonical families.
  - D-012 helper defaults clarified with explicit shared-schema exception language.
  - Host injection seam now explicit via manifest factory argument, replacing placeholder injection ambiguity.

### Pass 3: Detail Preservation
- Status: **PASS**.
- Outcome:
  - Preserved deep code specificity across package, API, workflow, runtime, host, and test harness snippets.
  - Preserved production context depth (principal/request/network metadata, middleware dedupe markers, runtime lifecycle).
  - Updated only the policy-drift points identified in pre-edit scan.

### Pass 4: Information-Design Clarity
- Status: **PASS**.
- Improvements:
  - Section hierarchy now progresses from contract -> topology -> code -> runtime -> verification -> anchors.
  - Repetition reduced while keeping implementation specificity.
  - Conformance mapping centralized in dedicated `Conformance Anchors` section.

## COMPACTION SNAPSHOT (Quality Loop 2)

### Locked invariants (compact)
1. Caller-route split remains fixed:
   - first-party default `/rpc` (`RPCLink`),
   - published boundaries `/api/orpc/*` and `/api/workflows/<capability>/*` (`OpenAPILink`),
   - runtime ingress only `/api/inngest`.
2. Boundary ownership remains plugin-owned; packages remain transport-neutral and do not own workflow trigger/status boundary contracts.
3. Context and middleware remain two-envelope/two-control-plane:
   - boundary request context + boundary middleware,
   - Inngest runtime context + durable middleware/`step.run`.
4. D-008/D-013/D-014/D-015 compatibility remains explicit and unchanged.

### Key decisions in this loop
1. Removed unnecessary API/workflow `operations/*` indirection in example snippets where behavior is local and clear.
2. Switched to direct ORPC procedure exports from router modules (cleaner, less boilerplate, still policy-compliant).
3. Kept host composition explicit and preserved route-order/bootstrap guarantees.
4. Preserved richer snippets for context, middleware dedupe markers, and runtime lifecycle behavior.

### Current example structure (post-loop2)
1. Sections 1-4: scope, locked contract, topology, adaptable file map.
2. Section 5: concrete code for package, API plugin, workflow plugin, runtime function, manifest/host composition, and client transport split.
3. Sections 6-8: control-plane split, runtime sequence, and harness blueprint.
4. Sections 9-11: D-013/014/015 compatibility, checklist, conformance anchors.

### Explicit question resolution
1. **Does canonical spec forbid direct ORPC procedure exports in this case?**
   - **Answer: No.**
2. Basis:
   - Canonical policy requires plugin-owned boundary contracts, explicit route split, and correct ownership/injection semantics.
   - Canonical docs present `operations/*` as a default/canonical shape, but do not establish a hard prohibition against direct procedure exports when clarity is higher and policy invariants are preserved.
3. Action taken:
   - Revised `e2e-04` to direct-procedure pattern for API and workflow router snippets.
4. Seed comparison outcome (`e2e-01` start/get-status operation pattern):
   - The `e2e-01` operation wrappers are valid but include trivial pass-through shapes similar to this example’s previous state.
   - For `e2e-04` golden clarity, direct exported procedures were cleaner while preserving all canonical invariants.

### Final self-check (Loop 2)
1. Policy conformance after cleanup: **PASS**.
2. Stupid-mistake scan (indirection/redundant rewiring/boilerplate): **PASS with fixes applied**.
3. Contradiction scan vs D-005..D-015: **PASS**.
4. Detail preservation after compaction: **PASS**.

### Exact changes in Loop 2 and why
1. File map update:
   - Removed required-looking `operations/*` entries from API/workflow plugin skeleton in this example.
   - Why: avoid implying mandatory indirection where policy does not require it.
2. API snippet refactor:
   - Replaced `operations/*` + delegating router with direct exported procedures in `router.ts`.
   - Why: remove boilerplate and make boundary logic location obvious.
3. Workflow snippet refactor:
   - Replaced `operations/*` + delegating router with direct exported procedures in `router.ts`.
   - Why: same as above; simpler and clearer trigger/status flow.
4. Router coherence fix:
   - Removed accidental split-snippet artifact (`router-internals` import) introduced during initial refactor.
   - Why: keep example copyable and internally coherent.
5. Runtime principal role fix:
   - Added `finance:write` to runtime internal-client bootstrap role set in host snippet.
   - Why: keep runtime `markReconciliationResult` path consistent with package middleware requirements.

## QUALITY LOOP 3 FINDINGS + FIXES

### Grounding refresh completed
1. Re-read canonical authority set: `ARCHITECTURE.md`, `DECISIONS.md`, all `axes/*.md`, all `examples/*.md`.
2. Re-introspected and applied skills: `information-design`, `orpc`, `inngest`, `docs-architecture`, `decision-logging`, `system-design`, `api-design`, `typebox`, `typescript`.
3. Existing `COMPACTION SNAPSHOT` retained as the compact invariant baseline for this pass.

### Broad error-class audit (10 classes)
1. Policy drift vs D-005..D-015:
   - Result: **Minor drift found and fixed**.
   - Issue: boundary status handlers did not consistently enforce declared boundary policy checks.
2. Route-surface misuse (`/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`):
   - Result: **No violations found**.
   - Notes: route family usage remains canonical; `/api/inngest` stays runtime-only.
3. Ownership violations (plugin vs package vs host):
   - Result: **No violations found**.
   - Notes: contracts remain plugin-owned; package logic remains transport-neutral; host retains composition ownership.
4. Client/link misuse (first-party internal RPC vs external OpenAPI):
   - Result: **No violations found**.
   - Notes: first-party default remains `RPCLink` `/rpc`; published clients remain `OpenAPILink` boundaries.
5. Context/middleware misuse:
   - Result: **Minor ambiguity found and fixed**.
   - Issue: workflow status path lacked explicit role gate symmetry; context alias intent was implicit.
6. Type/schema mistakes (TypeBox alignment, payload boundary typing):
   - Result: **One concrete mismatch found and fixed**.
   - Issue: workflow runtime status was typed as broad `string` then narrowed with an unsafe cast.
7. Wiring black boxes (missing explicit composition/mount claim support):
   - Result: **No violations found**.
   - Notes: manifest composition and mount order remain explicit and testable in snippets.
8. Snippet quality issues (dead imports, mismatches, impossible paths, `any` leakage):
   - Result: **Multiple minor issues fixed**.
   - Issues: stale file-map entry and weak typing (`any`) in host route snippet.
9. Hidden ambiguity (branch-inducing language):
   - Result: **Minor ambiguity reduced**.
   - Issue: status authorization expectations were implied rather than explicit in both boundary routers.
10. Information-design failures (authority clarity/conformance path):
   - Result: **No structural regression; one clarity polish fix**.
   - Notes: conformance anchors remained strong; removed stale file-map noise that weakened implementation scent.

### Fix log (with class, location, before/after, why)
1. Error class: `1` policy drift, `5` context/middleware, `9` hidden ambiguity.
   - Location: `examples/e2e-04-context-middleware.md` (`plugins/api/invoicing/src/router.ts` snippet).
   - Before: `getReconciliationStatusProcedure` bypassed `assertNetworkPolicy` and `assertRole`.
   - After: added `assertNetworkPolicy(context)` + `assertRole(context)` in status handler.
   - Why: align code with stated boundary policy contract and remove branch ambiguity about read-path authorization.
2. Error class: `5` context/middleware, `9` hidden ambiguity.
   - Location: `examples/e2e-04-context-middleware.md` (`plugins/workflows/invoicing/src/router.ts` snippet).
   - Before: `getRunStatusProcedure` did not enforce workflow role gate.
   - After: added `assertWorkflowRole(context)` before runtime status lookup.
   - Why: keep trigger/status boundary enforcement symmetric and explicit.
3. Error class: `6` type/schema, `8` snippet quality.
   - Location: `examples/e2e-04-context-middleware.md` (`plugins/workflows/invoicing/src/context.ts` + `router.ts` snippets).
   - Before: `WorkflowRuntime.getRunStatus` returned `status: string`; router narrowed with `as "queued" | ...`.
   - After: runtime contract uses `ReconciliationState`; router returns `status: run.status` with no unsafe cast.
   - Why: preserve TypeBox contract fidelity and remove trust-me cast ambiguity.
4. Error class: `8` snippet quality, `10` information-design clarity.
   - Location: `examples/e2e-04-context-middleware.md` (canonical file map).
   - Before: listed `packages/invoicing/src/domain/status.ts` without corresponding snippet/use in this example.
   - After: removed stale file-map entry.
   - Why: eliminate file-tree/snippet mismatch and keep the read path deterministic.
5. Error class: `8` snippet quality (TypeScript quality contract).
   - Location: `examples/e2e-04-context-middleware.md` (`apps/server/src/rawr.ts` snippet).
   - Before: `registerRoutes(app: any, deps: { invoicingDeps: any; ... })`.
   - After: introduced typed `RouteApp` + `RouteDeps` and `InvoicingDeps` import for route/dependency seams.
   - Why: reduce `any` leakage and better model typed composition seams (D-014-compatible).
6. Error class: `5` context clarity.
   - Location: `examples/e2e-04-context-middleware.md` (`apps/server/src/workflows/context.ts` snippet).
   - Before: workflow context wrapper looked like redundant rewiring without stated intent.
   - After: added explicit alias-intent comment for `createWorkflowBoundaryContext`.
   - Why: clarify baseline-vs-extension design and prevent implementer over-interpretation.

### Final 4-pass self-check (Quality Loop 3)
1. Policy conformance (D-005..D-015): **PASS**.
2. Contradiction scan (cross-doc + cross-example): **PASS**.
3. Detail preservation (code specificity retained while fixing issues): **PASS**.
4. Information-design clarity (authority path + implementation scent): **PASS**.
