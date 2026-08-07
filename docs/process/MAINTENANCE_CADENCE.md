# Maintenance Cadence

This playbook defines ongoing document and process hygiene for Habitat.

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
- The repository-local Oclif CLI must start from checked-out owner source.
  Habitat graph bootstrap is different: it must resolve the exact
  registry-installed `@habitat-ai/cli` package selected by `package.json` and
  `bun.lock`, never a workspace-source fallback.
- The root check must schedule every admitted non-root project's plain public
  check once; no hand-maintained project inventory may narrow that population.
- Shared defaults must preserve one workspace lint task, project-owned
  typecheck, optional owner verification, Habitat policy, and dependency
  checks. The root scheduler and single lint relationship belong to Habitat's
  `nx-workspace` rule; CLI Oclif parity remains with the CLI owner. Required
  Oclif structure, repository-script topology, and lifecycle command-channel
  laws belong to Habitat's inferred owner targets. Habitat, Rawr, and
  Marketplace remain independent repositories rather than a source-scanner
  relationship.
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

Use disposable homes and an exact content fixture to verify:

1. the exact canonical Rawr private application accepts the declared released
   Habitat interface and schema/protocol version through its Nx-owned execution path;
2. the Marketplace content commit/tree and governed record identities bind the result;
3. no Rawr or Marketplace executable mirror or cross-repository workspace link exists;
4. repeated convergence performs no writes.

When advancing Habitat, publish a reviewed Habitat-owned Nx release group
through [[../../.github/workflows/publish-habitat.yml|the trusted Habitat
workflow]]. Update the exact `@habitat-ai/cli` version and lockfile integrity,
apply the released initializer, then run the public required check:

```bash
bun run check
```

Habitat owns its source, releases, policy, and self-host consumer
binding. Keep those roles explicit: source builds the package, npm transports
it, and the installed Nx plugin activates it.

## Routing Change Contract

If a docs cleanup changes router topology (`AGENTS.md` placement, additions, removals, replacements):

1. Update [[docs/projects/_archive/agent-readiness/AGENTS_COVERAGE_MATRIX]].
2. Add a dated addendum entry in
   [[docs/projects/_archive/agent-readiness/FINAL_REPORT]].
3. Update any affected pointers in root/scoped `AGENTS.md` files.

Do not land router changes without all three updates.
