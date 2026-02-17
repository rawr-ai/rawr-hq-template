# SYSTEM

## Architecture Summary

`RAWR HQ-Template` is a Bun + TypeScript monorepo where `rawr` is the single command entrypoint.

Target-state runtime composition is manifest-first:
- shared capability logic/contracts in `packages/*`,
- runtime adapters by surface in `plugins/*`,
- final multi-surface assembly in `rawr.hq.ts`,
- host mounting in `apps/*`.

Canonical target packet:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
  (see `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`)

## Procedure API Spine (ORPC)

Procedure-style APIs are contract-defined and exposed through the HQ ORPC root router.

- RPC transport: `/rpc`
- OpenAPI transport: `/api/orpc`
- OpenAPI spec: `/api/orpc/openapi.json`

Current canonical procedure namespaces:
- `coordination.*` (workflow CRUD, validation, queueing, run status, timeline)
- `state.getRuntimeState`

Explicit non-procedure infrastructure routes that remain framework-native:
- `/api/inngest` (Inngest ingress/webhook transport)
- `/rawr/plugins/web/:dirName` (runtime module serving)
- `/health` (liveness)

## Manifest Composition Contract

`rawr.hq.ts` is the single composition authority for runtime surfaces.

It exports:
- ORPC contract/router/context bundle,
- Inngest client/functions bundle,
- web mount registry,
- CLI command registry,
- agent capability registry,
- optional MCP action registry.

`apps/server`, `apps/web`, and `apps/cli` mount these exports and do not author per-capability composition logic.

## Core Components (Required)

- `apps/cli`
- `packages/core`
- `packages/control-plane`
- `packages/state`
- `packages/security`
- `packages/journal`

## Optional Components (Supported)

- `apps/server`
- `apps/web`
- `packages/ui-sdk`
- `plugins/web/mfe-demo`

Template plugin packages are fixture/example artifacts used to validate baseline behavior.
Operational plugin development belongs in downstream personal HQ repos.

## Plugin Channels

- Channel A: external oclif plugin manager (`rawr plugins install|link|...`).
- Channel B: RAWR HQ workspace runtime plugins (`rawr plugins web list|enable|disable|status`).

Channel B is local-first by default and uses security gating + repo-local enabled state.

## Plugin Roots

- `plugins/cli/*` for CLI runtime adapters.
- `plugins/web/*` for web runtime adapters.
- `plugins/agents/*` for agent runtime adapters/content.
- `plugins/api/*` for API runtime adapters.
- `plugins/workflows/*` for workflow runtime adapters.
- `plugins/mcp/*` for MCP runtime adapters (optional).

### Metadata Contract (Target)
- Required:
  - `rawr.kind`
  - `rawr.capability`
- Derived:
  - channel classification from surface root/command family.
- Removed from runtime semantics:
  - `templateRole`
  - `channel`
- Deprecated for later removal:
  - `publishTier` / `published`

### Import Boundary Contract (Target)
- Allowed:
  - `plugins/**` importing `packages/**` and approved host interfaces/types.
- Not allowed:
  - `plugins/**` importing other `plugins/**` runtime code.

## Core Ownership

Core UX/contracts are governed by `RAWR HQ-Template` and should be contributed upstream when intended for all users.
`@rawr/cli` publishing ownership is template-only.

## State and Security Boundaries

- Enabled workspace runtime plugin state is persisted in `.rawr/state/state.json`.
- Gating occurs at plugin enablement.
- Server/web runtime loading consumes enabled state.

## Planned Controls

`rawr.config.ts` includes plugin channel policy controls:
- `plugins.channels.workspace.enabled`
- `plugins.channels.external.enabled`

These controls are currently policy metadata and may be enforced more strictly in future iterations.
