# SYSTEM

## Architecture Summary

`RAWR HQ-Template` is a Bun + TypeScript monorepo where `rawr` is the single command entrypoint.

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
- Channel B: RAWR HQ workspace runtime plugins (`rawr hq plugins list|enable|disable|status`).

Channel B is local-first by default and uses security gating + repo-local enabled state.

## Plugin Roots

- `plugins/cli/*` for Channel A plugin packages.
- `plugins/web/*` for Channel B runtime plugin packages.
- `plugins/agents/*` for agent-office content packages.

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
