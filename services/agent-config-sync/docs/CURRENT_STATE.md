# Agent Config Sync Current State

Status: current operational state as of this branch.

This document is intentionally loud because Codex has more than one native
surface. Do not read package install success as proof that every source
artifact is activated by the Codex plugin loader itself.

## Current State: Two Tracks, Not Equal

Agent config sync currently has three Codex output tracks:

1. Codex plugin package generation and package installation.
2. Native Codex custom-agent role config under `<codex-home>/agents/*.toml`.
3. Explicit generic destination projection/export for legacy mirrors.

They pull from the same RAWR source material, but the activation mechanism is
not identical for every material kind.

Native Codex plugin package/install writes an installable marketplace package
and asks Codex to install it. Today that package track activates:

- `.codex-plugin/plugin.json`
- `skills/`
- hook lifecycle config where the selected Codex binary exposes plugin hooks
- MCP config/files where modeled by the package lane
- assets/interface metadata
- marketplace metadata

Native Codex custom-agent role config writes managed TOML role files directly
to the selected Codex home:

- `<codex-home>/agents/<agent>.toml`
- the managed registry's `agents` ownership claim

Codex discovers those role TOMLs as native custom agents. This is not the same
as Codex plugin-package `agents/*.md` activation; plugin-packaged agent
markdown remains source/support material unless Codex later exposes a plugin
agent activation surface.

Generic destination projection/export can still write legacy mirrors:

- prompts
- runtime user skills
- scripts
- hook scripts and `hooks.json` lifecycle entries
- MCP files and managed `config.toml` fragments
- settings/config fragments
- registry/GC metadata

Those projection outputs are compatibility material, not the default native
deployment path.

## Current Direction

Native provider sync is now the default route for this operator.

For Codex that means two native surfaces are used together:

- Codex plugin package/install for active plugin package capabilities.
- Codex native-direct custom-agent role TOMLs under `<codex-home>/agents`.

For Claude that means the local plugin marketplace path.

Generic destination projection remains available only as an explicit
legacy/repair/migration lane via `--destination-projection`. Do not count it as
the native deployment path.

## Remaining Native-Surface Debt

The remaining debt is not "agents are unverified." Codex custom agents are
native through role TOML config, and this branch treats that surface as
native-direct provider config.

Known remaining debt:

- Codex `prompts/` output and supporting scripts are legacy/auxiliary mirrors.
  Reusable workflows should be migrated into skills over time.
- Claude commands remain a supported direct-invocation mirror, but Claude's
  richer repeatable workflow structure is skills.
- Codex plugin-package `agents/*.md` is source/support material today. Active
  Codex custom-agent activation is `<codex-home>/agents/*.toml`.
- Claude-only agent frontmatter such as `tools`, `model`, and `color` is not
  equivalent to Codex role TOML semantics and remains reported as semantic
  adaptation debt.
- Generic projection cleanup is intentionally narrow. It retires registry-owned
  residue superseded by successful native provider sync and preserves unmanaged
  files, source collisions, shared claims, and the shared runtime skill root.

## Temporary Coexistence Requires Reconciliation

While both tracks exist, reconciliation is required.

Today, legacy projection may leave managed files at top-level Codex-home runtime
locations such as:

- `<codex-home>/prompts`
- `<codex-home>/.agents/skills`
- `<codex-home>/scripts`
- `<codex-home>/hooks/rawr/<plugin>`
- `<codex-home>/hooks.json`
- `<codex-home>/config.toml`
- `<codex-home>/mcp/rawr/<plugin>`
- `<codex-home>/plugins/registry.json`

Package install writes and installs plugin artifacts through the Codex plugin
system. Native custom agents are installed through the Codex role config root.
These are different topologies.

If direct sync and package install come from the same RAWR source, the service
should reconcile them instead of producing duplicate downstream projections.
The intended future behavior is:

1. Package install reaches parity with direct sync.
2. Package installation can absorb or supersede material that was previously
   directly synced.
3. The service prevents duplicate runtime projections for the same source
   plugin.
4. Direct-sync material can be retired or narrowed once package-installed
   material is the source of truth.

This reconciliation capability is part of the work we want to do. It is not
complete today.

## Conceptual Modes

These names describe the current operating model.

### Native Provider Sync

Default mode. Codex receives plugin packages plus native agent role TOMLs.
Claude receives local plugin marketplace installs. Cleanup-behind can retire
registry-owned projection residue after native provider proof.

### Legacy Destination Projection

Explicit mode. `--destination-projection` writes compatibility mirrors into
provider homes. Use it for debugging, migration, or repair only; it is not a
provider-parity fallback.

### Export/Package Validation

Isolated validation mode. Package/export commands can inspect artifacts without
mutating provider homes.

## Operator Invocation Note

During the template-to-downstream migration, downstream local Oclif links may
point `@rawr/plugin-plugins` at downstream source. To force the template
operator to use this repository's workspace implementation without changing the
global Oclif link, run it with a clean Oclif data dir, for example:

```bash
XDG_DATA_HOME=/tmp/rawr-template-oclif-data \
  bun run rawr -- plugins sync all --source-workspace /path/to/rawr-hq ...
```

`bun run rawr -- plugins sync --help` should show native flags such as
`--codex-package`, `--codex-install`, `--codex-bin`,
`--destination-projection`, and `--cleanup-behind` before using the template
operator for release proof.

## Done For This Branch

This branch reconciles the prior agent-config-sync parity split around Codex
custom agents, cleanup-behind reporting, package capability claims, and
status/drift planning.
