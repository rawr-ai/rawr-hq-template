# PLUGINS

This document defines plugin architecture and workflows for `RAWR HQ-Template` and downstream `RAWR HQ` repos.

## Two Plugin Channels

## Channel A: External oclif plugins

Use oclif plugin manager commands:
- `rawr plugins install <pkg-or-url>`
- `rawr plugins link <path>`
- `rawr plugins inspect <plugin>`
- `rawr plugins update`

Channel A is for CLI command extensions that can be installed from npm/GitHub or linked locally.

## Channel B: Workspace runtime plugins

Use RAWR HQ runtime plugin commands:
- `rawr plugins web list`
- `rawr plugins web enable <id>`
- `rawr plugins web disable <id>`
- `rawr plugins web status`

Channel B is local-first and integrates with runtime state and security gating.

## Runtime Contract (Channel B)

- Workspace runtime plugin packages live under `plugins/web/*`.
- Plugin id is package name (preferred) or directory name fallback.
- Enabling is gated by security checks.
- Enabled set is persisted to `.rawr/state/state.json`.
- Server/web paths consume enabled state.

## Repo Plugin Roots (Internal Layout)

- `plugins/cli/*`: CLI toolkits (oclif plugins; `rawr.kind=toolkit`)
- `plugins/web/*`: workspace runtime plugins (server/web exports; `rawr.kind=web`)
- `plugins/agents/*`: agent offices (skills/workflows/agents/scripts; `rawr.kind=agent`)

## Template Plugin Role Contract

Template plugins must declare role metadata in `package.json#rawr`:
- `templateRole`: `fixture | example | operational`
- `kind`: `toolkit | web | agent`
- `channel`: `A | B | both`
- `publishTier`: `blocked | candidate`

Template default policy:
- `fixture` and `example` are baseline-allowed.
- `operational` is not a template default and should live in personal HQ unless explicitly promoted.
- Template plugin packages remain `private: true` unless release policy explicitly changes.

## Publishing Rails

For publishable plugin packages, include:
- `name`
- `version`
- `files`
- `exports`
- `engines`
- `publishConfig`
- `README.md`

Scaffolded plugin package templates should include these fields by default.

## Local-Only vs Connected

- Local-only default: author/build/enable runtime plugins in workspace.
- Connected opt-in: publish plugins, install external oclif plugins, sync from upstream template.

## Current Publish Posture

- Current default posture is local-only.
- Template sample plugin packages are marked `private: true`; npm publishing is intentionally blocked until publish rails are explicitly enabled.

## Ownership Summary

- Core CLI contracts and publish ownership are template-owned.
- Operational plugin authoring is personal-HQ-owned by default.
