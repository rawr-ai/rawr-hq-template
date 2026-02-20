# Phase A Interface Deltas (Planned)

## Runtime Identity Contract
### Current
- Runtime/tooling still interprets legacy metadata fields (`templateRole`, `channel`, `publishTier`, `published`) in active code paths.

### Phase A Target
- Runtime behavior is authoritative on:
  1. plugin surface root,
  2. `rawr.kind`,
  3. `rawr.capability`,
  4. manifest registration source.
- Legacy metadata fields become non-runtime compatibility fields only.

### Primary Paths
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/hq/src/workspace/plugins.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/plugins/cli/plugins/src/lib/workspace-plugins.ts`

## Manifest Authority Contract
### Current
- Host composition is assembled directly in server code; manifest authority is not yet runtime-canonical in this path.

### Phase A Target
- `rawr.hq.ts` (or generated equivalent) is runtime composition authority for:
  1. ORPC routes,
  2. workflow boundary routes,
  3. ingress/runtime bundle registration.

### Primary Paths
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/rawr.hq.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`

## Route/Caller Contract
### Current
- Active families: `/rpc`, `/api/orpc/*`, `/api/inngest`.
- Missing additive capability workflow family in current runtime path.

### Phase A Target
- Canonical families and roles:
  1. `/rpc` first-party/internal transport.
  2. `/api/orpc/*` published OpenAPI boundary.
  3. `/api/workflows/<capability>/*` caller-facing workflow boundary.
  4. `/api/inngest` runtime-only signed ingress.
- Mandatory persona forbidden-route assertions.

### Primary Paths
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test`

## Context Seam Contract
### Current
- Static process-level context object is used for route registration.

### Phase A Target
- Split context seams:
  1. request-scoped boundary context factory for ORPC/workflow caller boundaries,
  2. separate durable runtime context/lifecycle handling in Inngest runtime flow.

### Primary Paths
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/workflows/context.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/coordination-inngest/src/adapter.ts`

## Verification Contract
### Current
- Predominantly positive-path tests; incomplete route-negative matrix.

### Phase A Target
- Required conformance gates:
  1. `manifest-smoke`
  2. `metadata-contract`
  3. `import-boundary`
  4. `host-composition-guard`
  5. `route-negative-assertions`
  6. `harness-matrix`
- Required D-016 seam assertions:
  1. alias/instance seam assertions,
  2. no-singleton-global negative assertions.

### Primary Paths
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/test`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json`
