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

## Installed Controller Setup

Materialize and select an immutable controller release from a clean Template
revision:

```bash
./scripts/dev/install-global-rawr.sh
rawr --version
rawr doctor global --json
```

Mode contract:
- The global shim points to one stable Template-owned launcher under the controller
  data root, never a checkout.
- `install-global-rawr.sh` builds, verifies, installs, and selects a release.
- `activate-global-rawr.sh <digest>` selects an already installed verified release;
  it does not build from source.
- A checkout, hook, alias, or Oclif link cannot become controller identity.

## Plugin Boundaries

- Template fixtures validate controller and generic lifecycle behavior; they are not
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
not build, activate, or relink the installed controller. `pre-push` preserves
the remote-identity guard and runs `bun run ratchet:required`. Nx selects the
affected projects after an Nx-owned project-graph check proves that every
project has exactly one `type:*` kind and every code project owns lint and
typecheck targets. The same command runs the Nx admission tests, full Biome
check, Habitat consumer integrity tests, repository separation, and the
lifecycle service's live, non-cacheable Habitat `structure-check`; see
[[NX_AGENT_WORKFLOW]]. Domain behavior tests remain owner-local verification
rather than hidden merge-admission work.

Habitat evaluation uses a checksum-pinned standalone binary owned by a Civ7
release and compiled with Bun 1.4. `scripts/habitat/release.json` binds its
source provenance, platform asset, byte size, and SHA-256; this repository owns
only the consumer and `.habitat` policy tree and does not vendor SDK sources.

The `Repository Ratchet` workflow runs the same command for pull requests,
merge groups, and pushes to `main`. Local hooks are useful feedback but can be
bypassed. Protected `main` must therefore require the exact job context
`Required lint, typecheck, and topology`; remote branch protection is the
enforcement authority for merging.
