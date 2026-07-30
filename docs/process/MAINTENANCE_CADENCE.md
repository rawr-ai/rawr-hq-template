# Maintenance Cadence

This playbook defines ongoing doc/process hygiene for `RAWR HQ-Template`.

## Weekly Doc-Health Check

Run from repo root:

```bash
git status --short
gt trunk
./scripts/dev/check-remotes.sh
bun run rawr -- --version
bun run check
rg -n "\]\(([^)#]+)\)" docs --glob '*.md'
```

Interpretation:
- `git status` must be clean before and after the check.
- `gt trunk` must print `main`.
- `check-remotes.sh` must pass.
- The repository-local Oclif CLI must start from the checked-out Template source.
  This is development verification, not registry-installed acceptance. The fixed
  Nx Release group and packed-install acceptance are landed; public registry
  publication and registry-installed smoke remain pending. The obsolete
  predecessor distribution is not invoked, checked, or updated.
- The root check must schedule every admitted non-root project's plain public
  check once; no hand-maintained project inventory may narrow that population.
- Shared defaults must preserve one workspace lint task, project-owned
  typecheck, optional owner verification, Habitat policy, and dependency
  checks. The root scheduler and single lint relationship belong to Habitat's
  `nx-workspace` rule; CLI Oclif parity remains with the CLI owner. Required
  Oclif structure, repository-script topology, and lifecycle command-channel
  laws belong to Habitat's inferred owner targets. Template and Personal remain
  independent repositories rather than a source-scanner relationship.
- `habitat:check` must run workspace lint and the inferred owner-local policy
  graph.
- Every registered rule is enforced with an empty baseline. Unfinished laws
  remain candidate packets under `.habitat/staged/**`, outside discovery.
- Do not replace the installed Habitat Nx plugin with a packet-local script,
  alternate runner, or hand-maintained rule list.
- The `rg` command is a quick markdown-link surface scan used before deeper audits.
- Protected `main` must require the job context
  `Required lint, typecheck, and topology` published by the
  `Repository Ratchet` workflow. A local pre-push pass is useful feedback but is
  not merge authority.

## Monthly Interface Rehearsal

After the package group is published and the registry-installed smoke passes,
use disposable homes and an exact content fixture to verify:

1. the exact ordinarily installed Template CLI accepts the declared
   schema/protocol version;
2. the personal content commit/tree and governed record digests bind the result;
3. no personal executable mirror or cross-repository workspace link exists;
4. repeated convergence performs no writes.

Until publication and the registry-installed smoke both complete, run only the
equivalent repository-local compatibility checks through
`bun run rawr -- ...`; do not promote them as installed settlement.

When advancing Habitat, accept only a reviewed Civ7-owned package release.
Update the exact `@habitat/cli` release URL and lockfile integrity, realize its
package-local Grit dependency, then run the public required check:

```bash
bun run check
```

Do not copy the Habitat SDK source tree into this repository. RAWR HQ-Template
owns only its positive `.habitat` policy tree and package consumer.

## Routing Change Contract

If a docs cleanup changes router topology (`AGENTS.md` placement, additions, removals, replacements):

1. Update [[docs/projects/_archive/agent-readiness/AGENTS_COVERAGE_MATRIX]].
2. Add a dated addendum entry in
   [[docs/projects/_archive/agent-readiness/FINAL_REPORT]].
3. Update any affected pointers in root/scoped `AGENTS.md` files.

Do not land router changes without all three updates.
