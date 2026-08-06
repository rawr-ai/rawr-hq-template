# RAWR HQ Operations Playbook

This file is canonical for Template operational validation, transient failures,
and independent cross-repository acceptance.

## Repository Boundary

- Run Oclif CLI builds, generic lifecycle/tooling tests, provider-adapter tests,
  schema publication, and ordinary CLI packaging in `RAWR HQ-Template`.
- Run curated content authoring, provenance/policy/evaluation checks, and governed
  content acceptance/release/channel records in personal `RAWR HQ`.
- Never merge, cherry-pick, transplant, mirror, or tree-compare executable roots
  between the repositories.
- Personal may invoke supported Habitat packages only through an exact versioned
  interface. Template's private `rawr` application remains outside Personal.

## Command Boundary

- `rawr plugins ...` manages external Oclif extensions only.
- `rawr agent plugins ...` manages curated agent-plugin lifecycle only.
- Invoke the private `rawr` application from its exact Template revision with
  `bun run rawr -- ...`. Habitat `0.5.2` publication and registry-installed
  smoke are complete. The predecessor distribution, global alias, and legacy
  `@rawr/cli` data root are absent; do not reconstruct them.
- App composition and repository hooks own no lifecycle mutation.

## Pre-Change Impact Check

- Is this executable or generic lifecycle behavior? Put it in Template.
- Is this curated agent content or a governed decision about that content? Put it in personal.
- Does a cross-repository need have an explicit Template revision, Habitat or
  schema/protocol version, and exact content identity?
- Would the proposed change create a copy, fallback, aggregate, or second state owner?

## Safety And Verification

For Template changes, run the affected Nx targets and the relevant
repository-local Oclif acceptance. Habitat `0.5.2` package and registry smoke
are already complete; the private `rawr` application remains source/Nx invoked.
For Personal changes, run repository-owned content checks and exact-version
Habitat/interface validation. Mutating provider/Oclif acceptance uses explicit
disposable homes until its owning container authorizes settlement.

## Transient Test Failure Policy

1. Re-run the failing test once in isolation.
2. Re-run the full owning suite once.
3. Treat it as transient only if both reruns pass.
4. If reproducible, fix the root cause and re-run the full owning suite.
5. If still non-deterministic, stop promotion and record the command and observed state.

## Final Acceptance

For each repository independently:

1. canonical `main` is checked out and matches its own origin;
2. the worktree, Graphite stack, and auxiliary worktrees are clean/drained;
3. repository-owned build, test, lint, and architecture gates pass;
4. no lifecycle override or compatibility path is active.

For cross-repository protocol acceptance:

1. bind the exact Template private application revision, schema/protocol
   version, Personal content commit/tree, and governed-record digests;
2. verify personal contains no Template executable mirror or workspace link;
3. reconcile only the explicitly named provider/export destination;
4. repeat the converged operation and prove it performs no writes.

Git commit/tree IDs may be recorded as audit provenance only.
