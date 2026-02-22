# RAWR HQ Manifest Composition

Use this runbook when composing capability runtime surfaces in `rawr.hq.ts`.

## Purpose
Provide one deterministic workflow for composing:
- ORPC routers/contracts,
- Inngest workflow functions,
- web mounts,
- CLI commands,
- agent capabilities,
- optional MCP actions.

## Preconditions
1. Shared capability package exists under `packages/<capability>/*`.
2. Runtime plugin adapters exist under one or more `plugins/<surface>/*` roots.
3. Each plugin declares required metadata:
- `rawr.kind`
- `rawr.capability`

## Composition Steps

### 1) Import plugin registrations
In `rawr.hq.ts`, import each surface registration helper.

### 2) Register each surface
Call registration helpers and store outputs in local constants.

### 3) Compose ORPC root
Build one ORPC root contract/router from API registrations.

### 4) Compose Inngest bundle
Build one client/function bundle from workflow registrations.

### 5) Compose non-API registries
Aggregate:
- web mounts,
- CLI commands,
- agent capability records,
- optional MCP actions.

### 6) Export one manifest object
Export a single `RawrHqManifest` object with the full composed result.

## Host Mount Responsibilities
- `apps/server`: mounts ORPC and Inngest from manifest.
- `apps/web`: mounts web surface from manifest.
- `apps/cli`: mounts CLI command registry from manifest.

Host apps must not compose capability logic directly.

## Guardrails
1. No plugin-to-plugin runtime imports.
2. Capability logic remains in `packages/*`.
3. `rawr.hq.ts` is sole cross-surface composition authority.
4. Keep naming stable per capability (`invoice-processing` style slugs).

## Validation
1. `manifest-smoke` CI check passes.
2. import-boundary lint check passes.
3. metadata-contract validation passes.
4. host integration checks pass for `/rpc`, `/api/orpc`, `/api/inngest`.

## Troubleshooting
1. Symptom: capability routes not mounted.
- Check plugin registration is present in `rawr.hq.ts`.
2. Symptom: workflow functions not firing.
- Check workflow registration contributes functions to manifest Inngest bundle.
3. Symptom: plugin metadata rejected.
- Verify `rawr.kind` and `rawr.capability` are present and valid.
