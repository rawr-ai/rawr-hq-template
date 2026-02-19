# AGENT_T_PLAN_VERBATIM

## 1) Role, scope, and mission
Team role: **Agent T (Dedicated Testing Harness Spec Owner)**.

Mission in this pass:
1. Define canonical, reusable testing harness strategy across plugin surfaces (web, CLI, workflow, API).
2. Lock clear in-process vs network testing patterns.
3. Add layered verification boundaries that prevent route misuse and harness drift.
4. Produce implementation-adjacent future doc/testing/runbook update directives (spec-only; no external doc edits now).
5. Add lock-ready language that maps to **D-015** without changing D-005..D-012 meaning.

## 2) Ownership boundaries (edit-only contract)
Allowed canonical edits:
1. `docs/projects/orpc-ingest-workflows-spec/axes/05-errors-observability.md`
2. `docs/projects/orpc-ingest-workflows-spec/axes/06-middleware.md`
3. `docs/projects/orpc-ingest-workflows-spec/examples/e2e-04-context-middleware.md`
4. Create `docs/projects/orpc-ingest-workflows-spec/axes/12-testing-harness-and-verification-strategy.md`
5. Create `docs/projects/orpc-ingest-workflows-spec/IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md`

Non-goals in this pass:
- No runtime code edits.
- No direct edits to process/runbook/testing docs outside packet.
- No decision-register edits outside owned files.

## 3) Mandatory setup completion log
### Skills applied
- `information-design` (mandatory)
- `architecture`
- `docs-architecture`
- `decision-logging`
- `deep-search`
- `orpc`
- `inngest`
- `typescript`

### Corpus read-complete checklist
Read end-to-end:
1. `README.md`
2. `ARCHITECTURE.md`
3. `DECISIONS.md`
4. all `axes/01..09`
5. all `examples/e2e-01..e2e-04`
6. archive extractions:
   - `.../LEGACY_TESTING_SYNC.md`
   - `.../LEGACY_METADATA_REMOVAL.md`

## 4) No-drift constraints
1. Preserve D-005..D-012 semantics.
2. Keep caller/auth boundaries unchanged:
   - `/rpc` first-party/internal
   - `/api/orpc/*` and `/api/workflows/<capability>/*` published OpenAPI boundaries
   - `/api/inngest` runtime ingress only
3. Keep plugin-owned boundary contract posture unchanged.
4. Keep split control-plane posture unchanged (boundary middleware vs durable runtime controls).
5. Make any new lock text D-015-ready and additive-only.

## 5) Planned additions by file
### A) `axes/12-testing-harness-and-verification-strategy.md` (new canonical axis)
Add a full canonical testing strategy with:
1. Harness model by caller/surface:
   - web plugin
   - CLI plugin
   - API plugin
   - workflow plugin
2. Transport/harness matrix:
   - in-process via `createRouterClient`
   - first-party network via `RPCLink` on `/rpc`
   - published boundary network via `OpenAPILink` on `/api/orpc/*` and `/api/workflows/<capability>/*`
   - runtime ingress verification against `/api/inngest`
3. Forbidden-route assertions for test suites.
4. Verification layer taxonomy:
   - unit
   - in-process integration
   - boundary/network integration
   - runtime ingress verification
   - E2E
5. Evidence and drift gates (what each layer proves and what it must not prove).
6. D-015 lock-ready statement for future downstream docs/test/runbook obligations.

### B) `axes/05-errors-observability.md`
Add testing-oriented observability verification policy:
1. Distinguish boundary error-shape verification from durable lifecycle-state verification.
2. Require route-aware assertions (no browser/SDK assumption for `/api/inngest`).
3. Link to Axis 12 as canonical testing harness authority.
4. Add concise “what changes vs unchanged” block to keep D-005..D-012 stable.

### C) `axes/06-middleware.md`
Add middleware verification contract for tests:
1. Test placement rules by harness (boundary middleware tests vs Inngest runtime middleware tests).
2. Add explicit forbidden-route testing expectations for middleware-adjacent suites.
3. Tie dedupe checks to in-process vs network layer boundaries.
4. Link to Axis 12 for canonical test layering.

### D) `examples/e2e-04-context-middleware.md`
Add practical verification blueprint section showing:
1. How E2E-04 maps to layered harness strategy.
2. Concrete suite split by web/CLI/API/workflow contexts.
3. Explicit negative tests for route misuse:
   - first-party callers forbidden from `/api/inngest`
   - external callers forbidden from `/rpc`
   - runtime ingress forbidden from caller routes
4. Clarify unchanged policy semantics.

### E) `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` (new)
Create verbatim-ready downstream update contract that lists required future updates (without editing those docs now):
1. Which docs/runbooks/testing docs must be updated.
2. Required sections and acceptance checks for each update.
3. Ordering and dependency rules.
4. D-015 mapping language as “ready to lock in DECISIONS.md”.

## 6) D-015 lock-ready language target
Proposed lock intent (packet-local, additive):
1. Canonical testing harness and verification strategy is centralized in Axis 12.
2. All downstream process/testing/runbook updates must align to the Axis 12 route/caller matrix and verification layers.
3. `/api/inngest` remains runtime-ingress verification only; no caller path (browser, CLI caller SDK, third-party SDK) is allowed to treat it as a public boundary API.
4. This is a documentation-contract lock; implementation rollout remains separately planned.

## 7) Acceptance gates for Agent T output
1. No caller test path implies browser access to `/api/inngest`.
2. Harness strategy is specific, reusable, and route-aware.
3. In-process vs network patterns are explicit and testable.
4. Verification layers are distinct and non-overlapping in purpose.
5. Changes vs unchanged are explicit to prevent semantic drift.

## 8) Execution order
1. Draft `AGENT_T_SCRATCHPAD.md` with compact findings + decisions.
2. Author new Axis 12 first (canonical testing authority).
3. Patch axes 05/06 to reference and align with Axis 12.
4. Patch E2E-04 with practical test blueprint + negative route checks.
5. Author `IMPLEMENTATION_ADJACENT_DOC_UPDATES_SPEC.md` with verbatim-ready directives.
6. Run consistency checks across edited files.

## 9) Consistency checks before handoff
1. Cross-link integrity: Axis 05/06/E2E-04 -> Axis 12.
2. Route policy integrity: `/rpc`, `/api/orpc/*`, `/api/workflows/*`, `/api/inngest` semantics unchanged.
3. D-005..D-012 semantics preserved.
4. D-015 language present as lock-ready, not prematurely registered.
5. No edits outside ownership boundaries.
