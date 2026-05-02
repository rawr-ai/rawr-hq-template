# Agent Config Sync Testing Plan

Status: canonical testing plan for `@rawr/agent-config-sync`, its Node resource package, and the `rawr plugins sync ...` CLI projection. This plan lives with the service tests because the service owns sync semantics; CLI tests consume this contract only at the binding and orchestration layer.

## Core Claim

Agent config sync projects canonical RAWR plugin material into provider-specific destinations repeatedly and safely. RAWR stays source of truth; each provider receives an honest projection; managed ownership is precise; drift/status reports describe the managed sync contract without pretending unsupported provider features are aligned.

## Adequacy Standard

A change is not adequately tested until it has evidence for every guarantee category it touches:

1. Source workspace authority and provider overlay semantics.
2. Provider projection shape for Codex, Claude, Codex packages, and Cowork artifacts.
3. Drift detection and dry-run fidelity.
4. Managed ownership, GC, and stale-plugin retirement.
5. Full-convergence defaults and partial-mode guardrails.
6. CLI-owned package/install side effects.
7. Undo and bounded failure containment.
8. Multi-home, config, and environment resolution.
9. Operator output, JSON stability, and diagnosability.

Coverage is secondary. Each test should have an oracle: the observable behavior that proves a specific business guarantee or failure class.

## Guarantee Categories

### 1. Source Authority

Guarantee: the selected RAWR workspace is the authority for scanned plugin material. Extra source paths are additive; they do not replace workspace authority or mix the template repo with the personal source workspace by accident.

Prevent:

- scanning template plugin content when `--source-workspace` points to personal `rawr-hq`;
- syncing implementation internals from `src/**`;
- ignoring `package.json#rawr.pluginContent.contentRoot`;
- letting provider overlays mutate canonical source content;
- silently accepting malformed plugin-content manifests.

Oracle: resolved source-content DTOs and workspace plans contain exactly the expected plugin roots, logical material names, and provider-effective overlays.

### 2. Provider Projection Semantics

Guarantee: Codex, Claude, Codex plugin packages, and Cowork receive different provider-correct projections from the same canonical source.

Prevent:

- false parity, where tests only prove files were copied somewhere;
- Codex workflows landing in Claude command paths or Claude agents being copied directly into Codex;
- scripts colliding across plugins in shared Codex homes;
- Cowork ZIPs drifting from Claude-effective content;
- provider overlay changes leaking across providers.

Oracles:

- Codex direct mirror writes workflows to `prompts/`, skills to `skills/`, scripts to plugin-prefixed `scripts/`, optional standalone TOML agents to `agents/`, and ownership to `plugins/registry.json`.
- Claude local plugin sync writes commands, skills, scripts, agents, `.claude-plugin/plugin.json`, `.rawr-sync-manifest.json`, and marketplace metadata.
- Codex package artifacts include `.codex-plugin/plugin.json` and `skills/` only until runtime support for agents/hooks/MCP/settings is locally verified.
- Cowork artifacts are valid ZIPs with manifest summaries for commands, skills, scripts, and agents.

### 3. Drift And Dry-Run Fidelity

Guarantee: plan, drift, and dry-run predict mutating behavior without writing destination state.

Prevent:

- dry-run mutating files, registries, manifests, marketplace metadata, or package artifacts;
- drift reporting `IN_SYNC` when managed material differs;
- unmanaged extras being flagged as RAWR-owned drift;
- JSON summaries hiding material drift behind `ok: true`.

Oracle: dry-run snapshots are byte-for-byte unchanged, and planned action sets match the following apply.

### 4. Managed Ownership, GC, And Retirement

Guarantee: RAWR overwrites or deletes only material it owns.

Prevent:

- deleting unmanaged user files during GC;
- retiring a plugin that is active under a renamed or alternate source path;
- leaving stale managed material after full workspace convergence;
- treating corrupt metadata as permission to delete broadly.

Oracle: after GC or retirement, managed stale paths are removed, unmanaged neighbors remain unchanged, and reports distinguish removed, skipped, and preserved material.

### 5. Full-Convergence Policy

Guarantee: `rawr plugins sync all` is the deterministic daily convergence path, and partial behavior is explicit.

Prevent:

- disabling Cowork, Claude install, force, GC, install reconcile, or orphan retirement without `--allow-partial`;
- letting single-plugin sync inherit destructive full-sync defaults;
- adding a new side effect without updating partial-mode policy.

Oracle: service policy evaluation and CLI process tests agree on allowed, blocked, and intentionally partial commands.

### 6. CLI-Owned Package And Install Behavior

Guarantee: service semantics stay inside `@rawr/agent-config-sync`; host packaging and external install processes are bound by `@rawr/agent-config-sync-node` and orchestrated by `@rawr/plugin-plugins`.

Prevent:

- service tests depending on real Claude/Codex CLIs or user homes;
- Claude install/enable running during dry-run;
- package/install failures being hidden while sync claims full success;
- host resource packages re-owning service semantics.

Oracle: service tests use injected resources and temp homes; CLI tests fake process execution and assert rendered success/failure metadata.

### 7. Unsupported And Adapter-Required Semantics

Guarantee: unsupported provider capabilities are explicit. `IN_SYNC` means managed sync material is aligned, not that every Codex or Claude runtime feature in the source repo is fully installed.

Prevent:

- hooks, MCP, settings, or unverified plugin-provided agents being silently treated as synced;
- status output implying Codex cleanup/alignment for material the sync engine does not model;
- tests passing because unsupported material is ignored without a projection/status classification.

Oracle: every newly modeled material kind has a projection-summary assertion with `native`, `adapter_required`, `unsupported`, or `unknown` support status. Unsupported material must be either absent by contract or reported as unsupported; it must not be claimed as synced.

### 8. Undo And Failure Containment

Guarantee: mutating sync either completes with undo metadata or fails with bounded, diagnosable partial state.

Prevent:

- sync success without undo coverage for written/deleted paths;
- undo restoring files but not registries or marketplace metadata;
- mid-run failures leaving no changed/skipped destination report.

Oracle: after undo, destination snapshots match pre-sync snapshots; after injected failure, output identifies the changed set and avoids full-success claims.

## Fixture Matrix

Use generated temp fixtures unless a stable golden artifact is needed.

| Fixture | Purpose |
| --- | --- |
| `minimal-workflow` | smallest syncable plugin |
| `full-content` | workflows, skills, scripts, and agents |
| `provider-overlays` | base plus provider-specific overlays |
| `custom-content-root` | manifest root semantics |
| `include-mask` | class inclusion/exclusion |
| `external-source-workspace` | template CLI against personal-shaped source workspace |
| `managed-drift` | changed managed destination content |
| `unmanaged-neighbor` | ownership safety |
| `rename-delete` | stale managed retirement |
| `multi-home` | destination normalization and precedence |
| `failure-injection` | write/package/install containment |

## Layer Ownership

- Service tests in `services/agent-config-sync/test/` cover planning, provider-effective source content, execution into temp homes, drift assessment, retirement, undo, and pure policy.
- Node resource/package tests cover Codex package and Cowork ZIP artifacts without moving business policy out of the service.
- CLI tests in `plugins/cli/plugins/test/` cover flag/config translation, command policy, JSON/human rendering, external process orchestration, and end-to-end isolated command flows.
- Operational smoke is allowed to use the real personal `rawr-hq` source workspace, but any blocker must be classified as service bug, CLI binding bug, destination state issue, or external tool/environment issue.

## Required Gates

Run targeted gates after agent-config-sync changes:

```bash
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli,@rawr/hq-ops
bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli
bunx vitest run --project agent-config-sync
bunx vitest run --project plugin-plugins
bun run rawr -- plugins sync all --dry-run --json --source-workspace /path/to/personal/rawr-hq --allow-partial
bun run rawr -- plugins sync drift --json --source-workspace /path/to/personal/rawr-hq --no-fail-on-drift
```

Run mutating sync against personal `rawr-hq` only when the operator intends to update local provider destinations. A green synthetic suite is not enough to claim runtime parity.

## Current Gaps

- Hooks, MCP, settings, and Codex plugin-provided agents are not implemented as managed projections. Tests must not let `IN_SYNC` imply those are aligned.
- Undo restoration needs a full two-provider destination snapshot test.
- Failure injection should prove bounded reporting for write, package, and install failures.
- Multi-home precedence and deduplication need a dedicated fixture.
- Cowork tests should inspect ZIP entries, not only the ZIP header and summary.
- Personal-repo e2e should add real agent and hook fixtures before claiming readiness for the next content authoring wave.
