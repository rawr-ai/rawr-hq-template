# Maintenance Cadence

This playbook defines ongoing doc/process hygiene for `RAWR HQ-Template`.

## Weekly Doc-Health Check

Run from repo root:

```bash
git status --short
gt trunk
./scripts/dev/check-remotes.sh
rawr doctor global --json
rg -n "upstream sync|merge-first|template-managed paths|rawr plugins converge|rawr plugins doctor links" README.md AGENTS.md AGENTS_SPLIT.md CONTRIBUTING.md UPDATING.md docs scripts --glob '!docs/_archive/**' --glob '!**/quarantine/**' --glob '!openspec/changes/**' --glob '!docs/process/MAINTENANCE_CADENCE.md'
rg -n "\]\(([^)#]+)\)" docs --glob '*.md'
```

Interpretation:
- `git status` must be clean before and after the check.
- `gt trunk` must print `main`.
- `check-remotes.sh` must pass.
- `doctor global` should report one verified installed controller release and no
  checkout owner.
- The first `rg` command should return no active repository-sync, tree-preservation,
  or removed lifecycle-command guidance outside archive/quarantine/provenance.
- The second `rg` command is a quick markdown-link surface scan used before deeper audits.

## Monthly Interface Rehearsal

Use disposable homes and an immutable content fixture to verify:

1. the exact installed Template tool accepts the declared schema/protocol version;
2. content and governed record digests bind the result;
3. no personal executable mirror or cross-repository workspace link exists;
4. repeated convergence performs no writes.

## Routing Change Contract

If a docs cleanup changes router topology (`AGENTS.md` placement, additions, removals, replacements):

1. Update `docs/projects/_archive/agent-readiness/AGENTS_COVERAGE_MATRIX.md`.
2. Add a dated addendum entry in `docs/projects/_archive/agent-readiness/FINAL_REPORT.md`.
3. Update any affected pointers in root/scoped `AGENTS.md` files.

Do not land router changes without all three updates.
