# DevOps Migration Next Packet

Status: `integration-reviewed handoff`.
Branch: `agent-devops-workstream-b-devops-migration`.

## What Landed

The lane moved DevOps from a downstream personal-only pattern into upstream
template-owned service architecture:

- `services/dev`: service-owned DevOps behavior and contracts.
- `packages/dev-node`: reusable Node resource adapter.
- `plugins/cli/devops`: thin CLI projection.
- `apps/cli`: real command-surface registration for `rawr dev ...`.

The implementation followed `agent-config-sync` as the reference pattern:
service owns behavior, CLI owns projection, Node binding owns side effects.

## Commands Added

- `rawr dev stack doctor`
- `rawr dev stack drain`
- `rawr dev repo sync-upstream`
- `rawr dev worktree cleanup`

All mutating commands plan by default and require `--apply`.

## Integration DRA Repairs

- DevOps command execution now returns structured failed results for missing
  commands, spawn errors, and command timeouts.
- HQ status now bounds external process probes so the full CLI suite cannot
  wedge on a slow `lsof`/port probe.
- Full `@rawr/cli:test` passed after these repairs.

## Before Submit

Integration DRA reran Graphite stack-position inspection and focused gates
after the lane handoff. Before any future resubmit or repair, rerun:

```bash
git status --short --branch
gt ls
gt log --all
```

Then rerun the focused gates if desired:

```bash
TMPDIR=/private/tmp bunx nx run-many -t typecheck --projects=@rawr/dev,@rawr/dev-node,@rawr/plugin-devops,@rawr/cli --skip-nx-cache
TMPDIR=/private/tmp bunx nx run @rawr/dev:test --skip-nx-cache
TMPDIR=/private/tmp bunx nx run @rawr/dev-node:test --skip-nx-cache
TMPDIR=/private/tmp bunx nx run @rawr/plugin-devops:test --skip-nx-cache
TMPDIR=/private/tmp bunx vitest run --project cli apps/cli/test/devops-command-surface.test.ts
TMPDIR=/private/tmp bunx nx run @rawr/cli:test --skip-nx-cache
```

## Downstream Sunset

Do not delete downstream `RAWR HQ` DevOps code until this template branch lands
and is synced into personal `RAWR HQ`.

After sync, the downstream sunset lane should:

1. Verify the downstream CLI exposes the template-provided commands:
   - `rawr dev stack doctor`
   - `rawr dev stack drain`
   - `rawr dev repo sync-upstream`
   - `rawr dev worktree cleanup`
2. Remove or retire downstream duplicate implementation paths:
   - `packages/dev/**`
   - `plugins/cli/devops/**`
3. Remove downstream app/plugin registrations and package dependencies that
   still point at the local duplicate DevOps package/plugin.
4. Update downstream lockfile state after dependency removal.
5. Update downstream ownership/process docs that still describe DevOps as
   personal-owned, including:
   - `AGENTS_SPLIT.md`
   - `scripts/githooks/template-managed-paths.txt`
   - `plugins/cli/devops/README.md` if preserved as archived provenance
   - `plugins/cli/devops/AGENTS.md` if preserved as archived provenance
6. Re-run downstream command-surface and ownership checks before deleting any
   archived/provenance material.
