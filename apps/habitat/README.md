# `@habitat-ai/cli`

Habitat's Oclif CLI and native Nx integration. The package owns the portable
repository preset, Habitat policy projection, and the public `habitat` command.

## External Oclif Extensions

The CLI composes Oclif's native extension lifecycle without wrapping or
reimplementing it:

```sh
habitat plugins --help
```

`@oclif/plugin-plugins` owns listing, installation, linking, inspection,
updates, reset, uninstallation, aliases, and its native per-user state.

## Curated Agent Plugins

`habitat agent plugins check|package|status|sync|test|vendors update` projects
the platform lifecycle service. Use each command's native `--help` for its
closed request shape. Content repositories, immutable Git identities, provider
homes and package outputs are explicit inputs, not executable plugin discovery.

Current-main consumes `.habitat/agent-plugin-lifecycle/channels/current-main.json`
and the selected commit's `.habitat/release-input.json`. Older `.rawr` paths are
not fallback aliases. Publishing these records in Marketplace is a separate
repository-owner adoption action; installing the CLI does not migrate them.

Technical telemetry defaults to disabled. `HABITAT_TELEMETRY` accepts explicit
JSON matching the SDK's `OpenTelemetryNodeConfigSchema`, excluding
`processIdentity`, which the app supplies. Enabled configuration specifies all
three OTLP HTTP signal URLs, headers, timeouts and export settings. It is read
only after native command admission; help and parser refusals acquire nothing.
Telemetry configures transport, not a HyperDX/ClickHouse backend or product
analytics pipeline.

## Development Operations

The four generic operations use native Git and Graphite through the selected
Effect Platform Node resources:

```sh
habitat dev repo sync-upstream
habitat dev stack doctor
habitat dev stack drain
habitat dev worktree cleanup --prefix wt- --trunk main
```

Commands target `--repository <path>` or the invoking directory. Mutators plan
by default; `--apply` executes and `--dry-run` overrides it. Optional repeated
`--scratch-file` inputs check only those files, with warning or explicit
`--scratch-mode block`; Habitat assumes no personal document layout.

Upstream sync fast-forwards the current checkout from its Git-configured upstream
or paired `--remote`/`--branch` override. It creates no integration branch and
does not maintain Graphite ancestry. Cleanup requires an explicit local trunk,
preserves current/pinned/detached/locked/trunk worktrees and defaults to merged
branches only. A failed native removal stops the remaining removals; there is no
force removal or branch deletion.

Stack drain submits the current downstack and requests one native Graphite
merge. `Requested` means accepted submission, not completed merging. After the
operator or workstream verifies actual merge completion, use Graphite's native
`gt sync --force --no-restack --no-interactive` once. The forced sync has native
repository-wide update/cleanup scope; protect unrelated work before invoking it.
Habitat does not implement a polling, resubmission or automatic cleanup loop.

## Create A Repository

Nx invokes the package's Bun-only `preset` generator while creating the workspace:

```sh
bunx create-nx-workspace@23.1.1 my-workspace \
  --preset=@habitat-ai/cli \
  --packageManager=bun
```

Nx initializes Git after the preset returns. Activate the repository hooks once
that boundary exists:

```sh
cd my-workspace
bunx nx generate @habitat-ai/cli:init --no-interactive
```

The preset creates generic Bun, Nx, TypeScript, Biome, and Habitat scheduler
configuration. It does not copy blueprints, select product policy, or author the
repository's `AGENTS.md` hierarchy.

## Adopt An Existing Bun Nx Repository

```sh
bunx nx add @habitat-ai/cli --no-interactive
```

`nx add` invokes `init`. Existing nonempty hooks and unrelated Nx/Codex
configuration remain consumer-owned. A Bun repository may additionally invoke the
`preset` generator to adopt the portable repository spine.

Later package releases use ordinary Nx migrations:

```sh
bunx nx migrate @habitat-ai/cli@latest
bun install
```

The first command updates the fixed CLI/SDK pair and writes any applicable
Habitat migrations. If Nx generated a nonempty migration plan, review it and
apply those package-owned repository changes:

```sh
bunx nx migrate --run-migrations=migrations.json
```

A package-only upgrade may correctly generate no migration file. Do not replay
an older plan or synthesize one. No consumer copies or independently maintains
the preset wiring.

Habitat `0.5.3` used Nx `23.1.0`, whose provenance reader predates npm 12. When
that exact historical pair is upgraded under npm 12, pin the migration CLI and
scope Nx's documented compatibility flag to both migration commands. The first
command generates the migration; the install materializes the released pair;
the final command applies the repository changes:

```sh
NX_MIGRATE_CLI_VERSION=23.1.1 NX_SKIP_PROVENANCE_CHECK=true \
  bunx nx migrate @habitat-ai/cli@0.6.0
bun install
NX_MIGRATE_CLI_VERSION=23.1.1 NX_SKIP_PROVENANCE_CHECK=true \
  bunx nx migrate --run-migrations=migrations.json --no-interactive
```

Only the historical Nx `23.1.0` upgrade needs that compatibility scope. Nx
`23.1.1` and later verify provenance normally.
