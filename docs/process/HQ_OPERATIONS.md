# RAWR HQ Operations Playbook

This file is the co-located Rawr product operations guide during extraction. It
is not Habitat platform architecture or distribution authority.

## Repository Boundary

- Run Habitat SDK, foundational Oclif CLI, generic runtime, tooling, blueprint,
  and platform-provider work in the Habitat repository.
- Run Rawr app composition, product Oclif topics, product services/resources,
  and product acceptance in the Rawr repository after extraction.
- Run curated content authoring, provenance/policy/evaluation checks, and
  governed content acceptance/release/channel records in Marketplace.
- Never merge, cherry-pick, transplant, mirror, or tree-compare executable roots
  between the repositories.
- Rawr and Marketplace may consume supported Habitat packages only through
  exact released interfaces. Neither receives Habitat implementation source.

## Command Boundary

- `rawr plugins ...` currently manages external Oclif extensions only.
- `rawr agent plugins ...` currently manages curated agent-plugin lifecycle
  only. Do not invoke the accepted Habitat command destination before the
  command, manifest, and policy migration lands.
- Invoke the private `rawr` application from its exact Rawr source revision with
  its Nx-owned target. Registry publication and package metadata establish
  released Habitat versions, Nx Release configuration defines membership, and
  release records preserve evidence. Do not reconstruct the retired custom
  distribution, selector, or global alias.
- App composition and repository hooks own no lifecycle mutation.

## Pre-Change Impact Check

- Is this reusable platform/runtime/tooling behavior? Put it in Habitat.
- Is this Rawr product behavior or composition? Put it in Rawr.
- Is this curated agent content or a governed decision about that content? Put it in Marketplace.
- Does a cross-repository need have an exact Habitat release, schema/protocol
  version, Rawr revision when relevant, and exact content identity?
- Would the proposed change create a copy, fallback, aggregate, or second state owner?

## Safety And Verification

For Habitat and Rawr changes, run each repository's affected Nx targets and
owner-local native acceptance. Distribution status comes from package metadata
and release records rather than this runbook. For Marketplace changes, run
repository-owned content checks and exact-version
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

1. bind the exact Rawr application revision, Habitat interface versions,
   schema/protocol version, Marketplace content commit/tree, and governed-record digests;
2. verify Rawr and Marketplace contain no Habitat executable mirror or workspace link;
3. reconcile only the explicitly named provider/export destination;
4. repeat the converged operation and prove it performs no writes.

Git commit/tree IDs may be recorded as audit provenance only.
