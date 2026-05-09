# Plugin Sync Workstream B Implementation Plan

Status: implemented and verified for bounded lane scope
Branch: `agent-plugin-sync-workstream-b-sync-substrate-parity`
Base: `4eb85769` (`main` after prior Workstream B lane content merged,
including session-tools through PR `#322` squash-merge content)

## Frame

This lane proves and tightens upstream plugin sync/tooling substrate parity so the downstream RAWR HQ personal repo can later stop carrying duplicate sync authority. The lane is not the downstream deletion lane. It produces upstream code/tests/docs plus a file-level downstream inventory that lets the final downstream sunset work remove duplicate authority deliberately.

The accepted claim boundary is:

- In scope: sync substrate parity for `services/agent-config-sync`, `packages/agent-config-sync-node`, and `plugins/cli/plugins`.
- In scope: non-mutating proof that upstream commands can use a downstream-shaped source workspace through `--source-workspace`.
- In scope: downstream duplicate-authority inventory and sunset prerequisites.
- Out of scope: deleting downstream files, mutating user provider homes, claiming full CLI/install parity, or repairing unrelated plugin sync/link issues.

## Sequencing Context

Workstream B lanes are ordered to avoid circular proof:

1. Upstream fallout establishes a stable baseline.
2. Undo establishes rollback/capsule primitives.
3. Plugin sync uses that baseline to prove sync substrate parity and source-workspace routing.
4. Session tools can then consume the cleaned substrate without duplicate plugin authority.
5. Devops wraps remaining workflow/automation concerns.
6. Downstream sunset removes personal-repo duplicates only after upstream parity and inventories are proven.

This lane therefore sits after undo and before downstream sunset. Its output is evidence and upstream hardening, not downstream removal.

## Team Interfaces

The DRA owns synthesis, edits, dispositions, proof claims, and closure. Discovery agents were used only as read-only peer inputs.

Accepted discovery outputs:

- Upstream substrate review: command-level `--source-workspace` proof is the main missing parity evidence.
- Downstream inventory review: downstream `packages/agent-sync/**` and related plugin CLI command/tests are duplicate-authority candidates, but their test scenarios are evidence to compare before removal.
- Validation review: safe proof should use `status`, `drift`, and `sync all --dry-run`; mutating sync/converge/provider repair belongs outside this lane.
- Red-team review: parity closure must include command identity, canonical testing-plan alignment, file-level downstream inventory, and precise claim boundaries.

## Implementation Shape

### 1. Durable Lane Record

Maintain `WORKSTREAM_RECORD.md` as the workstream ledger:

- frame and boundaries,
- review-loop findings,
- DRA dispositions,
- implemented changes,
- gates run and results,
- residual risks and downstream handoff.

### 2. Source-Workspace Command Proof

Add focused CLI tests that execute the template CLI entrypoint from a temporary invocation workspace while reading plugin content from a separate downstream-shaped source workspace.

The test shape should prove:

- the command path is the template CLI implementation under test, not downstream code;
- native plugin sync flags such as `--source-workspace` are exposed;
- `plugins status --checks sync --source-workspace ... --json --no-fail` reports the source workspace as authority;
- `plugins sync drift --source-workspace ... --json --no-fail-on-drift` reads source plugin content and skips external-source oclif comparison;
- `plugins sync all --source-workspace ... --dry-run --json --allow-partial` plans sync work without writing provider homes or source-workspace build outputs;
- cleanup-behind behavior can be planned against isolated provider-home residue without deleting anything in dry-run mode.

### 3. Downstream Inventory and Sunset Handoff

Document downstream items by disposition:

- duplicate authority to remove later,
- test scenarios to preserve or port before removal,
- plugin content to keep as source data,
- docs to update after authority flips.

This is a downstream sunset input, not a downstream mutation plan.

### 4. Verification Contract

Use the canonical sync testing plan as the closure contract, with results recorded honestly. Required closure gates for this lane are:

- `bunx vitest run --project cli apps/cli/test/plugins-source-workspace.test.ts`
- `bunx vitest run --project agent-config-sync`
- `bunx vitest run --project plugin-plugins`
- `bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli,@rawr/hq-ops`
- `bunx nx run-many -t build --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins,@rawr/cli`
- non-mutating source-workspace smoke against downstream `RAWR HQ`:
  - `plugins status --checks sync --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq --json --no-fail`
  - `plugins sync drift --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq --json --no-fail-on-drift`
  - `plugins sync all --source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq --dry-run --json --allow-partial`

Any skipped canonical testing-plan item must be recorded as a waiver with rationale and owner/trigger. Existing TESTING_PLAN gaps not closed by this lane, especially undo two-provider snapshot and failure-injection coverage, remain explicit residual risks instead of hidden parity claims.

Before CLI/Vitest gates, attempt the process collision check requested by the program DRA. If sandbox policy blocks `ps`, serialize tests locally and record that limitation.

## Review Dispositions

Accepted review findings:

- Tighten the gate contract to the exact commands above.
- Prove single-plugin `plugins sync <plugin-ref>` in addition to status, drift, and sync-all.
- Add before/after no-write assertions for dry-run source-workspace proof.
- Include cleanup-behind retained/skipped output, not only happy-path planned deletion.
- Run a real downstream non-mutating smoke against `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq` with isolated provider homes.
- Replace the broad downstream inventory with a scan-backed disposition matrix.

Deferred review findings:

- Full downstream deletion/removal is deferred to downstream sunset.
- Full CLI/install parity is not claimed by this lane.
- Mutating provider-home runtime visibility proof is out of scope without explicit operator approval.

## Stop Conditions

Pause for DRA/user clarification if implementation requires:

- deleting or rewriting downstream repo content;
- running mutating provider-home sync against real user homes;
- broad Graphite restack/sync operations that could disturb parallel lanes;
- claiming full CLI/install parity without a separate install/link/status comparison.

## Expected Closure Claim

The intended closure claim is:

> Upstream plugin sync substrate is proven against downstream-shaped source-workspace content for status, drift, dry-run sync, and cleanup-behind planning. Downstream duplicate authority is inventoried for a later sunset lane. Full downstream removal and broad CLI/install parity remain out of scope unless separately proven.
