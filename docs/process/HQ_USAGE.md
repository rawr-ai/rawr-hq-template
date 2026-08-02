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
   - `bun run test` for the complete project-owned behavior graph.
   - `bun run test:web` for a focused web-only run.
5. Commit scoped changes.
6. For stack drains or cross-repository interface acceptance, follow
   [[docs/process/HQ_OPERATIONS]] and [[docs/process/CROSS_REPO_WORKFLOWS]].

## CLI Development And Installation

Run the Oclif application from a clean Template checkout through the
repository-owned script:

```bash
bun run rawr -- --version
bun run rawr -- --help
```

The ordinary Oclif CLI package is built by one landed fixed Nx Release group,
and its complete packed runtime closure passes installation acceptance in a
disposable prefix. Public registry publication and registry-installed smoke
remain pending npm scope authorization. Until those complete, use the
repository-local command rather than fabricating an installed release. Do not
run the removed custom installer, selector, release store, or launcher. A
previously installed custom distribution may remain executable, but it is
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
the remote-identity guard and runs `bun run check`. The root command starts one
Nx graph over every admitted non-root project's public check. Shared defaults
connect each check to one workspace-owned `habitat:lint`, project-owned
typecheck, optional owner verification, Habitat policy, and dependency checks.
Repository separation, CLI Oclif parity, and Habitat project/source policy
remain qualified owner work. Habitat's inferred owner targets own the workspace
scheduler law, required Oclif structure laws, and lifecycle command-channel law.
Habitat targets are cacheable only when their Nx inputs cover every Git-visible
tree the rule inspects; see [[NX_AGENT_WORKFLOW]]. Domain behavior tests remain
owner-local `test` targets rather than hidden `check` dependencies. Protected
CI adds those explicit targets through the root `ci` graph.

Every current non-root project owns a public check. The installed Habitat Nx
plugin infers rule targets, owner-local policy composition, inputs, caching,
and graph dependencies from `.habitat/**`; do not add a script-backed graph
rule or hand-maintained selector.

Habitat evaluation uses the exact Template-owned `@habitat-ai/cli` npm release
pinned by package version and lockfile integrity. Template owns both the
released package source and its `.habitat` policy tree, while Nx bootstrap
loads only the installed package face.

The `Repository Ratchet` workflow runs `bun run ci:affected` for pull requests
against the exact checked-out merge candidate. Nx composes the affected
`build`, `check`, and `test` graph, including affected dependents and declared
task prerequisites. Merge-queue candidates, when used, and pushes to `main`
run the full `bun run ci` graph. Local hooks are useful feedback but can be
bypassed. Protected `main` must therefore require the exact job context
`Required lint, typecheck, and topology`; that stable legacy name is the
branch-protection identity even though the graph also includes builds and
behavior tests. Remote branch protection is the enforcement authority for
merging.
