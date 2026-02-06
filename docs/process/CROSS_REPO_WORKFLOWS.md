# Cross-Repo Workflows (`RAWR HQ-Template` + `RAWR HQ`)

This is the canonical workflow model for operating both repos on one machine.

## Repo Roles (non-negotiable)

- `RAWR HQ-Template` owns shared CLI/core contracts and template baseline.
- `RAWR HQ` owns operational plugin authoring, local customization, and personal workflows.

## Journey 1: Create an Operational Plugin

1. Work in personal repo: `rawr-hq`.
2. Scaffold plugin with factory.
3. Build/test locally.
4. Enable via `rawr hq plugins ...`.
5. Publish from personal repo only if needed.

Do not create operational plugins in template.

## Journey 2: Promote Shared Core Change

1. Prove behavior in personal repo if needed.
2. Implement shared contract change in template repo.
3. Land via Graphite stack.
4. Sync template -> personal using sync branch flow.

## Journey 3: Sync Template into Personal

Use `docs/process/UPSTREAM_SYNC_RUNBOOK.md` in personal repo.
Default method is merge-based sync branch.

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

## Command Surface Invariant

- Channel A: `rawr plugins ...`
- Channel B: `rawr hq plugins ...`

Never mix command families in docs or scripts.
