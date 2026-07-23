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
  This is development verification, not installed-package acceptance. The fixed
  Nx Release group and ordinary installation path remain pending, and the
  obsolete predecessor distribution is not invoked, checked, or updated.
- The root check must schedule every admitted non-root project's plain public
  check once; no hand-maintained project inventory may narrow that population.
- Shared defaults must preserve lint, typecheck, optional owner verification,
  Habitat policy, and dependency checks. Project-kind and quality-target
  admission, repository separation, and CLI Oclif parity remain qualified owner
  work. Required Oclif structure laws and the lifecycle command-channel law
  belong to Habitat's selected policy batch.
- `habitat:check` must run Habitat-owner lint, typecheck, and tests,
  repository-wide hygiene, and the selected green local policy batch.
- The selected Habitat batch must keep empty baselines. Do not claim that all
  registered Habitat rules are required while known live-corpus failures remain
  outside the batch.
- Bounded graph admission must reject every new non-root project without a
  public check until native Habitat project admission replaces that reader.
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
source provenance, platform byte size, and SHA-256, then run the public required
check:

```bash
bun run check
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
