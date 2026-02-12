# Promotion Matrix: Personal HQ -> Template Core

This matrix drives the one-time bootstrap promotion from `rawr-hq` into `rawr-hq-template`.

Scope rule:
- Promote shared/core infra (`apps/cli/**`, `packages/**`, `plugins/cli/plugins/**`, shared hooks, baseline process docs).
- Keep personal-only operational content and scratch artifacts.

## Commit Classification

| Commit | Subject | Decision | Notes |
| --- | --- | --- | --- |
| `76eb98b` | docs(plans): add plugin-structure implementation scratch plan | Keep personal | planning scratch only |
| `ee87baa` | refactor(plugins): move HQ ownership and rename toolkit package | Mixed (selective promote) | promote `plugins/cli/plugins/**`; keep `plugins/agents/hq/**` |
| `ad94156` | refactor(cli): cut over plugin commands to toolkit surfaces | Promote | core command surface + toolkit command tree |
| `655c5a4` | chore(cli): load plugins toolkit deterministically | Promote | core loader + agent-sync behavior |
| `5251829` | refactor(cli): finalize plugins command cutover tests | Mixed (selective promote) | promote core tests/docs; skip personal project notes |
| `2d901aa` | docs(plugins): align command-surface docs to cutover | Mixed (selective promote) | promote canonical root/process docs; skip personal scratch docs |
| `26157b4` | docs(archive): move legacy plugin planning docs to _archive | Keep personal | archive cleanup only |
| `0d51261` | feat(sync): add explicit drift check command and pre-commit guard | Promote | core drift command + hook baseline |
| `93c29a8` | fix(sync): treat claude already-enabled variants as idempotent | Promote | shared package correctness fix |
| `883fd54` | docs(plugin-lifecycle): add verbatim plan and scratchpad | Keep personal | initiative scratch only |
| `df0c6b2` | feat(plugins): add install-state drift assessment engine | Promote | core install drift engine |
| `42319b1` | feat(plugins): add unified status command for sync and install drift | Promote | core status command + tests |
| `89387f7` | feat(plugins): reconcile CLI install state during sync by default | Promote | core sync default behavior |
| `6868893` | feat(plugins): default to strict metadata drift and gc convergence | Promote | core sync semantics + metadata normalization |
| `13b9601` | feat(plugins): add install repair flow with legacy overlap hard-block | Promote | core repair/hard-block behavior |
| `0f3f6ec` | docs(plugins): align hooks and runbooks to unified status workflow | Promote (docs/hooks subset) | promote baseline process/hook docs |
| `8d571b2` | docs(plugins): add autonomy readiness scorecard | Promote | baseline operator health runbook |
| `0def0f9` | docs(process): add transition scratch plan for template-owned core flow | Keep personal | transition scratch tracker |

## Planned Port Slices (Template Repo)

1. `phase1-topology-cutover`
- Selective port from `ee87baa`, `ad94156`, `655c5a4`.
- Include `plugins/cli/plugins/**`, `apps/cli/**` core command cutover files, `packages/agent-sync/**` changes required by loader/cutover.

2. `phase2-drift-status-reconcile`
- Port `0d51261`, `93c29a8`, `df0c6b2`, `42319b1`, `89387f7`, `6868893`, `13b9601`.
- Include core tests that assert drift/status/sync behavior.

3. `phase3-docs-hooks-ops`
- Selective port from `5251829`, `2d901aa`, `0f3f6ec`, `8d571b2`.
- Include canonical docs/runbooks and `scripts/githooks/pre-commit` baseline.

## Exclusions (Do Not Promote)

- `plugins/agents/hq/**`
- `docs/projects/plugin-lifecycle-quality/**`
- personal operational/scratch project docs under `docs/projects/**` unless explicitly re-authored as template baseline.

## Validation Gates

- `bun install`
- `bun run typecheck`
- targeted tests for plugin status/sync drift/install reconcile command flows
- `bun run test` (or equivalent full suite required by repo policy before submit)

