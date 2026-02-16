# SESSION_019c587a Agent D Tech Hardening Scratchpad

## Constraints / Guardrails
- Edit only:
  - Assigned doc.
  - This scratchpad.
  - Agent D plan file.
- Do not modify other in-flight agent files.

## Read status
- Assigned doc read fully: yes.
- Required skills read: yes.
  - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`

## Official-doc validation checkpoints (from skill-linked sources)
- Inngest
  - Durable execution + step model:
    - https://www.inngest.com/docs/learn/how-functions-are-executed
    - https://www.inngest.com/docs/learn/inngest-steps
  - Bun/Elysia serve boundary:
    - https://www.inngest.com/docs/learn/serving-inngest-functions
    - https://www.inngest.com/docs/reference/serve
  - Reliability and idempotency:
    - https://www.inngest.com/docs/guides/handling-idempotency
    - https://www.inngest.com/docs/guides/concurrency
  - Security:
    - https://www.inngest.com/docs/platform/signing-keys
    - https://www.inngest.com/docs/events/creating-an-event-key

- oRPC
  - Contract-first + implement:
    - https://orpc.dev/docs/contract-first/define-contract
    - https://orpc.dev/docs/contract-first/implement-contract
  - Transports:
    - https://orpc.dev/docs/rpc-handler
    - https://orpc.dev/docs/openapi/openapi-handler
  - Elysia adapter:
    - https://orpc.dev/docs/adapters/elysia

- Elysia
  - Lifecycle / plugin encapsulation:
    - https://elysiajs.com/essential/life-cycle
    - https://elysiajs.com/essential/plugin
  - Mount/fetch interop:
    - https://elysiajs.com/patterns/mount

## Local-repo reality checks used for plausibility
- ORPC mounting with parse none and prefix alignment:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/orpc.ts`
- Inngest serve endpoint mount in Elysia:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/apps/server/src/rawr.ts`
- Inngest function + step.run boundaries + event queue:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination-inngest/src/adapter.ts`
- ORPC contract shape with `.route()` and TypeBox bridge:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination/src/orpc/contract.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/packages/coordination/src/orpc/schemas.ts`

## Hardening gaps identified in assigned doc
1. Hidden runtime machinery
- `createInvoiceOrpcSurface`, `registerInvoiceProcessingWorkflowPlugin`, `mountOrpcFromManifest`, `mountInngestFromManifest` were referenced but not shown.

2. Elysia caveats were implicit
- No explicit `parse: "none"` in mount snippet for forwarded RPC/OpenAPI handlers.
- No explicit prefix-alignment warning for `/rpc` + `/api/orpc`.

3. Inngest lifecycle guidance under-specified
- Needed explicit statements on re-entry semantics, stable step IDs, side-effect placement, and ingress security keys.

4. Ownership layout not explicit enough
- Needed exact file-level ownership for contract vs implement vs host mount wrappers.

## Planned concrete additions
- Add explicit boundary runtime files:
  - `runtime/orpc-surface.ts`
  - `runtime/inngest-surface.ts`
  - `runtime/plugin-wrappers.ts`
  - plus explicit host-side mount module (`apps/server/src/manifest-mounts.ts`)
- Add complete code snippets for:
  - contract -> implement -> router pipeline.
  - Elysia mount wiring for `/rpc`, `/api/orpc`, `/api/inngest`.
  - Inngest event send + createFunction consumption.
- Add dedicated sections:
  - Inngest correctness and lifecycle details.
  - oRPC contract/implementation/transport correctness.
  - Elysia mounting and adapter caveats.
  - Validation Notes (Observed vs Inferred + references).

## User hard-requirement follow-up (plurality n>1)
Implemented directly in assigned doc:
- Added scaled file tree variant with multiple contracts/routers/functions/clients.
- Added one-file-per-function organization examples for both Inngest and ORPC registries.
- Added domain service evolution into a suite/library with port boundaries.
- Added stable import/dependency patterns under growth + capability-level composition snippet.
