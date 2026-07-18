# Maintenance Cadence

This playbook defines ongoing doc/process hygiene for `RAWR HQ-Template`.

## Weekly Doc-Health Check

Run from repo root:

```bash
git status --short
gt trunk
./scripts/dev/check-remotes.sh
rawr doctor global --json
bun run ratchet:required
rg -n "\]\(([^)#]+)\)" docs --glob '*.md'
```

Interpretation:
- `git status` must be clean before and after the check.
- `gt trunk` must print `main`.
- `check-remotes.sh` must pass.
- `doctor global` should report one verified installed controller release and no
  checkout owner.
- Root lint and typecheck must cover every Nx project that declares those
  targets; no hand-maintained project inventory should narrow the population.
- The Habitat gate must positively close the lifecycle service/module,
  command-channel, and dependency-direction axes.
- The `rg` command is a quick markdown-link surface scan used before deeper audits.
- Protected `main` must require
  `Repository Ratchet / Required lint, typecheck, and topology`. A local
  pre-push pass is useful feedback but is not merge authority.

## Monthly Interface Rehearsal

Use disposable homes and an immutable content fixture to verify:

1. the exact installed Template tool accepts the declared schema/protocol version;
2. content and governed record digests bind the result;
3. no personal executable mirror or cross-repository workspace link exists;
4. repeated convergence performs no writes.

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
