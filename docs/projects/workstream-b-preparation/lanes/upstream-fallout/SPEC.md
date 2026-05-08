# Upstream Fallout Spec

## Ownership

`RAWR HQ-Template` owns the upstream cleanup. The target is to keep upstream
from reintroducing downstream-removed surfaces while preserving future platform
architecture hooks.

## Target State

Upstream no longer exposes or advertises:

- `plugins/web/mfe-demo`
- `@rawr/plugin-mfe-demo`
- `mfe-demo` user-facing enable hints
- `mfe-demo` test fixture dependence
- active coordination canvas route guidance
- `/rpc/coordination/*` guidance
- `rawr workflow coord ...` guidance

Upstream preserves:

- `/api/inngest`
- `dev:inngest`
- `dev:workflows`
- `/api/workflows/*`
- Inngest tests and future async/runtime architecture hooks

`plugins/web/.gitkeep` exists after MFE demo removal.

## Public Surface

Remove public references to:

```bash
rawr plugins web enable mfe-demo --risk off
rawr workflow coord ...
```

Remove active docs that tell users to open or operate:

```text
/coordination
/rpc/coordination/*
```

Preserve runtime docs/commands for:

```bash
bun run dev:workflows
bun run dev:inngest
curl -sS http://localhost:3000/api/inngest
```

where those docs correctly describe Inngest as runtime ingress rather than
coordination canvas operation.

## Internal Boundaries

Remove:

- MFE demo package and project references.
- MFE demo tests or replace them with bounded test-local fixtures.
- Active coordination canvas runbook/routes/commands.
- MFE demo references in `vitest.config.ts`,
  `services/hq-ops/test/ports-backed-service.test.ts`, and `bun.lock`.

Preserve:

- server route spine for Inngest and workflow runtime.
- tests proving `/api/inngest` mount and signature behavior.
- no-live-coordination archive gate.
- archived coordination lessons as archive-only provenance.

Do not decide:

- future Inngest platform architecture details.
- future coordination/workflow design.

## Bring / Preserve / Remove / Ignore

Bring:

- Nothing from downstream for this lane except Workstream A's cleanup boundary.

Preserve:

- `apps/server/src/rawr.ts` Inngest mount.
- `package.json` `dev:workflows` and `dev:inngest`.
- `apps/server/package.json` `dev:inngest`.
- `scripts/phase-1/verify-no-live-coordination.mjs`.
- Inngest tests.
- `plugins/web/.gitkeep`.

Remove:

- `plugins/web/mfe-demo/**`.
- `@rawr/plugin-mfe-demo` from root scripts/project lists.
- `@rawr/plugin-mfe-demo` from `vitest.config.ts` and `bun.lock`.
- MFE demo references in CLI/web/server tests.
- MFE demo references in `services/hq-ops` tests.
- MFE demo user-facing hints.
- `COORDINATION_CANVAS_OPERATIONS.md` from active runbook routing, either by
  deleting, archiving, or replacing with a short retired-surface note.
- active docs that advertise `/coordination`, `/rpc/coordination/*`, or
  `rawr workflow coord ...`.

Ignore:

- stale coordination docs as future architecture.
- archived/quarantined coordination material unless mining is explicitly scoped.

## Test And Evidence Contract

Future implementation must prove:

- `rg -n "@rawr/plugin-mfe-demo|mfe-demo" package.json apps plugins/web docs`
  returns no active references except intentional archive/provenance if any.
- `plugins/web/.gitkeep` exists.
- root build/typecheck/pretest project lists no longer mention
  `@rawr/plugin-mfe-demo`.
- web plugin tests still cover runtime web plugin behavior with a replacement
  test-local fixture or adjusted expectation.
- `services/hq-ops` tests no longer depend on `mfe-demo`.
- `vitest.config.ts` no longer lists `@rawr/plugin-mfe-demo`.
- `bun.lock` no longer carries active `@rawr/plugin-mfe-demo` package state.
- active docs no longer route users to coordination canvas operations.
- coordination cleanup checks and Inngest/runtime preservation checks are run
  separately.
- Inngest scripts/routes/tests remain.

Expected gates:

```bash
bunx nx run @rawr/server:test
bunx nx run @rawr/cli:test
bunx nx run @rawr/web:test
bunx nx run-many -t typecheck --projects=@rawr/server,@rawr/cli,@rawr/web
bun run phase-1:gate:no-live-coordination
```

If the future implementation removes the `@rawr/plugin-mfe-demo` project, do
not include it in the validation project list after removal.

## Non-Goals

- Do not remove Inngest.
- Do not remove `/api/workflows/*` or future runtime hooks.
- Do not redesign coordination.
- Do not mutate downstream `RAWR HQ`.
- Do not preserve MFE demo as a fixture if the user decision still says it can
  be removed.
- Do not run global plugin sync/link repair.

## DRA Disposition

Accepted after review repair. The spec draws the core boundary: delete stale
MFE/coordination surfaces, preserve Inngest, and replace MFE fixture use with
test-local fixtures.

## Review Repair Addendum

- Removal scope includes `vitest.config.ts`, `services/hq-ops` fixture tests,
  and `bun.lock`.
- Stale coordination docs/claims and valid Inngest/runtime hooks require
  separate acceptance checks.
