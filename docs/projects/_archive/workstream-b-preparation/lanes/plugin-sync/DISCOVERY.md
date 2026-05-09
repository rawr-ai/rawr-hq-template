# Plugin Sync / Tooling Substrate Discovery

## Frame

This lane prepares implementation planning for removing downstream duplicate
sync authority after upstream parity is proven.

Upstream `services/agent-config-sync`, `packages/agent-config-sync-node`, and
`plugins/cli/plugins` are canonical implementation authority. Downstream remains
content/source input until imported or sunset. `source-workspace` is a content
routing tool, not a claim that the template is already the content home.

Do not run global sync/link repair in this preparation workstream.

## Current Upstream State

Upstream canonical sync surfaces exist:

- `services/agent-config-sync`
- `packages/agent-config-sync-node`
- `plugins/cli/plugins`

Project evidence:

- `bunx nx show projects` lists `@rawr/agent-config-sync`,
  `@rawr/agent-config-sync-node`, and `@rawr/plugin-plugins`.

Package evidence:

- `services/agent-config-sync/package.json:22-55` exports service, client,
  types, contract, resources, undo, entities, and router surfaces.
- `services/agent-config-sync/package.json:56-62` defines build, sync,
  structural, typecheck, and test scripts.
- `packages/agent-config-sync-node/package.json:8-37` exports Node resources,
  Claude/Codex CLI helpers, package generation, and types.
- `plugins/cli/plugins/package.json:26-32` depends on
  `@rawr/agent-config-sync`, `@rawr/agent-config-sync-node`, `@rawr/core`,
  `@rawr/hq-ops`, and `yaml`.

CLI/service binding evidence:

- `plugins/cli/plugins/src/lib/agent-config-sync-binding.ts:27-45` binds the
  service with Node resources and optional undo capture.
- `plugins/cli/plugins/src/lib/agent-config-sync.ts:334-360` calls service
  planning and assessment from the CLI projection.
- `plugins/cli/plugins/src/lib/agent-config-sync.ts:547-565` calls service
  cleanup-behind provider sync.

Current upstream behavior evidence:

- `plugins/cli/plugins/src/commands/plugins/sync.ts` exposes
  `--source-workspace`, `--cleanup-behind`, and managed orphan controls.
- `plugins/cli/plugins/src/commands/plugins/sync/all.ts` exposes
  `--source-workspace`, `--cleanup-behind`, and `--retire-orphans`.
- `plugins/cli/plugins/src/commands/plugins/status.ts` and
  `plugins/cli/plugins/src/commands/plugins/sync/drift.ts` accept
  `--source-workspace`.
- `services/agent-config-sync/test/service-shape.test.ts` expects service
  modules `planning`, `execution`, `retirement`, and `undo`.
- `services/agent-config-sync/test/sync-behavior.test.ts` covers managed
  provider sync, native Codex agent role status, stale managed retirement,
  cleanup-behind behavior, and preservation of unmanaged content.

Current upstream docs state the go-forward model:

- `services/agent-config-sync/docs/PARITY_INVESTIGATION_REPORT.md:8-11` says
  RAWR plugin source is scanned into provider-effective content and installed
  through native provider paths; direct filesystem sync remains generic
  projection/export.
- `services/agent-config-sync/docs/PARITY_INVESTIGATION_REPORT.md:86-95` says
  direct sync is retained as generic destination projection only and provider
  gaps must surface as blockers/residuals, not silent direct writes.
- `services/agent-config-sync/docs/NATIVE_SUPERSEDED_PROJECTION_CLEANUP_HANDOFF.md:52-55`
  says native provider deployment is sanctioned and direct filesystem projection
  is auxiliary export/repair.
- `services/agent-config-sync/docs/NATIVE_SUPERSEDED_PROJECTION_CLEANUP_HANDOFF.md:116-135`
  defines registry-managed ownership rules for destructive cleanup.

## Current Downstream State

Downstream still has duplicate legacy sync authority:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync`
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins`

Downstream package evidence:

- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/package.json:2`
  names `@rawr/agent-sync`.
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync/package.json:8-13`
  exports the old package root.
- `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins/package.json:20-28`
  depends on `@rawr/agent-sync`, `@rawr/control-plane`, `@rawr/hq`,
  `@rawr/security`, and `@rawr/state`.

Downstream behavior evidence:

- downstream `packages/agent-sync/src/lib/retire-stale-managed.ts` implements
  stale managed plugin retirement.
- downstream `packages/agent-sync/src/lib/sync-undo.ts` implements old undo.
- downstream plugin sync commands log `Undo: rawr undo`.
- downstream plugin sync skill docs still contain explicit
  `--source-workspace /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq`
  examples.
- Downstream plugin CLI paths are inventory inputs first, not deletion targets.
  Future sunset work must classify each downstream behavior as port, preserve as
  content, remove as duplicate authority, or clean as stale docs.

## Evidence

Commands used:

```bash
find services/agent-config-sync packages/agent-config-sync-node plugins/cli/plugins -maxdepth 4 -type f | sort
find /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins -maxdepth 4 -type f | sort
rg -n "source-workspace|cleanup-behind|retire|retirement|managed|Undo:|rawr undo|sync all|sync drift|status|agent-config-sync" services/agent-config-sync packages/agent-config-sync-node plugins/cli/plugins -g '!**/dist/**'
rg -n "source-workspace|retire|managed|sync all|sync drift|rawr undo|Undo:" /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/packages/agent-sync /Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq/plugins/cli/plugins -g '!**/dist/**'
```

## Mismatches

1. Upstream owns the newer service/substrate implementation, but downstream
   still carries old `@rawr/agent-sync` as duplicate implementation authority.
2. Upstream plugin CLI depends on `agent-config-sync`; downstream plugin CLI
   depends on `agent-sync` and other downstream packages.
3. Upstream provider-native sync model is ahead of downstream duplicate sync
   package.
4. Downstream remains the active content source for personal plugin material,
   so removing duplicate code cannot mean deleting content or source-workspace
   routing too early.

## Risks

- Removing downstream `agent-sync` before upstream parity/sunset proof could
  lose useful behavior or break personal plugin content sync.
- Treating `source-workspace` as architecture authority would confuse content
  routing with implementation ownership.
- Managed cleanup is destructive; future implementation must preserve
  registry/manifest ownership checks and unmanaged-content preservation.
- Mixed oclif ownership can leave stale downstream plugin command surfaces even
  after upstream implementation is canonical.

## Unknowns

- The exact downstream sunset branch should be separate from upstream parity
  proof.
- Future implementation must inventory downstream package references and
  downstream-only behavior before removal.
- Future implementation must decide whether any downstream-only tests should be
  ported upstream before deletion.

## DRA Disposition

Accepted after review repair. The lane is prepared for lane-specific planning
with upstream as canonical sync authority and downstream as temporary
content/source input.

## Review Repair Addendum

- `F-04-01` accepted: downstream behavior inventory is mandatory before any
  sunset claim.
- `F-04-02` accepted: `--source-workspace` proof must be bounded,
  non-mutating, and dry-run/status/drift oriented.
- `F-04-03` deferred as P3: mixed oclif/dependency ownership remains a
  downstream sunset risk, not a blocker to this preparation packet.
