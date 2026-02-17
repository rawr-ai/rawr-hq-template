# Agent Scratch: oRPC Monorepo Architecture + Migration Shape

## Mission

Deliver the architecture research that: 1. audits the current HTTP + runtime surface, 2. evaluates contract-first vs router-first adoption, 3. proposes the package/topology conventions, 4. captures the doc/runbook/skill work needed for agent-ready onboarding, and 5. outlines phased migration slices with governance checks and concrete file-level pointers.

## Current state

- `packages/coordination/src/types.ts` is our single source of truth for `CoordinationWorkflowV1`, `DeskDefinitionV1`, and the JSON-schema-style payloads that the coordination API carries, but those types are currently only consumed by the `apps/server` Elysia routes, the control-plane storage helpers, and the Inngest adapter; no contract surface exports yet.
- `apps/server/src/coordination.ts` hand-authors Elastic-style routes, does JSON parsing, validation, queueing, and failure handling, then delegates to `queueCoordinationRunWithInngest`; `registerRawrRoutes` in `apps/server/src/rawr.ts` mounts those routes plus the `/api/inngest` handler and workspace plugin pipeline, so every surface is tied to this single Elysia app.
- `packages/coordination-inngest/src` already encapsulates the Inngest runtime logic and runtime adapter interface (read/write memory, timeline updates, etc.), so the runtime glue exists even though the HTTP surface is custom.
- There is no current RPC contract, so web, CLI, and plugin clients either call `/rawr/coordination/*` with ad-hoc envelopes or rely on manually duplicated validation helpers; that makes onboarding new agent plugins brittle and duplication-prone.

## ORPC adoption recommendation

- Contract-first is the right bridging strategy because we already have precise JSON-schema artifacts (`packages/coordination/src/types.ts`) and shared runtime helpers (`coordination-inngest`) that can plug directly into an `@orpc/contract` router; a contract-first workflow gives us a single canonical router plus snapshot/validation assets (`minifyContractRouter`, `OpenAPI` introspection) that can serve both the RPC clients (CLI + web agents) and the OpenAPI surface we will expose for workspace runtime plugins.
- Router-first would let us autograph the existing handlers into oRPC after the fact, but it would still leave the domain contracts duplicated across parties, deprive us of compiled OpenAPI docs, and make versioning across agents harder; since the repo already values schema hygiene, the benefit of contract-first (type-safe contract → implement) outweighs the faster initial plug-in of router-first, so recommend contract-first.

## Proposed package topology & conventions

- `packages/coordination` should become the home for the oRPC contract definitions (an `oc.router` that mirrors the existing `/rawr/coordination` surface plus any future additions) and continue exporting the domain helpers; the contract package must not depend on apps and only depend on shared core packages (`@rawr/state`, etc.).
- Introduce a lean `packages/coordination-impl` (or `packages/coordination/router`) that depends on the contract package plus `@rawr/coordination-inngest` to `implement(contract)` and expose the handlers required by `@orpc/server` (`RPCLink`, `OpenAPILink`) so the runtime respects the dependency direction (contract → implementation → apps/plugins).
- Keep `apps/server` dependent on the router implementation for hooking into `RPCHandler`, `OpenAPIHandler`, and the existing plugin loader rather than reimplementing the handlers; this keeps the Elysia app thin and lets workspace plugins or CLI tests swap in mock handlers by reusing the contract package.
- Agent-friendly conventions: document a consistent naming prefix (`coordination.`) for procedures, mandate that every handler returns `CoordinationEnvelope` (wrapping `coordinationSuccess`/`coordinationFailure`), capture context (base URL, runId) in a shared `context` object, and publish a `client.ts` that wraps `createORPCClient` + `RPCLink`/`OpenAPILink` for both CLI/web/agent runtimes so plugin authors can import typed clients instead of hand-rolling fetch calls; call out that `bun run` + `bun test` commands should be used for contract-build/test steps so the workspaces stay on the same runtime (per the Bun skill guidance).

## Doc/runbook/skill updates

- `docs/process/RUNBOOKS.md` should gain an ORPC migration lane describing the separation between the contract definition, implementation, and exposure slices plus the cutover/deletion targets; include steps for capturing the decision packet (current-state vs target-state) as required by the architecture skill and mention the new scratch pads under `docs/projects/agent-coordination-canvas-v1/` so contributors keep artifacts in one place.
- `docs/system/PLUGINS.md` needs a section that spells out how Channel B runtime plugins can register additional ORPC procedures or call the new `coordination` RPC client rather than directly hitting `/rawr/coordination`; highlight the channel split (`rawr plugins web ...` vs `rawr plugins ...`) so plugin authors know which API surface to update and document the need to keep `rawr.kind` metadata in sync with the contract-first package.
- `docs/process/PLUGIN_E2E_WORKFLOW.md` should add ORPC-specific test recipes: contract validation using `@orpc/contract` snapshots, RPC and OpenAPI client tests executed via `bunx --bun vitest`, and a guidance checklist that mirrors the Graphite requirements (`docs/process/GRAPHITE.md`) so every migration phase runs on `codex/coordination-design-data-v1-cutover` or the top Graphite stack entry.
- Capture the operational onboarding knowledge in a new skill or knowledge artifact (e.g., `skills/orpc/SKILL.md` or `docs/system/ORPC.md`) that walks plugin authors through the contract-first workflow, naming conventions, and bundler/test commands, referencing the `plugin-architecture` invariants about separating reporter vs actor surfaces; link it from the README or onboarding runbook so future devs know where to look before editing contracts.

## Phased migration roadmap & governance

1. Phase 0 – Discovery & decision packet: capture the current `/rawr/coordination` surface plus the Inngest adapter, record existing contracts, and draft the contract-first decision packet (per `architecture` skill, keep current/target/transition separate). Governance check: verify Graphite stack cleanliness, record the decision packet in `docs/projects/agent-coordination-canvas-v1/`, and ensure every bridge (the hand-written endpoints) has a deletion target noted before coding.
2. Phase 1 – Contract + router build: author the oRPC contract package, move domain validation into the router implementation, wire `@orpc/server` handlers into `apps/server`, and generate OpenAPI snapshots (with `minifyContractRouter`). Governance check: run `bunx tsc` + `bun test` from the same workspace context, capture contract diffs in `docs/projects/.../ORPC_REPO_WIDE_RESEARCH_PLAN.md`, and get a MAP (migration acceptance plan) sign-off that the router removes the duplicated validation logic (deletion target: `apps/server/src/coordination.ts` once ORPC is healthy).
3. Phase 2 – Client/agent adoption: update CLI/web/plugin runtimes to use the generated RPC/OpenAPI clients, add no-network tests from `packages/coordination-inngest` that call the router directly, and let new plugins register additional procedures via the contract package. Governance check: confirm plugin docs/register commands reference the new clients, ensure the `rawr config` bits (`rawr.config.ts` + `packages/control-plane/src/index.ts`) allow the new routes as part of the plugin gating, and re-run `turbo run lint`/`vitest` before enabling new clients.
4. Phase 3 – Cutover & cleanup: disable the old `/rawr/coordination` endpoints, delete the duplicate handler code, update docs/runbooks/skills to point at the contract-first flow, and expand instrumentation (e.g., `apps/server` logging + `coordination-observability` events). Governance check: validate cutover against the SPEC (ensuring no legacy remains), update `docs/process/HQ_USAGE.md` or `HQ_OPERATIONS` with any new runtime expectations, and re-run the Graphite release playbook (`docs/process/GRAPHITE.md`) before merging.

## File Pointers

1. `apps/server/src/coordination.ts` – existing hand-rolled HTTP surface that will be replaced by the oRPC router.
2. `apps/server/src/rawr.ts` – mounts the routes and workspace plugin loader; defines where the RPC/OpenAPI handlers will attach.
3. `packages/coordination/src/types.ts` – contains the domain schema that the contract will codify and share with clients.
4. `packages/coordination-inngest/src` – runtime adapter and Inngest integration that the router implementation will reuse.
5. `docs/system/PLUGINS.md` & `docs/process/PLUGIN_E2E_WORKFLOW.md` – need updates for plugin-channel guidance and ORPC test recipes.
6. `docs/projects/agent-coordination-canvas-v1/ORPC_REPO_WIDE_RESEARCH_PLAN.md` – canonical research plan; keep it in sync with the migration slices and include the decision packet references.

## Open decisions

1. RPC and OpenAPI exposure scope: should every procedure expose dual transports (RPC + OpenAPI) from day one, or do we gate OpenAPI for external plugin teams until the contract stabilizes?
2. Package ownership: do we keep the contract package under `packages/coordination` or promote it into a new `packages/orpc` namespace so we can share across non-coordination endpoints in the future?
3. Plugin-level extensibility: how do we let workspace runtime plugins register new procedures without impacting the core contract — do we support `oc.router().merge()` or provide a plugin-specific extension hook that generates its own client?

Skills introspected: architecture, orpc, bun, plugin-architecture
