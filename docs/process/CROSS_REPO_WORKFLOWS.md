# Cross-Repo Workflows (`RAWR HQ-Template` + `RAWR HQ`)

This is the canonical workflow model for operating both repos on one machine.

## Repo Roles (non-negotiable)

- `RAWR HQ-Template` owns shared CLI/core contracts and template baseline.
- `RAWR HQ` owns operational plugin authoring, local customization, and personal workflows.
- Shared HQ/plugin-management baseline is template-owned in:
  - `plugins/agents/hq/**`
  - `plugins/cli/plugins/**`
  - shared package surfaces (explicitly listed in `scripts/githooks/template-managed-paths.txt`)
- Personal mechanical dev workflows (stack/worktree orchestration) are personal-owned in `packages/dev/**` and `plugins/cli/devops/**`.

## Journey 1: Create an Operational Plugin

1. Work in personal repo: `rawr-hq`.
2. Scaffold plugin with `rawr plugins scaffold ...`.
3. Build/test locally.
4. Enable via `rawr plugins web ...`.
5. Publish from personal repo only if needed.

Do not create operational plugins in template.

## Journey 2: Promote Shared Core Change

1. Prove behavior in personal repo if needed.
2. Implement shared contract change in template repo.
3. Land via Graphite stack.
4. Sync template -> personal using sync branch flow.

## Journey 3: Sync Template into Personal

Use `docs/process/UPSTREAM_SYNC_RUNBOOK.md` in personal repo.
Use merge-first as the only normal flow.
Rebase is escape-hatch only when merge is blocked by a concrete constraint.

## Journey 4: Global CLI Ownership Switching

Global `rawr` owner is explicit.

```bash
# in desired checkout
./scripts/dev/activate-global-rawr.sh
rawr doctor global --json
```

Hooks refresh global wiring only when the current checkout is the active owner.

## Remote Safety Rails

- `scripts/githooks/pre-push` blocks wrong-remote pushes.
- `scripts/dev/check-remotes.sh` validates expected remote topology.

## Template-Managed Path Guard (Downstream Personal Repo)

- Manifest: `scripts/githooks/template-managed-paths.txt`.
- Hook implementation: `scripts/githooks/check-template-managed.ts` (invoked from `pre-commit`).
- Purpose: prevent accidental personal-repo commits to template-owned core surfaces.
- HQ/plugin-management ownership split is path-based and explicit:
  - template-managed full HQ agent office under `plugins/agents/hq/**`
  - template-managed plugin lifecycle/runtime toolkit under `plugins/cli/plugins/**`
  - template-managed shared packages are explicit and intentionally exclude `packages/dev/**`
- Modes:
  - `off`: disabled
  - `warn` (default): warn and continue
  - `block`: fail commit
- Controls:
  - `RAWR_TEMPLATE_GUARD_MODE=off|warn|block`
  - `git config rawr.templateGuardMode <off|warn|block>`
  - Optional owner-default block:
    - `git config rawr.templateGuardOwnerEmail <you@example.com>`
    - `git config rawr.templateGuardOwnerMode block`

## Command Surface Invariant

- Channel A: `rawr plugins ...`
- Channel B: `rawr plugins web ...`

Never mix command families in docs or scripts.

## Shared Convergence Baseline

Across both repos, use these plugin-management checks before/after cross-repo sync:
- `rawr plugins doctor links --json`
- `rawr plugins status --checks all --json`
- `rawr plugins converge --json`
