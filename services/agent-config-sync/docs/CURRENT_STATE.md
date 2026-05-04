# Agent Config Sync Current State

Status: current operational state as of this branch.

This document is intentionally loud because the service is in a temporary
two-track state. Do not read package install success as proof of full Codex
parity yet.

## Current State: Two Tracks, Not Equal

Agent config sync currently has two Codex output tracks:

1. Direct sync into a Codex home.
2. Codex plugin package generation and package installation.

They pull from the same RAWR source material, but they do not produce the same
runtime result today.

Direct sync writes managed material directly into the selected Codex home:

- prompts
- runtime user skills
- scripts
- standalone Codex TOML agents
- hook scripts and `hooks.json` lifecycle entries
- MCP files and managed `config.toml` fragments
- settings/config fragments
- registry/GC metadata

Codex package/install writes an installable marketplace package and asks Codex
to install it. Today that package track carries a smaller surface:

- `.codex-plugin/plugin.json`
- `skills/`
- MCP config/files where modeled by the package lane
- assets/interface metadata
- marketplace metadata

The package track does not currently carry every surface that direct sync
carries. In particular, hooks, standalone custom agents, and settings/config
fragments are not package-installed today.

## Current Direction

The likely product direction is to make managed plugin/package installation the
primary route for both Codex and Claude: source material becomes a managed
plugin, and the provider install flow owns delivery instead of RAWR maintaining
long-lived direct filesystem synchronization for each provider.

That is the direction we are leaning, but it is not a committed product
decision yet. Before deprecating direct sync, come back and double-check that
managed package installation can carry the surfaces RAWR needs and has the
right install, update, uninstall, and rollback semantics.

Direct sync is very likely a transitional path that should eventually be
deprecated or narrowed, but it must not be removed yet.

## Why Package Install Is Not At Parity Yet

The package/install track is incomplete mostly because we did not finish this
as a dedicated agent-config-sync workstream.

This is not the same as saying "Codex cannot run hooks." Codex can run hooks
from its runtime config. The current gap is that the Codex plugin package loader
and the RAWR package writer do not yet model every direct-sync surface as a
package-installed plugin surface.

Remaining package/install parity work includes:

- Package-provided hooks: hook scripts, lifecycle config, install/update, and
  uninstall/GC behavior.
- Package-provided custom agents: the package equivalent of direct-sync
  standalone TOML agents, including semantic reporting for Claude-only fields.
- Package-provided settings/config fragments: especially config that direct
  sync currently merges into `config.toml`.
- MCP/settings reconciliation: MCP package support exists for modeled MCP
  files, but the package lane still needs a clear parity story for any
  provider config/settings behavior that direct sync currently owns.
- Reconciliation and deduplication between direct-sync outputs and
  package-installed outputs.

Treat this as a dedicated future workstream for `agent-config-sync`. Do not let
it become incidental cleanup inside an unrelated stack drain.

## Temporary Coexistence Requires Reconciliation

While both tracks exist, reconciliation is required.

Today, direct sync may leave managed files at top-level Codex-home runtime
locations such as:

- `<codex-home>/prompts`
- `<codex-home>/.agents/skills`
- `<codex-home>/scripts`
- `<codex-home>/agents`
- `<codex-home>/hooks/rawr/<plugin>`
- `<codex-home>/hooks.json`
- `<codex-home>/config.toml`
- `<codex-home>/mcp/rawr/<plugin>`
- `<codex-home>/plugins/registry.json`

Package install writes and installs plugin artifacts through the Codex plugin
system. These are different topologies.

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

These names describe the current and future model.

### Local Convergence

Where we are right now for full local Codex parity.

Direct sync mutates the selected Codex home so managed runtime files/config are
materially converged. This is the complete local parity path today.

### Package Validation

Where we are right now for Codex package/install.

Package generation and package install prove the managed plugin package lane for
the subset of surfaces it currently carries. It should be used only for isolated
package validation and not as proof that a real Codex home has full parity.

### Future Unified Mode

Where we likely want to go.

Everything becomes a managed provider plugin. Codex and Claude receive managed
plugins through their package/install routes. Direct sync is deprecated,
narrowed, or retained only as a migration/repair tool. Reconciliation retires
or absorbs old direct-sync material so package install does not duplicate or
fight previous direct-sync output.

This is the target direction, not the current state.

## Safety Warning

Do not use Codex package install as the real-home convergence path right now.

Running package install against a Codex home that already has direct-sync output
can create ambiguous or duplicated provider-visible material. It may leave the
operator with some surfaces coming from direct sync and some surfaces coming
from package install, with no completed reconciliation step to prove which
projection should win.

Until package/direct reconciliation exists, use package install only for
isolated validation or explicitly scoped experiments. Use direct sync for full
local convergence.

## Done For This Branch

This branch has reconciled the prior agent-config-sync parity split and
documented the current two-track state.

Park this branch after committing this document. Future work should open a
dedicated agent-config-sync package parity/reconciliation workstream instead of
keeping this branch open-ended.
