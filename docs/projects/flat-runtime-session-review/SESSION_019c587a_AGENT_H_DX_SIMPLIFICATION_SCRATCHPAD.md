# SESSION_019c587a — Agent H DX Simplification Scratchpad

## Process Log

- Confirmed assigned worktree is clean: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`.
- Confirmed evidence repo tree has unrelated existing dirt and is treated read-only for this task.
- Created required plan doc before deep analysis.

## Required Skill Introspection Findings

### `typebox` (`/Users/mateicanavra/.codex-rawr/skills/typebox/SKILL.md`)

- TypeBox should be treated as JSON-Schema-first contract artifact source, not ad hoc runtime validator glue.
- Validation strategy should be a deliberate layer decision (Value/Compile/other validator), avoiding hidden per-procedure divergence.
- Durable default: export schema artifacts and inferred TS types together; avoid parallel definitions that drift.
- OpenAPI 3.1 alignment is a key reason to keep schema source canonical and centralized.

Review implication:
- Prefer simplifications that reduce duplicate schema declarations and centralize schema adaptation logic.

### `orpc` (`/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`)

- Contract-first means contract is first-class and implementation attaches via `implement(...)`; avoid pseudo-contract patterns.
- Repeated client/transport/retry/prefix wiring is a known drift source and should be centralized.
- Top pitfalls include contract drift and prefix mismatches; route/contract relation should be explicit and low-boilerplate.

Review implication:
- Challenge any proposal that spreads contract/router/transport declarations without a unifying factory/adapter.

### `elysia` (`/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`)

- Elysia favors fetch-based composability with plugin boundaries; integration glue should stay at host edge.
- “Order matters” and parse/forwarding constraints mean central host composition should avoid hand-wired repetition.
- Route validation + response typing should come from shared schema sources, not duplicated edge declarations.

Review implication:
- Central app composition should use deterministic registration conventions rather than manual per-capability plumbing.

### `inngest` (`/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`)

- Durable side effects should stay inside explicit step boundaries; orchestrator patterns need stable, central wiring.
- Service boundaries should keep runtime endpoint/adapters thin while domain workflows stay package-scoped.

Review implication:
- Proposals should keep Inngest-specific mechanics out of generic capability authoring paths unless universally required.

### `typescript` (`/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`)

- Design/refactor priority: stabilize boundaries, reduce public surface complexity, and derive types from values to prevent drift.
- Strong recommendation to quarantine edge complexity and keep domain internals strongly typed with minimal ceremony.

Review implication:
- Prefer abstractions that collapse repeated boundary code while preserving explicit domain contracts.

### `architecture` (`/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`)

- Keep current state, target state, and transition concerns distinct to avoid “hybrid soup”.
- Resolve spine decisions first (composition model) before boundary/domain details.
- Every non-obvious recommendation needs traceable evidence.

Review implication:
- Review must prioritize composition-spine simplification first, then contract/schema declaration ergonomics.

## Evidence Collection Grid (In Progress)

- Canonical proposal hotspots:
  - Completed line mapping for composition shape duplication, context centralization, split surface declarations, and repeated client wiring.
- Evidence anchors:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts`

## Preliminary Constraints For Recommendations

- Prefer generalized factories/adapters over capability-by-capability custom helpers.
- Keep host/runtime responsibilities distinct from package/domain responsibilities.
- Avoid introducing second composition surfaces that duplicate manifest or contract truth.
- Every simplification must preserve correctness and cross-surface clarity.

## Hotspot Evidence Map (Canonical Doc + Anchors)

### Hotspot A: Composition duplicates capability shape in three places

Canonical proposal evidence:
- Declares per-capability shape manually (`api`, `workflows`) in policy section: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:119`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:120`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:121`.
- Re-describes same shape in scaled merge rule: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:202`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:203`.
- Rewrites shape again in `rawr.hq.ts` example contract/router merge blocks: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:755`.

Anchor evidence:
- Current core contract merge is already explicit and shallow, but manual key listing exists: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`.
- Host router implementation mirrors contract hierarchy manually: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:107`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:108`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:273`.

DX/risk note:
- At n>1 capabilities, author must remember to touch manifest object, contract merge namespace, router merge namespace, and functions list; this is drift-prone boilerplate.

### Hotspot B: Per-capability context assembly in central composition

Canonical proposal evidence:
- `rawr.hq.ts` example creates capability-specific context in the central composition file: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729`.
- Same context object is piped into workflow surface creator in central composition: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:740`.

Anchor evidence:
- Runtime context for oRPC registration is centralized and already structured (`repoRoot`, `runtime`, `inngestClient`): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:314`.

DX/risk note:
- Central file grows with capability-local dependency construction instead of remaining a thin composition spine.

### Hotspot C: Split contract/router declarations for every surface

Canonical proposal evidence:
- API surface requires separate `contract` + `router` export object: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:539`.
- Workflow surface requires separate `triggerContract` + `triggerRouter` + `functions`: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:707`.

Anchor evidence:
- Existing server path consumes a single router built from `hqContract` + handlers (`implement(...).router(...)`): `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:105`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:107`.

DX/risk note:
- Repeating split declarations per capability increases key drift likelihood (contract key exists but router key missing/misaligned).

### Hotspot D: Schema adapter duplication in real codebase

Canonical proposal evidence:
- Proposal correctly pushes centralized adapter package rule: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:281`.

Anchor evidence:
- Adapter implementation exists in coordination schemas: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:268`.
- Parallel private adapter implementation exists in state contract: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:41`.
- Helper parsing logic duplicated in both files: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:257`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:30`.

DX/risk note:
- Behavior drift risk in validation issue-path mapping and error shape when one copy changes and the other does not.

### Hotspot E: Repeated per-handler internal-client construction

Canonical proposal evidence:
- API router example creates internal client inside each handler: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`.
- Workflow function example also recreates client inside step: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680`.

DX/risk note:
- Boilerplate repeats across procedures and obscures business logic; encourages inconsistent client instantiation conventions.

## Candidate Simplification Directions (Draft)

1. Capability descriptor factory + composer:
- `defineCapability({ id, api, workflows })` + `composeCapabilities([...])` derives contract/router/function aggregates once.
- Eliminates manual triplicate namespace mapping in `rawr.hq.ts`.

2. Surface adapter object model:
- Replace ad hoc `{ contract, router }` and `{ triggerContract, triggerRouter, functions }` with typed surface descriptors and derivation helpers.
- Keeps split artifacts explicit but prevents key-shape drift.

3. Context factory boundary:
- Move capability-local dependency construction out of central composition into capability-owned `createCapabilityContext(env)` factories.
- Preserves central manifest as declarative assembly only.

4. Shared TypeBox adapter package hard requirement:
- Use one `@rawr/orpc-standards` implementation; remove per-package inline copies.
- Matches proposal intent and resolves existing duplication in anchors.

5. Router-local client binding helper:
- Create router-level binding (`const internal = createInvoiceInternalClient(context)`) once per request scope/handler group instead of per method body.
- Improves readability and reduces repetitive plumbing.

## Items Likely Keep-As-Is (Draft)

- Keep explicit separation of `/api/workflows/*` vs `/api/inngest` because it preserves caller API vs execution ingress semantics.
- Keep TypeBox `__typebox` + host `ConditionalSchemaConverter` approach because anchors show actual OpenAPI conversion dependency.
- Keep Path B default (boundary-owned) with strict Path A gate; this avoids wrapper-layer ambiguity when external policy diverges.
