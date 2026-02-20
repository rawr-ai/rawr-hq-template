# Phase A Execution Packet

## Start Here (Single Entrypoint)
This is the only execution packet for Phase A.

Execute strictly in this order:
1. `A0` -> `A1` -> `A2` -> `A3` -> `A4` -> `A5` -> `A6`
2. Do not start a slice until all dependency slices are green.
3. Forward-only posture: remediate failing slices in place; do not run rollback tracks.

## Phase A Objective
Converge runtime behavior to locked D-013, D-015, and D-016 seam-now policy with implementation-ready slices tied to real code paths.

## Locked Decisions (No Re-open Inside Phase A)
1. `/api/workflows/<capability>/*` ships in Phase A as an additive caller-facing route family.
2. `/api/inngest` remains runtime-ingress-only and must stay caller-forbidden.
3. Ingress signature verification is host-enforced before runtime dispatch.
4. Runtime metadata behavior is keyed only by `rawr.kind`, `rawr.capability`, and manifest registration.
5. `templateRole`, `channel`, `publishTier`, and `published` are non-runtime fields.
6. Plugin metadata interpretation is centralized in one shared parser contract used by both workspace discovery paths.
7. Harness and negative-route gates are hard-fail by end of `A1` (baseline wiring in `A0` is allowed).
8. Compatibility shims are time-boxed and removed in `A6`.

## Ownership Semantics (Explicit)
`Owner` means the accountable role for decision and merge-complete outcome of a slice, not an advisory stakeholder.

| Role | Handle | Backup | Accountability |
| --- | --- | --- | --- |
| Runtime/Host Composition Owner | `@rawr-runtime-host` | `@rawr-platform-duty` | Host wiring, context seam, ingress guard, route-family mounts |
| Plugin Lifecycle Owner | `@rawr-plugin-lifecycle` | `@rawr-architecture-duty` | Metadata contract, discovery roots, shared parser adoption |
| Verification & Gates Owner | `@rawr-verification-gates` | `@rawr-release-duty` | CI gates, negative-route assertions, harness completeness |
| Distribution/Lifecycle Contract Owner | `@rawr-distribution-lifecycle` | `@rawr-runtime-host` | Alias/instance seam assertions and shim retirement |

SLA rule: if owner misses SLA, backup becomes acting owner for that decision.

## Slice Plan (Decision-Complete)

### A0 - Baseline Gate Scaffold
- Owner: `Verification & Gates Owner`
- Depends on: none
- Implement:
  1. Wire gate jobs: `metadata-contract`, `import-boundary`, `manifest-smoke-baseline`, `host-composition-guard`, `route-negative-assertions`, `harness-matrix`, `observability-contract`.
  2. Wire deterministic static guard check command for legacy runtime branching (targeted pattern scan + tests).
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/turbo.json`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test`
- Acceptance:
  1. All gate jobs execute in CI.
  2. Static guard check command is runnable in CI.

### A1 - Metadata Runtime Contract Shift (D-013)
- Owner: `Plugin Lifecycle Owner`
- Depends on: `A0`
- Implement:
  1. Create shared parser contract module at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugin-manifest-contract.ts`.
  2. Move runtime-key interpretation to shared parser and consume it from:
     - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
     - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
  3. Keep legacy fields as non-runtime data only (no branching by legacy fields).
- Acceptance:
  1. `metadata-contract` fails on any runtime branch using legacy fields.
  2. Both discovery implementations import the shared parser contract.
  3. No duplicate runtime metadata parser remains.

### A2 - Plugin Discovery Surface Expansion
- Owner: `Plugin Lifecycle Owner`
- Depends on: `A1`
- Implement:
  1. Expand discovery roots to include `plugins/api/*` and `plugins/workflows/*` in both workspace discovery paths.
  2. Preserve current behavior for existing roots (`plugins/cli/*`, `plugins/agents/*`, `plugins/web/*`).
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
- Acceptance:
  1. Tests include fixtures for API/workflow roots.
  2. Existing root behavior remains unchanged.

### A3 - Host Context Seam + Ingress Hardening
- Owner: `Runtime/Host Composition Owner`
- Depends on: `A0`
- Implement:
  1. Replace static process-level ORPC context with request-scoped context factory in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`.
  2. Add explicit workflow boundary context factory module at `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/workflows/context.ts`.
  3. Add ingress verification guard before runtime dispatch in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`.
  4. Enforce mount order contract in host composition: `/api/inngest` -> `/api/workflows/*` -> `/rpc` + `/api/orpc/*`.
- Acceptance:
  1. `host-composition-guard` confirms mount order and request-scoped context usage.
  2. Unsigned ingress request tests fail as expected.

### A4 - Additive `/api/workflows/<capability>/*` Family
- Owner: `Runtime/Host Composition Owner`
- Depends on: `A2`, `A3`
- Implement:
  1. Add manifest authority file `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts` as runtime composition source.
  2. Add workflow trigger contract/router composition in core ORPC layer under capability namespaces.
  3. Mount `/api/workflows/*` using manifest-owned trigger router (capability-first paths).
  4. Keep `/rpc` first-party/internal and `/api/orpc/*` published boundary behavior unchanged.
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc`
- Acceptance:
  1. `manifest-smoke-completion` passes with all four families mounted: `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
  2. No `/rpc/workflows` dedicated mount is introduced.
  3. Caller-path access to `/api/inngest` remains forbidden.

### A5 - D-015 Harness Matrix + Negative Assertions
- Owner: `Verification & Gates Owner`
- Depends on: `A3`, `A4`
- Implement:
  1. Add required suite IDs and enforce presence:
     - `suite:web:first-party-rpc`
     - `suite:web:published-openapi`
     - `suite:cli:in-process`
     - `suite:api:boundary`
     - `suite:workflow:trigger-status`
     - `suite:runtime:ingress`
     - `suite:cross-surface:metadata-import-boundary`
  2. Add mandatory negative-route assertions:
     - first-party and external callers reject `/api/inngest`
     - external callers reject `/rpc`
     - runtime-ingress suites do not assert caller-boundary semantics
     - in-process suites do not default to local HTTP self-calls
- Primary test paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/orpc-handlers.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/orpc-openapi.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/rawr.test.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test/route-boundary-matrix.test.ts`
- Acceptance:
  1. `harness-matrix` fails if any required suite ID is missing.
  2. `route-negative-assertions` is fully green.

### A6 - D-016 Seam Assertions + Shim Retirement
- Owner: `Distribution/Lifecycle Contract Owner`
- Depends on: `A1`, `A5`
- Implement:
  1. Add alias/instance seam assertions in lifecycle-relevant tests.
  2. Add no-singleton-global negative assertions for runtime composition assumptions.
  3. Remove compatibility-read shims introduced during `A1`.
- Primary paths:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`
- Acceptance:
  1. `metadata-contract` gate is green.
  2. Static legacy-runtime-branch guard check (pattern scan + tests) is green.
  3. Alias/instance and no-singleton assertions are green.
  4. Compatibility shims are deleted.

## Gate Contract (Concrete)
Required gates:
1. `metadata-contract`
2. `import-boundary`
3. `manifest-smoke-baseline` (`A0` only)
4. `host-composition-guard`
5. `route-negative-assertions`
6. `harness-matrix`
7. `observability-contract`
8. `manifest-smoke-completion` (Phase A exit)

Deterministic static guard check (completion/exit):
```sh
bun scripts/phase-a/check-legacy-runtime-branching.mjs \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts \
  /Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts \
  && bunx vitest run --project hq --project plugin-plugins --testNamePattern='legacy runtime branch guard'
```

Telemetry note (optional, non-blocking):
- Diagnostic telemetry for migration visibility is allowed but must not gate Phase A completion.

## Phase A Exit Criteria
1. All slices `A0`..`A6` complete in dependency order.
2. All required gates are green with no warning-only mode.
3. `manifest-smoke-completion` is green with zero pending families.
4. `metadata-contract` gate is green.
5. Static legacy-runtime-branch guard check (pattern scan + tests) is green.
6. Compatibility shim code paths are removed in `A6`.
7. No runtime behavior branches on legacy metadata fields.
8. `/api/workflows/<capability>/*` is active and route-policy-correct.

## Deferred Register (Centralized, Concise)
| Defer ID | Deferred Item | Why Deferred | Unblock Trigger | Target Phase | Owner |
| --- | --- | --- | --- | --- | --- |
| `DR-001` | D-016 UX/packaging product features | Not required for seam-now safety | Phase A completion + shim retirement | Phase D | `@rawr-distribution-lifecycle` |
| `DR-002` | Cross-instance storage-backed lock redesign | Not required for Phase A contract convergence | Evidence of cross-instance duplication risk after `A6` | Phase C | `@rawr-runtime-host` |
| `DR-003` | Expanded telemetry beyond required gate diagnostics | Keep Phase A narrow and execution-focused | Post-Phase-A observability backlog intake | Phase C | `@rawr-verification-gates` |
| `DR-004` | Broad non-convergence refactors | Would dilute Phase A delivery focus | New scoped milestone approval after Phase A | Phase B | `@rawr-plugin-lifecycle` |
