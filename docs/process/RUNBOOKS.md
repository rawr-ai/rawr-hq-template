# Runbooks Index

This index is the canonical entrypoint for active process runbooks.

Use this when you need exact commands for:
- operating the managed local HQ runtime,
- verifying published API behavior,
- containing migration-doc drift with path-obvious quarantine,
- draining Graphite stacks,
- syncing template/personal work,
- generating ORPC OpenAPI compatibility artifacts.

Plugin/CLI lifecycle runbooks that predate the final architecture migration have been moved to `docs/process/runbooks/quarantine/`.

## Quick Chooser

| Goal | Runbook |
| --- | --- |
| Operate the managed local HQ runtime | `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md` |
| Operate coordination canvas workflows and run diagnostics | `docs/process/runbooks/COORDINATION_CANVAS_OPERATIONS.md` |
| Contain migration-doc drift with quarantine-first topology | `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` |
| Drain Graphite stacks safely (publish/merge/prune loop) | `docs/process/runbooks/STACK_DRAIN_LOOP.md` |
| Integrate template -> personal with sync-first sequencing | `docs/process/runbooks/TEMPLATE_TO_PERSONAL_INTEGRATION_LOOP.md` |
| Canonical repo-boundary + transient retry + final acceptance policy | `docs/process/HQ_OPERATIONS.md` |
| Generate ORPC OpenAPI compatibility artifacts | `docs/process/runbooks/ORPC_OPENAPI_COMPATIBILITY.md` |

## Command Surface Invariant

- Channel A: `rawr plugins ...` (oclif plugin manager)
- Channel B: `rawr plugins web ...` (workspace runtime plugins)
- In this repo's local dev checkout, invoke the CLI as `bun run rawr ...`.

Do not mix command families.

## Convergence Shortcuts

- Health/drift view: `rawr plugins status --checks all`
- Link/install diagnosis: `rawr plugins doctor links --json`
- End-to-end converge loop: `rawr plugins converge --json`

Scratch-first policy for mutating multi-phase commands:
- Required docs: `docs/projects/*/PLAN_SCRATCH.md` and `docs/projects/*/WORKING_PAD.md`
- Mode controls:
  - `RAWR_SCRATCH_POLICY_MODE=off|warn|block`
  - `git config rawr.scratchPolicyMode <off|warn|block>`
  - `RAWR_SKIP_SCRATCH_POLICY=1` (one-off bypass)

## Related Process Docs

- `docs/process/PLUGIN_AUTONOMY_READINESS_SCORECARD.md` (autonomy readiness and drift scorecard)
- `docs/process/CROSS_REPO_WORKFLOWS.md` (template/personal workflow model)
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md` (template -> personal sync)
- `docs/process/GRAPHITE.md` (branch/stack workflow)

## Quarantined Runbooks

Quarantined runbooks live under `docs/process/runbooks/quarantine/`. They are preserved intact for later rewrite/mining, but are not current instructions.

Transient quarantine ledgers use `AGENTS.md` files with the marker `<!-- quarantine-ledger: true -->`.
