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
- `rawr hq plugins list`
- `rawr hq plugins enable <id>`
- `rawr hq plugins disable <id>`
- `rawr hq plugins status`

Channel B is local-first and integrates with runtime state and security gating.

## Runtime Contract (Channel B)

- Plugin packages live under `plugins/*`.
- Plugin id is package name (preferred) or directory name fallback.
- Enabling is gated by security checks.
- Enabled set is persisted to `.rawr/state/state.json`.
- Server/web paths consume enabled state.

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
