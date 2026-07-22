# Maintenance Cadence

This playbook defines ongoing doc/process hygiene for `RAWR HQ-Template`.

## Weekly Doc-Health Check

Run from repo root:

```bash
git status --short
gt trunk
./scripts/dev/check-remotes.sh
bun run rawr -- --version
bun run ratchet:required
rg -n "\]\(([^)#]+)\)" docs --glob '*.md'
```

Interpretation:
- `git status` must be clean before and after the check.
- `gt trunk` must print `main`.
- `check-remotes.sh` must pass.
- The repository-local Oclif CLI must start from the checked-out Template source.
  This is development verification, not installed-package acceptance. The fixed
  Nx Release group and ordinary installation path remain pending, and the
  obsolete predecessor distribution is not invoked, checked, or updated.
- The Nx project-graph admission check must prove that every non-root project
  has exactly one `type:*` kind and every code project owns lint and typecheck
  targets; only projects classified as content or fixtures are exempt from
  those targets.
- The Nx admission tests must cover accepted, missing-kind, ambiguous-kind,
  missing-target, and invalid-graph transitions.
- Affected lint and typecheck must cover every changed admitted project; no
  hand-maintained project inventory may narrow the population.
- The repository-wide Biome formatting, lint, and import-organization check and
  the Habitat consumer integrity tests must pass through their Nx owners.
- The repository-separation guard must pass.
- The required Habitat gate must positively close the current curated and
  external command-channel topology against the live candidate; it is
  deliberately not cached. Do not claim generic service/Oclif live-tree
  enforcement until its separately tracked bounded gate is active.
- The `rg` command is a quick markdown-link surface scan used before deeper audits.
- Protected `main` must require the job context
  `Required lint, typecheck, and topology` published by the
  `Repository Ratchet` workflow. A local pre-push pass is useful feedback but is
  not merge authority.

## Monthly Interface Rehearsal

After the fixed Nx Release package group is published, use disposable homes and
an exact content fixture to verify:

1. the exact ordinarily installed Template CLI accepts the declared
   schema/protocol version;
2. the personal content commit/tree and governed record digests bind the result;
3. no personal executable mirror or cross-repository workspace link exists;
4. repeated convergence performs no writes.

Until that release exists, run only the equivalent repository-local compatibility
checks through `bun run rawr -- ...`; do not promote them as installed settlement.

When advancing the Habitat binary, accept only a Civ7-owned standalone release
compiled with Bun 1.4. Update `scripts/habitat/release.json` with its immutable
source provenance, platform byte size, and SHA-256, then run:

```bash
bun run habitat:provision
bun run architecture:gate:agent-plugin-lifecycle
```

Do not copy the Habitat SDK source tree into this repository. RAWR HQ-Template
owns only its positive `.habitat` policy tree and checksum-pinned consumer.

## Routing Change Contract

If a docs cleanup changes router topology (`AGENTS.md` placement, additions, removals, replacements):

1. Update [[docs/projects/_archive/agent-readiness/AGENTS_COVERAGE_MATRIX]].
2. Add a dated addendum entry in
   [[docs/projects/_archive/agent-readiness/FINAL_REPORT]].
3. Update any affected pointers in root/scoped `AGENTS.md` files.

Do not land router changes without all three updates.
