# SESSION_019c587a — Agent H DX Simplification Review

## 1) Executive Judgment

Current canonical direction is strong on boundary clarity, but still over-wired in composition ergonomics.

Where it is over-wired:
- Central composition currently requires repeated manual shape mapping across policy text and code examples (`api`, `workflows`, contract map, router map, functions merge), which scales poorly as capability count grows: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:119`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:203`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:763`.
- Capability-local context creation is shown inside `rawr.hq.ts`, so the composition spine risks becoming a dependency-construction hub: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:740`.
- API/workflow examples repeat client creation per handler/step, adding avoidable ceremony: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680`.

Where current direction is acceptable and should stay:
- Clear split between caller-triggered workflow API (`/api/workflows/*`) and execution ingress (`/api/inngest`) is correct and operationally important: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:43`.
- TypeBox adapter metadata + host `ConditionalSchemaConverter` is the right explicit OpenAPI bridge and matches real host behavior: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:231`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:283`.

## 2) Duplication / Manual-Wiring Map

| Pattern | Where Found | Why Costly at Scale |
| --- | --- | --- |
| Capability shape restated repeatedly | Canonical doc policy + scaled rule + example composition: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:119`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:203`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748` | Every new capability needs multi-point edits; easy to desync contract/router/functions.
| Contract and router namespace mapping duplicated | `rawr.hq.ts` example manually maps both trees: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:755`; current runtime similarly mirrors hierarchy in router implementation: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:107` | Same hierarchy encoded twice; drift causes runtime mismatch bugs.
| Capability dependency construction in central spine | `invoicePackageContext` built in central composition: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729` | Central file turns into a dependency factory instead of a manifest, increasing merge conflicts.
| TypeBox adapter logic duplicated in packages | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:268` and `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:41` | Validation semantics can drift silently between packages.
| Per-handler internal client creation | API + workflow examples recreate internal client in each handler/step: `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680` | Repeated boilerplate obscures business logic and invites inconsistent usage.

## 3) Simplification Proposals (Prioritized)

1. `composeCapabilities(...)` as the only aggregation mechanism.
Proposed abstraction: introduce a typed composition adapter that accepts capability descriptors and derives `orpc.contract`, `orpc.router`, and `inngest.functions` in one place.
What it replaces: manual multi-block assembly in canonical `rawr.hq.ts` examples (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:748`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:755`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:763`).
DX gain: adding a capability becomes one registration step instead of editing three aggregation blocks.
Risks/trade-offs: less explicit handwritten merge code; debugging needs clear generated shape visibility.
Keep-as-is alternative if rejected: keep manual merge blocks but enforce a required checklist/lint rule that validates contract/router/function namespace parity.

2. Standardize on `defineApiSurface(...)` and `defineWorkflowSurface(...)` builders.
Proposed abstraction: create two typed builders so surface keys are generated from one declaration rather than handwritten object literals.
What it replaces: repeated ad hoc `{ contract, router }` and `{ triggerContract, triggerRouter, functions }` objects (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:539`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:707`).
DX gain: lower key-shape drift risk and clearer author intent per capability surface.
Risks/trade-offs: introduces framework-level helper API that must remain stable.
Keep-as-is alternative if rejected: keep current object shape but enforce static conformance helper (`satisfies`) in every surface export.

3. Move capability-local dependency construction behind capability-owned context factories.
Proposed abstraction: each capability exports `createCapabilityContext(env)`; `rawr.hq.ts` only passes environment inputs and collects outputs.
What it replaces: central inline context construction (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:729`).
DX gain: composition spine stays thin, and capability onboarding becomes self-contained.
Risks/trade-offs: one more exported symbol per capability package.
Keep-as-is alternative if rejected: keep inline context objects but require each capability context in dedicated local modules imported by `rawr.hq.ts`.

4. Enforce one shared TypeBox adapter package across all contracts.
Proposed abstraction: hard canonicalization of `typeBoxStandardSchema` in `@rawr/orpc-standards`, with package contracts importing it only.
What it replaces: duplicated local adapter implementations in multiple packages (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination/src/orpc/schemas.ts:268`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/state/src/orpc/contract.ts:41`).
DX gain: consistent validation issue formatting and one place to evolve Standard Schema/OpenAPI bridging.
Risks/trade-offs: shared package becomes a critical dependency for all contracts.
Keep-as-is alternative if rejected: maintain local copies but require snapshot tests asserting adapter parity across packages.

5. Add router-level internal-client binding utility.
Proposed abstraction: bind internal client once per router context and reuse in handlers/functions.
What it replaces: repeated `createInvoiceInternalClient(context)` calls in every handler/step (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:519`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:527`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:680`).
DX gain: smaller handlers, less copy/paste, better focus on policy and domain logic.
Risks/trade-offs: if binding scope is wrong, stale context bugs are possible.
Keep-as-is alternative if rejected: keep direct calls but require helper function wrappers per router to avoid duplicated mapping code.

## 4) Proposed Canonical Authoring Model (Minimal Workflow)

1. Domain package author defines internal contract/router/services and exports `createCapabilityContext(env)`.
2. API plugin author defines boundary procedures and exports `defineApiSurface({ contract, router })`.
3. Workflow plugin author defines trigger contract/router/functions and exports `defineWorkflowSurface({ triggerContract, triggerRouter, functions })`.
4. Capability module exports one descriptor via `defineCapability({ capabilityId, api, workflows, createContext })`.
5. `rawr.hq.ts` registers descriptors in one `capabilities` list and calls `composeCapabilities(capabilities, env)`.
6. Host mounting remains unchanged: one oRPC route registration and one Inngest ingress registration.

Net effect: one manual step per capability (descriptor registration), not multiple manual merge edits.

## 5) Do Now vs Later

Do now:
- Implement proposal 4 first (shared adapter hardening) because duplicate adapter logic already exists in anchors and is immediate drift risk.
- Implement proposal 1 next (single composition adapter) because it removes the highest recurring manual merge burden.
- Keep current route semantics and ingress split unchanged while introducing the adapter/composer.

Do later:
- Proposal 2 (surface builders) after composition adapter is stable.
- Proposal 3 (capability context factories) when at least 2-3 capabilities need non-trivial dependencies.
- Proposal 5 (router-level client binding) as opportunistic cleanup when touching routers/workflow functions.

## 6) Keep Unchanged (Explicit)

- Keep `/api/workflows/*` vs `/api/inngest` split unchanged; this is the cleanest boundary between caller API and Inngest runtime ingress (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:42`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:43`).
- Keep Path B as default and Path A as strict exception; it prevents extension-layer drift where boundary semantics diverge (`...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:63`, `...PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md:76`).
- Keep explicit TypeBox `__typebox` conversion path via host converter; this is already aligned to runtime OpenAPI generation (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:283`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:295`).
- Keep manual capability registration for now, but only after introducing a composition adapter that reduces per-capability edit points.
