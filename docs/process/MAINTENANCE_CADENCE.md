# Maintenance Cadence

This playbook defines ongoing doc/process hygiene for `RAWR HQ-Template`.

## Weekly Doc-Health Check

Run from repo root:

```bash
git status --short
gt trunk
./scripts/dev/check-remotes.sh
rawr doctor global --json
rg -n "rawr plugins enable|rawr plugins disable|rawr plugins status|rawr plugins list" docs/PRODUCT.md docs/SYSTEM.md docs/PROCESS.md docs/ROADMAP.md docs/system docs/process apps plugins --glob '!docs/_archive/**' --glob '!docs/process/MAINTENANCE_CADENCE.md'
rg -n "\]\(([^)#]+)\)" docs --glob '*.md'
```

Interpretation:
- `git status` must be clean before and after the check.
- `gt trunk` must print `main`.
- `check-remotes.sh` must pass.
- `doctor global` should be healthy only when template checkout is intentionally activated as global owner.
- The first `rg` command should return no active Channel B misuse outside archive.
- The second `rg` command is a quick markdown-link surface scan used before deeper audits.

## Monthly Upstream-Sync Rehearsal (Personal Repo)

Run in `RAWR HQ` using:
- `docs/process/UPSTREAM_SYNC_RUNBOOK.md`

Required rehearsal:
1. One merge-based sync simulation branch.
2. Build + test verification for the merge simulation.
3. Cleanup of temporary rehearsal branches.

Rebase rehearsal is not part of routine cadence.
Only run rebase drills as an explicit incident/escape-hatch exercise.

## Routing Change Contract

If a docs cleanup changes router topology (`AGENTS.md` placement, additions, removals, replacements):

1. Update `docs/projects/_archive/agent-readiness/AGENTS_COVERAGE_MATRIX.md`.
2. Add a dated addendum entry in `docs/projects/_archive/agent-readiness/FINAL_REPORT.md`.
3. Update any affected pointers in root/scoped `AGENTS.md` files.

Do not land router changes without all three updates.
