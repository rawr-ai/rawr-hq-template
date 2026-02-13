# Plugin E2E Workflow

Use this runbook to take a capability from shared package authoring to runtime composition, without mixing command surfaces.

In `RAWR HQ-Template`, plugin generation is fixture/example validation.
Operational plugin authoring remains downstream in personal `RAWR HQ`.

## Command Surface Contract (Hard Invariant)
- Channel A (external oclif plugin manager): `rawr plugins ...`
- Channel B (workspace runtime plugins): `rawr plugins web ...`

Do not swap command families.

## Target Authoring Flow
1. Author capability contracts/events/operations in `packages/<capability>/*`.
2. Author one or more runtime adapters in `plugins/<surface>/<capability>-*`.
3. Register adapters in `rawr.hq.ts` (explicit phase-1 registration).
4. Mount manifest outputs from `apps/*` hosts.
5. Validate state/sync/lifecycle checks.

Canonical architecture packet:
- `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`

## Minimal E2E (Case A)

### 1) Shared package
Create:
- `packages/invoice-processing/src/schemas.ts`
- `packages/invoice-processing/src/orpc/contract.ts`
- `packages/invoice-processing/src/operations.ts`

### 2) API runtime adapter
Create:
- `plugins/api/invoice-processing-api/src/index.ts`

Contract:
- `registerApiPlugin(...) -> { namespace, contract, router }`

### 3) Manifest registration
Update:
- `rawr.hq.ts`

Add API plugin registration and ORPC root composition there.

### 4) Host mount
Update or verify:
- `apps/server/src/rawr.ts`

Server mounts manifest ORPC exports only.

## Two-Surface E2E (Case B)

Add:
- `plugins/cli/invoice-processing-cli/src/index.ts`
- `plugins/workflows/invoice-processing-workflows/src/index.ts`

Contracts:
- `registerCliPlugin(...) -> { commands }`
- `registerWorkflowPlugin(...) -> { functions }`

Manifest responsibilities:
- aggregate CLI commands,
- aggregate Inngest functions,
- keep capability keyed by `rawr.capability`.

## Full Multi-Surface E2E (Case C)

Add:
- `plugins/web/invoice-processing-web/src/index.ts`
- `plugins/mcp/invoice-processing-mcp/src/index.ts` (optional)
- `plugins/agents/invoice-processing-agent/src/index.ts`

Agent plugin dependency rule:
- pull knowledge refs from `packages/invoice-processing/src/knowledge/*`,
- do not import runtime code from CLI/web/API/workflow plugins.

## Verification Checklist
1. Composition path:
- all cross-surface composition is in `rawr.hq.ts`.
2. Import boundaries:
- no plugin-to-plugin runtime imports.
3. Runtime mounts:
- `/rpc` and `/api/orpc` from manifest ORPC exports,
- `/api/inngest` from manifest Inngest exports.
4. Metadata contract:
- each runtime plugin declares `rawr.kind` and `rawr.capability`.

## System Checks (Required)
- Manifest smoke check.
- Import-boundary lint check.
- Surface metadata validation check.
- Host mount integration checks.

## Related Runbooks
- `docs/process/runbooks/RAWR_HQ_MANIFEST_COMPOSITION.md`
- `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md`
- `docs/process/HQ_OPERATIONS.md`
