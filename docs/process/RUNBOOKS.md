# Runbooks Index

This index is the canonical entrypoint for active process runbooks.

Use this when you need exact commands for:
- operating the managed local HQ runtime,
- running a bounded workstream as a coordination object,
- containing migration-doc drift with path-obvious quarantine,
- draining Graphite stacks,
- validating explicit data/artifact interfaces across independent repositories.

Plugin/CLI lifecycle, telemetry proof, and ORPC/OpenAPI publication runbooks that predate or cross the final architecture migration have been moved to `docs/process/runbooks/quarantine/`.

## Quick Chooser

| Goal | Runbook |
| --- | --- |
| Run a bounded workstream as a coordination object | `docs/process/WORKSTREAMS.md` |
| Operate the managed local HQ runtime | `docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md` |
| Contain migration-doc drift with quarantine-first topology | `docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md` |
| Drain Graphite stacks safely (publish/merge/prune loop) | `docs/process/runbooks/STACK_DRAIN_LOOP.md` |
| Validate Template/personal separation and artifact bindings | `docs/process/CROSS_REPO_WORKFLOWS.md` |
| Canonical repo-boundary + transient retry + final acceptance policy | `docs/process/HQ_OPERATIONS.md` |

## Command Surface Invariant

- External Oclif extensions: `rawr plugins ...`
- Curated agent-plugin lifecycle: `rawr agent plugins ...`
- Controller development uses repository-local build/test targets; production and
  operational proof invokes an installed controller release, not `apps/cli` source.

Do not mix command families or give app composition lifecycle authority.

Scratch-first policy for mutating multi-phase commands:
- Required docs: `docs/projects/*/PLAN_SCRATCH.md` and `docs/projects/*/WORKING_PAD.md`
- Mode controls:
  - `RAWR_SCRATCH_POLICY_MODE=off|warn|block`
  - `git config rawr.scratchPolicyMode <off|warn|block>`
  - `RAWR_SKIP_SCRATCH_POLICY=1` (one-off bypass)

## Related Process Docs

- `docs/process/WORKSTREAMS.md` (Template-owned generic coordination pack)
- `docs/process/PLUGIN_AUTONOMY_READINESS_SCORECARD.md` (autonomy readiness and drift scorecard)
- `docs/process/CROSS_REPO_WORKFLOWS.md` (repository separation and artifact interfaces)
- `docs/process/GRAPHITE.md` (branch/stack workflow)

## Related Implementation Handoffs

- `services/agent-config-sync/docs/NATIVE_SUPERSEDED_PROJECTION_CLEANUP_HANDOFF.md`
  (forward-looking service handoff for duplicate legacy Codex projection claims)

## Quarantined Runbooks

Quarantined runbooks live under `docs/process/runbooks/quarantine/`. They are preserved intact for later rewrite/mining, but are not current instructions.

Transient quarantine ledgers use `AGENTS.md` files with the marker `<!-- quarantine-ledger: true -->`.
