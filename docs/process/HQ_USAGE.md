# RAWR HQ Usage Guide

This guide targets maintainers working inside `RAWR HQ-Template`.

## Daily Workflow

1. Pull latest local branch.
2. Run the local HQ runtime and targeted dev tasks as needed:
   - use [[docs/process/runbooks/HQ_RUNTIME_OPERATIONS]] for
     `rawr hq up|down|status|restart|attach`, browser behavior, and runtime checks
   - use [[docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW]]
     before relying on quarantined telemetry proof docs
3. Maintain shared core/template contracts.
4. Run tests for touched areas:
   - `bun run test` for the fast default gate.
   - `bun run test:web` when touching the web-only lane (without the pretest build gate).
5. Commit scoped changes.
6. For stack drains or cross-repository interface acceptance, follow
   [[docs/process/HQ_OPERATIONS]] and [[docs/process/CROSS_REPO_WORKFLOWS]].

## CLI Development And Installation

During the distribution transition, run the Oclif application from a clean
Template checkout through the repository-owned script:

```bash
bun run rawr -- --version
bun run rawr -- --help
```

The intended distribution is an ordinary Oclif CLI package built and published
by one fixed Nx Release group. That package group is not active yet, so do not
fabricate package metadata or treat the current workspace closure as releasable.
Do not run the removed custom installer, selector, release store, or launcher.
A previously installed custom distribution may remain executable, but it is
obsolete and is not invoked, updated, or accepted as current CLI authority.

## Plugin Boundaries

- Template fixtures validate official Oclif commands and generic lifecycle behavior; they are not
  personal curated content.
- External Oclif extension management uses `rawr plugins ...` only.
- Curated agent-plugin source and records live in personal `RAWR HQ`; their
  lifecycle uses `rawr agent plugins ...` only.
- App, web, and runtime composition remain outside this lifecycle and cannot
  repair, rewrite, or substitute for it.

## Publishing

Before publishing a plugin:
- Run `bun run build`
- Run `bun run test`
- Run `bun run test:web` if the change affects the web-only lane
- Verify package metadata and docs.

Personal content publication is independent and consumes only published versioned
interfaces or immutable artifacts. Follow [[UPDATING]] for interface updates.

## Auto-Refresh On Main Updates

`bun install` enables the shipped hooks through the root `prepare` script. To
repair a clone that installed with lifecycle scripts disabled, run:

```bash
git config core.hooksPath scripts/githooks
```

Then `post-merge` and `post-checkout` may refresh repository dependencies. They do
not publish or install the CLI. `pre-push` preserves
the remote-identity guard and runs `bun run check`. The root command runs
affected Nx `lint` and `typecheck`, then invokes `repository:check`.
`repository:check` composes project admission and repository separation,
`habitat:check`, and the CLI Oclif boundary check. `habitat:check` composes its
owner's lint, typecheck, and tests with repository hygiene and one selected
green local Habitat policy batch; that batch owns the required Oclif structure
laws and lifecycle command-channel law.
Habitat targets are cacheable only when their Nx inputs cover every Git-visible
tree the rule inspects; see [[NX_AGENT_WORKFLOW]]. Domain behavior tests remain
owner-local verification rather than hidden merge-admission work.

This is a deliberate transitional hierarchy. Do not claim that every Habitat
rule or every project-owned `check` target is active. Civ-style all-project
composition follows only after every applicable project has a `check` target
or Habitat Nx inference supplies it.

Habitat evaluation uses a checksum-pinned standalone binary owned by a Civ7
release and compiled with Bun 1.4. `scripts/habitat/release.json` binds its
source provenance, platform asset, byte size, and SHA-256; this repository owns
only the consumer and `.habitat` policy tree and does not vendor SDK sources.

The `Repository Ratchet` workflow runs `bun run check` for pull requests,
merge groups, and pushes to `main`. Local hooks are useful feedback but can be
bypassed. Protected `main` must therefore require the exact job context
`Required lint, typecheck, and topology`; remote branch protection is the
enforcement authority for merging.
