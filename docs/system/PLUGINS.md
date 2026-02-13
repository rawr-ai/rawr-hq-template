# PLUGINS

This document defines the target plugin architecture and operational workflow for `RAWR HQ-Template` and downstream `RAWR HQ` repos.

Canonical spec packet:
- `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`

## Command Surface Contract (Current)
- Channel A (external oclif plugin manager): `rawr plugins ...`
- Channel B (workspace runtime plugins): `rawr plugins web ...`

Do not mix command families.

## Runtime Model (Target)
1. Shared capability logic/contracts/events/schemas live in `packages/*`.
2. Runtime adapters live in `plugins/*` split by surface.
3. Final cross-surface composition lives in `rawr.hq.ts`.
4. Host apps (`apps/*`) mount manifest exports and do not author per-capability wiring.

## Runtime Plugin Roots (Target)
- `plugins/api/*`
- `plugins/workflows/*`
- `plugins/web/*`
- `plugins/cli/*`
- `plugins/agents/*`
- `plugins/mcp/*` (optional)

## Metadata Contract (Target)
Required:
- `rawr.kind`: `api | workflows | web | cli | agents | mcp`
- `rawr.capability`: stable capability slug

Derived:
- channel classification is inferred from plugin surface root and command family.

Removed from runtime semantics:
- `templateRole`
- `channel`

Deprecated for later removal:
- `publishTier` / `published`

## Surface Registration Contracts (Target)
- `registerApiPlugin(...) -> { namespace, contract, router }`
- `registerWorkflowPlugin(...) -> { functions }`
- `registerWebPlugin(...) -> { mounts }`
- `registerCliPlugin(...) -> { commands }`
- `registerAgentPlugin(...) -> { capabilities, knowledgeRefs }`
- `registerMcpPlugin(...) -> { actions }` (optional)

## Composition Contract
`rawr.hq.ts` is the single composition authority.

It aggregates and exports:
- ORPC contract/router/context,
- Inngest client/functions,
- web mounts,
- CLI commands,
- agent capabilities,
- optional MCP actions.

## Import Boundary Contract
Allowed:
- `plugins/**` importing `packages/**` and approved host interfaces/types.

Not allowed:
- `plugins/**` importing other `plugins/**` runtime code.

## Ownership Summary
- Template repo owns baseline shared contracts, fixtures/examples, and process/docs contracts.
- Operational plugin authoring remains downstream personal-HQ-first by default.
- Promotion to template is explicit and should be justified as baseline fixture/example value.

## Publishing and Release Posture
- Publishing posture is a release-governance concern, not runtime composition logic.
- During transition, legacy publish metadata may remain documented, but runtime behavior must not depend on it.

## Related Process Docs
- `docs/process/PLUGIN_E2E_WORKFLOW.md`
- `docs/process/runbooks/RAWR_HQ_MANIFEST_COMPOSITION.md`
- `docs/process/HQ_OPERATIONS.md`
- `AGENTS_SPLIT.md`
