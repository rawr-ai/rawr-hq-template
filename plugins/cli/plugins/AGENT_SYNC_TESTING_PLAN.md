# Agent Sync Testing Plan

Status: canonical testing plan for `@rawr/agent-config-sync` and the `rawr plugins sync ...` CLI projection.

This document lives with `@rawr/plugin-plugins` because `docs/projects/compatibility-substrate/` does not exist in this checkout, and this package is the active command-surface authority for agent sync. If a compatibility-substrate project is later created, this plan should move there or be linked from there without changing the guarantees.

## Purpose

Agent sync projects RAWR canonical plugin content into provider-specific destinations:

- Codex homes.
- Claude local plugin homes and Claude marketplace metadata.
- Cowork drag-and-drop ZIP artifacts.

The test suite must protect system guarantees, not just individual functions. Provider behavior will change over time, so tests should verify stable RAWR-owned contracts, provider-specific projections, and failure containment instead of freezing incidental implementation details.

The core claim under test is:

> A canonical RAWR plugin can be projected repeatedly into every enabled destination, with provider-specific semantics applied explicitly, without losing source truth, corrupting unmanaged destination content, hiding drift, or leaving operators unable to preview, apply, retire, undo, or diagnose the result.

## Adequacy Standard

A change to agent sync is not adequately tested until it has evidence for every guarantee category it touches:

1. Source authority and provider overlay semantics.
2. Destination projection shape for Codex, Claude, and Cowork.
3. Drift detection and dry-run fidelity.
4. Managed ownership, GC, and stale-plugin retirement.
5. Full-convergence defaults and partial-mode guardrails.
6. Install/package side effects owned by the CLI projection.
7. Undo and failure containment.
8. Multi-home, config, and environment resolution.
9. Operator output, JSON stability, and diagnosability.

Coverage is secondary. Each test must state the failure class it prevents and the observable oracle it uses.

## Guarantee Categories

### 1. Canonical Source Authority

Guarantee: RAWR plugin source content remains the single source of truth. Only canonical sync roots and declared provider overlays participate in projection.

Prevent these failures:

- Syncing implementation internals from `src/**` or package-private files.
- Ignoring `package.json#rawr.pluginContent.contentRoot`.
- Treating provider overlay content as canonical source content.
- Allowing provider overlays to introduce undeclared content classes.
- Accepting invalid plugin-content manifest shapes silently.

Required tests:

- Manifest parsing accepts only the versioned schema and rejects unknown provider keys or malformed include masks.
- Default source scan includes only `skills/`, `workflows/`, `scripts/`, and supported agent content when enabled.
- Custom `contentRoot` relocates canonical content without scanning the package root.
- Provider overlay roots are resolved relative to the source plugin unless absolute paths are intentionally supported and covered.
- Provider include masks can remove a content class for that provider without affecting canonical content or other providers.

Oracle: the resolved source-content DTO contains exactly the logical items expected for the canonical source and for each provider-effective projection.

### 2. Provider Projection Semantics

Guarantee: Codex, Claude, and Cowork receive provider-correct output from the same canonical source.

Prevent these failures:

- Codex workflows landing in Claude command paths or vice versa.
- Script names colliding across plugins in Codex homes.
- Claude plugin metadata missing marketplace or per-plugin manifest updates.
- Cowork ZIPs diverging from Claude-effective projection.
- Provider-specific overlays changing the wrong provider.
- Agents included for the wrong provider when provider defaults differ.

Required tests:

- Codex projection maps workflows to `prompts/`, skills to `skills/`, scripts to plugin-prefixed `scripts/`, and registry metadata to `plugins/registry.json`.
- Claude projection maps workflows to plugin `commands/`, skills to plugin `skills/`, scripts to plugin `scripts/`, and metadata to Claude marketplace/plugin manifests.
- Cowork packaging consumes the same provider-effective content that Claude projection would use, not a separate scan.
- A fixture with base content plus `providers/codex` and `providers/claude` overlays proves overlays are isolated per provider.
- Include-agent policy is tested for both current defaults: Codex excludes agents unless enabled; Claude includes agents unless disabled.

Oracle: filesystem snapshots, parsed metadata, and ZIP entry lists match the provider contract exactly.

### 3. Drift And Dry-Run Fidelity

Guarantee: plan, drift, and dry-run output predict mutating behavior without writing destination state.

Prevent these failures:

- Dry-run reporting planned writes that apply would not perform.
- Dry-run mutating files, registries, marketplace metadata, or Cowork artifacts.
- Drift check reporting `IN_SYNC` when material destination content differs.
- Drift check flagging unmanaged extras as RAWR-owned drift.
- JSON summaries hiding material changes behind an `ok: true` wrapper.

Required tests:

- For each provider destination, start from empty, drifted, and already-synced homes; assert drift status and material-change counts.
- Run dry-run then apply on the same fixture and compare planned items to applied items.
- Assert dry-run leaves file mtimes or content hashes unchanged for destination roots.
- Assert non-zero exit behavior for drift commands remains intentional and documented.
- Assert human and JSON outputs include enough information to identify plugin, provider, home, action, and reason.

Oracle: dry-run produces no destination changes, and its action set is a faithful preview of the subsequent apply.

### 4. Managed Ownership, GC, And Retirement

Guarantee: RAWR may overwrite, delete, or retire only content it previously managed or explicitly owns.

Prevent these failures:

- Deleting unmanaged user files during GC.
- Retiring a plugin that is active under a renamed or alternate source path.
- Leaving stale managed plugins after source rename/delete in full convergence.
- Removing Claude marketplace entries without removing the corresponding managed plugin directory, or the reverse.
- Treating corrupted ownership metadata as permission to delete broadly.

Required tests:

- GC removes removed managed files but preserves unmanaged files next to them.
- Codex registry-managed stale plugins are retired only when their recorded source is no longer active.
- Claude `.rawr-sync-manifest.json`-managed stale plugins are retired with marketplace cleanup.
- Corrupt or missing ownership manifests fail closed: report a diagnostic, preserve destination content, and require explicit operator action if needed.
- Full sync default retirement covers rename/delete lifecycle; single-plugin sync remains conservative unless flags opt in.

Oracle: after GC or retirement, only expected managed paths are removed, unmanaged paths remain byte-for-byte unchanged, and reports distinguish removed, preserved, and skipped items.

### 5. Full-Convergence Policy

Guarantee: `rawr plugins sync all` stays the deterministic daily path, and partial behavior is explicit.

Prevent these failures:

- Disabling Cowork, Claude install, force, GC, install reconcile, or orphan retirement without `--allow-partial`.
- Adding a new full-sync side effect without including it in partial-mode policy.
- Letting `rawr plugins sync <plugin-ref>` inherit destructive full-sync defaults.
- Mixing `rawr plugins ...` and `rawr plugins web ...` command surfaces.

Required tests:

- Every flag that weakens full convergence contributes a specific partial reason.
- `--allow-partial` is required for partial `sync all` combinations and is not required for the single-plugin conservative path.
- CLI help and JSON policy output expose the canonical command and reasons.
- Legacy or wrong command surfaces fail rather than aliasing silently.

Oracle: policy evaluation and CLI process tests agree on whether a command is allowed, blocked, or intentionally partial.

### 6. CLI-Owned Packaging And Install Behavior

Guarantee: service semantics stay inside `@rawr/agent-config-sync`; CLI-only side effects are orchestrated by `@rawr/plugin-plugins`.

Prevent these failures:

- Service tests depending on Claude CLI, Cowork ZIP libraries, or local user homes.
- CLI packaging bypassing provider-effective content resolution.
- Claude install/enable running during dry-run.
- Install failures being hidden while sync output claims full success.
- Cowork package failures being reported as sync success without reason metadata.

Required tests:

- Service-level tests use resource ports and temp directories only.
- CLI process tests cover Cowork planned/written/skipped/failed states.
- Claude install and enable are called only when enabled and never on dry-run.
- Install and Cowork failures surface in JSON with action, provider, plugin, and reason.
- CLI and service boundaries are verified by tests that mock or fake external process execution at the CLI layer only.

Oracle: service tests remain pure in-process; CLI tests prove orchestration and side-effect reporting without mutating developer homes.

### 7. Undo And Failure Containment

Guarantee: a mutating sync either completes with undo metadata or fails with bounded, diagnosable partial state.

Prevent these failures:

- Mutating sync succeeds without an undo capsule.
- Undo restores files but not registries or marketplace metadata.
- Undo applies after an unrelated command when it should be expired.
- Mid-run failure leaves no report of which providers/homes were changed.
- A failed provider blocks diagnostics for other providers.

Required tests:

- Mutating sync emits undo metadata with provider, capsule ID, and expiry semantics.
- Undo restores content, Codex registry, Claude marketplace, and plugin manifests for a fixture with both providers.
- Undo is rejected after expiry or after incompatible command context.
- Injected write failure records changed and skipped destinations without claiming full success.

Oracle: after undo, destination snapshots match pre-sync snapshots; after failure, output identifies the bounded changed set.

### 8. Multi-Home And Config Resolution

Guarantee: destination selection is deterministic across flags, environment variables, config, and defaults.

Prevent these failures:

- Writing to a default home when explicit homes were provided.
- Duplicating writes to equivalent paths.
- Ignoring disabled configured destinations.
- Environment variables overriding explicit flags.
- Personal-repo runtime commands being presented as template publishing actions.

Required tests:

- Precedence is flags, then RAWR sync environment variables, then legacy env vars where supported, then defaults.
- Repeatable homes write to every enabled unique destination once.
- Disabled config destinations are reported or skipped consistently and are not written.
- Template repo docs and commands keep full runtime sync as downstream/personal operational action where applicable.

Oracle: planned target homes match normalized config exactly, and no filesystem paths outside that set are touched.

### 9. Compatibility Evolution

Guarantee: provider-specific behavior can evolve without making old assumptions invisible.

Prevent these failures:

- Claude changes install/cache semantics and tests still pass because they check only local file layout.
- Codex changes registry shape and tests only assert file writes.
- Cowork changes package requirements and tests only assert a ZIP exists.
- New providers are added by copying Claude semantics without explicit contracts.
- Deprecated aliases remain primary in docs or tests.

Required tests:

- Provider fixtures carry an explicit provider-contract version or test name that states the assumed external semantics.
- Contract tests validate required metadata shape, not just path existence.
- Cowork tests inspect archive entries and manifest fields.
- Adding a provider requires a provider contract section in this plan, a fixture matrix row, and explicit ownership/GC rules.
- Deprecated aliases are covered only as compatibility behavior; canonical tests use `rawr plugins sync ...`.

Oracle: when a provider contract changes, there is an obvious fixture or contract test to update, and failures point to provider semantics rather than generic sync behavior.

## Fixture Matrix

Keep fixtures small and composable. Every fixture should exist to test a failure class.

| Fixture | Purpose | Must Cover |
| --- | --- | --- |
| `minimal-workflow` | smallest syncable plugin | one workflow, no metadata surprises |
| `full-content` | all canonical content classes | workflows, skills, scripts, agents |
| `provider-overlays` | provider-effective content | base plus codex and claude overlays |
| `custom-content-root` | manifest root semantics | canonical content below non-root directory |
| `include-mask` | provider inclusion rules | per-provider class exclusion |
| `managed-drift` | overwrite and drift behavior | changed managed destination content |
| `unmanaged-neighbor` | ownership safety | unmanaged files next to managed files |
| `rename-delete` | stale managed retirement | old managed plugin no longer active |
| `multi-home` | destination normalization | repeated homes, disabled homes, env/config precedence |
| `failure-injection` | containment | write/package/install failures |

Prefer generating these in tests with temp directories unless a stable golden fixture is needed for ZIP or provider metadata review.

## Test Layers

### Service Contract Tests

Target: `@rawr/agent-config-sync`.

Use these for:

- Planning.
- Provider-effective source-content resolution.
- Execution into temp destinations.
- Drift assessment.
- Retirement.
- Undo.
- Manifest/schema validation.

Do not call the real Claude CLI, write user homes, or build Cowork ZIPs here.

### CLI Projection Tests

Target: `@rawr/plugin-plugins` and app-level `rawr plugins ...` process tests.

Use these for:

- Flag parsing and full-convergence policy enforcement.
- JSON and human output stability.
- Cowork package orchestration.
- Claude install/enable orchestration.
- Command-surface cutover and deprecated alias behavior.
- End-to-end dry-run/apply/status flows in isolated temp homes.

### Operational Smoke

Target: local operator confidence before publishing or handoff.

Canonical verification from repo root:

```bash
bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/plugin-plugins
bunx nx run-many -t test --projects=@rawr/agent-config-sync,@rawr/plugin-plugins
rawr plugins sync all --dry-run --json
```

Run mutating `rawr plugins sync all --json` only in the downstream personal `RAWR HQ` operational context, not as a template publishing check.

## Test Proliferation Rules

Add a new test when it closes a named failure class or protects a newly documented provider contract. Do not add a test just because a function exists.

When adding tests:

1. Name the guarantee in the test title or nearby comment.
2. Prefer one fixture that exercises a class of failures over many near-duplicate happy paths.
3. Assert observable results: files, manifests, ZIP entries, JSON fields, exit status, and preserved unmanaged content.
4. Avoid asserting incidental ordering unless ordering is part of the operator contract.
5. Retire tests that only duplicate lower-layer guarantees after a stronger integration test covers the same risk.

## Current Gaps To Close

Existing coverage already exercises service shape, basic Codex apply, provider overlay resolution, stale Codex/Claude retirement, workspace planning, full-sync partial policy, drift/status flows, and command-surface cutover.

The notable gaps are:

- Cowork parity is documented but not yet covered by a provider-effective ZIP-entry oracle.
- Undo behavior is part of the command contract but lacks explicit end-to-end restoration coverage here.
- Provider overlay tests currently cover Claude overlay resolution; they should also cover Codex overlays, include masks, custom content roots, and invalid manifests.
- GC safety should include unmanaged-neighbor fixtures and corrupt ownership metadata.
- CLI-owned Claude install/enable behavior needs dry-run and failure-reporting tests with process execution faked at the CLI boundary.
- Multi-home precedence and deduplication need a dedicated fixture rather than incidental config checks.
- Failure injection should prove bounded partial-state reporting for write, package, and install failures.
