# Root Undo Spec

## Ownership

Service authority:

- `services/agent-config-sync`

Node resources:

- `packages/agent-config-sync-node`

Root CLI projection:

- `apps/cli`

Downstream `@rawr/agent-sync` is behavior evidence only and must not become the
upstream target authority.

## Target State

`rawr undo` exists in upstream as a root CLI command and calls
`services/agent-config-sync` undo behavior.

The root CLI also expires the active undo capsule on unrelated commands using
upstream service-owned lifecycle logic. This housekeeping must be best-effort
and must not block command execution.

Public lifecycle API decision: export
`expireUndoCapsuleOnUnrelatedCommand` through the narrow
`@rawr/agent-config-sync/undo` surface. The root CLI must bind to that public
surface rather than importing service internals or reviving downstream
`@rawr/agent-sync`.

## Public Surface

Expected command:

```bash
rawr undo [--dry-run] [--json]
```

Behavior:

- Locate workspace root.
- Call `agent-config-sync.undo.runUndo` with `dryRun` from base flags.
- If no workspace root exists, return `WORKSPACE_ROOT_MISSING` and exit `2`.
- If service returns `ok: false`, emit the service error code/details in both
  JSON and human modes and exit `1`.
- If service returns `ok: true`, emit:
  - `workspaceRoot`,
  - `undo.capsuleId`,
  - `undo.provider`,
  - `undo.dryRun`,
  - `undo.status`,
  - `undo.operations`,
  - `undo.summary`.
- Human output should include capsule, provider, dry-run state, and summary
  counts.
- `--dry-run` must be passed through unchanged and must not mutate capsule
  contents during undo replay.

Lifecycle behavior:

- Before executing root CLI commands, expire active plugin-sync undo capsules
  for unrelated commands.
- Preserve capsules for `undo`, `plugins sync`, and `sync` command tokens.
- Treat lifecycle expiration failures as best-effort housekeeping.

## Internal Boundaries

Service-owned:

- Capsule format.
- Operation replay.
- Failure codes.
- Command-expiration semantics.
- Public `@rawr/agent-config-sync/undo` export for
  `expireUndoCapsuleOnUnrelatedCommand`.
- Filesystem behavior through injected resources.

CLI-owned:

- Command registration.
- Workspace-root lookup.
- Service client binding to local Node resources.
- `RawrCommand` result rendering and exit codes.
- Best-effort lifecycle hook placement.

## Bring / Preserve / Remove / Ignore

Bring from downstream:

- Root command human summary shape.
- `--dry-run` behavior through base flags.
- Best-effort pre-command expiration.
- Related-command allowlist semantics.

Preserve upstream:

- `agent-config-sync` undo contract and router.
- `agent-config-sync-node` resource adapter.
- Plugin sync undo capture and user hint output.

Remove later downstream:

- downstream root command and old `@rawr/agent-sync` undo authority after
  upstream root command is consumed downstream, in the final downstream sunset
  phase.

Ignore:

- any downstream package-level implementation details that duplicate existing
  upstream service behavior.

## Test And Evidence Contract

Future implementation must prove:

- `apps/cli/src/commands/undo.ts` exists and binds to `agent-config-sync`.
- `rawr undo --json --dry-run` returns the expected service-shaped payload when
  a capsule exists.
- missing capsule returns service error details.
- missing workspace root exits `2` with `WORKSPACE_ROOT_MISSING` in JSON and
  human modes.
- service failure exits `1` with stable JSON and human failure shape.
- dry-run preserves capsule/provider state and reports `undo.dryRun`.
- unrelated commands trigger best-effort expiration.
- related commands do not expire the capsule.
- plugin sync hint remains accurate.

Expected gates:

```bash
bunx nx run @rawr/agent-config-sync:test
bunx nx run @rawr/agent-config-sync-node:test
bunx nx run @rawr/cli:test
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/cli
```

## Non-Goals

- Do not reintroduce `@rawr/agent-sync` upstream.
- Do not broaden undo beyond plugin-sync capsules.
- Do not make undo lifecycle expiration block normal command execution.
- Do not remove downstream undo material during this upstream lane.
- Do not run real plugin sync as a test setup unless the future DRA explicitly
  scopes a reversible fixture.

## DRA Disposition

Accepted after review repair. The future implementation can wire projection
without deciding service API shape; the public lifecycle export is fixed here.

## Review Repair Addendum

- Export `expireUndoCapsuleOnUnrelatedCommand` from
  `@rawr/agent-config-sync/undo`.
- Pin exit behavior: missing workspace root exits `2`; service failure exits
  `1`; lifecycle expiration remains best-effort and nonblocking.
