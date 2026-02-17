# Agent Scratch: oRPC Packages + Plugins + Domain Boundaries

## Mission

Map domain package boundaries, API exposures, and plugin wrappers with an eye toward a repo-wide oRPC cutover that keeps CLI/agent/web surfaces stable.

## Findings

1. **Package boundary audit.** `@rawr/coordination` already centralizes the domain: `src/types.ts`, `graph.ts`, `validation.ts`, and `storage.ts` define workflow/desk schemas, adjacency, validation rules, and the file-system-backed persistence that every runtime sits on. `src/http.ts` defines the `CoordinationEnvelope`/`coordinationSuccess`/`coordinationFailure` helpers that the existing HTTP endpoints built in `/apps/server/src/coordination.ts` emit. Runtime orchestration lives in `packages/coordination-inngest/src/adapter.ts` (Inngest queues, engine loop, trace links) plus `packages/coordination-observability/src/events.ts` (timeline events). `/apps/server/src/rawr.ts` wires the Inngest handler (`/api/inngest`) and exposes the `/rawr/coordination/**` surface to plugins via `registerCoordinationRoutes`.
2. **Plugin command wrappers (CLI + agent + web).** All CLI coordination commands (`apps/cli/src/commands/workflow/coord/{create,run,status,trace,validate}.ts`) resolve the server base URL via `apps/cli/src/lib/coordination-api.ts` and perform hand-written `fetch()` calls to `/rawr/coordination`. The web canvas (`apps/web/src/ui/coordination/adapters/api-client.ts`, `hooks/useWorkflow.ts`, `hooks/useRunStatus.ts`) mirrors those paths and envelopes. There is no typed client shared across surfaces today, so every plugin re-implements envelope parsing, error translation, and URL construction, even though the payload shape is identical.
3. **Ownership split (contracts vs implementations vs wrappers).** The domain contract should remain the responsibility of `packages/coordination` (types, validation, storage, plus the new ORPC router definitions). The server implementation (`apps/server/src/coordination.ts`, `apps/server/src/rawr.ts`, `packages/coordination-inngest/src/adapter.ts`) must implement that contract, run Inngest, and keep error/trace semantics stable. Plugin wrappers (CLI commands, web UI pieces, and any future agent surfaces) should only consume generated ORPC clients (RPC + OpenAPI) and drop the handwritten `fetch()`/`coordinationErrorMessage` plumbing.
4. **Reusable ORPC contract placement.** Introduce the ORPC contract inside the coordination package (e.g., `packages/coordination/src/contract.ts` or `contracts/` folder) so it can reuse the existing validation/storage helpers and share the same payload types. That contract would declare procedures for `listWorkflows`, `getWorkflow`, `validateWorkflow`, `saveWorkflow`, `runWorkflow`, `getRunStatus`, and `getRunTimeline`, each sharing `CoordinationWorkflowV1`, `ValidationResultV1`, `RunStatusV1`, and `CoordinationFailure` from the same package. Exported router clients would then be consumable by CLI, web, and any agent plugin, avoiding duplicate manual wiring.

## Migration slices

1. **Contract-first spec (package-level).** Extend `packages/coordination/src` with an ORPC `oc.router` definition that mirrors the `/rawr/coordination` surface and reuses the `CoordinationEnvelope` helpers from `src/http.ts`. Scope: `packages/coordination/src/contract.ts` (new router), `src/types.ts`, `src/validation.ts` (shared schemas), and `src/http.ts` (error types). This slice produces an `oc.router` plus schema snapshots that can be consumed by both the server implementation and generated clients before the server actually switches over.
2. **Server implementation (apps).** Replace the manual Elysia routes in `/apps/server/src/coordination.ts` with handlers wired through the ORPC router from slice 1, hooking the existing `createCoordinationRuntimeAdapter`/`queueCoordinationRunWithInngest` logic so the new handler still persists status/timeline data. Scope: `/apps/server/src/coordination.ts`, `/apps/server/src/rawr.ts`, and `/packages/coordination-inngest/src/adapter.ts` (for the event payload shape), plus `apps/server/src/plugins.ts` if plugin registration expectations change.
3. **Plugin clients (CLI + web).** Swap `apps/cli/src/lib/coordination-api.ts` and the `workflow/coord` commands to use `@orpc/client` with generated `RPCLink`/`OpenAPILink` helpers against the contract from slice 1. Similarly, rewrite `apps/web/src/ui/coordination/adapters/api-client.ts` (and derived hooks) to use the same generated client so both surfaces share the typed API and error handling logic. Scope: `apps/cli/src/lib/coordination-api.ts`, `apps/cli/src/commands/workflow/coord/*.ts`, `apps/web/src/ui/coordination/adapters/api-client.ts`, and the dependent hooks/components.
4. **Transition/backwards compatibility.** Keep the existing `/rawr/coordination` envelope helpers and manual routes as a compatibility shim while clients migrate to ORPC. This may involve proxying ORPC responses through `coordinationSuccess()`/`coordinationFailure()` in `/apps/server/src/coordination.ts` until CLI/web are updated, then removing the shim once ORPC clients ship. Scope: `/apps/server/src/coordination.ts` and `apps/server/src/rawr.ts` (route registration).

## Risks

1. **Contract drift vs manual envelope.** Replacing `coordinationSuccess`/`coordinationFailure` (see `/apps/server/src/coordination.ts` + `packages/coordination/src/http.ts`) with ORPC responses risks breaking CLI/web if they continue to expect the old envelope. A phased compatibility shim is required.
2. **Inngest/event shape mismatch.** `packages/coordination-inngest/src/adapter.ts` (and `/apps/server/src/rawr.ts`) rely on `CoordinationRunEventData` + `COORDINATION_RUN_EVENT`. Any contract change must keep that payload shape in lockstep or the Inngest queue/runner can reject events or miss trace links.
3. **Storage/runtime coupling.** `packages/coordination/src/storage.ts` and `apps/server/src/coordination.ts` encode persistence/locking expectations (workflow/run files, timeline locks). The ORPC handler must preserve the same `CoordinationRuntimeAdapter` semantics to avoid run status corruption or timeline races.

## File Pointers

1. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/server/src/coordination.ts`
2. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/server/src/rawr.ts`
3. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/cli/src/lib/coordination-api.ts`
4. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/apps/web/src/ui/coordination/adapters/api-client.ts`
5. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/packages/coordination/src/types.ts`
6. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/packages/coordination/src/validation.ts`
7. `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-agent-a-coordination-design-data-v1/packages/coordination-inngest/src/adapter.ts`

## Skills introspected

plugin-architecture (`/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`)
orpc (`/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`)
architecture (`/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`)
