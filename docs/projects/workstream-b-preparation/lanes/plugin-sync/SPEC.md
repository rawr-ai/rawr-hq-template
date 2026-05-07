# Plugin Sync / Tooling Substrate Spec

## Ownership

Canonical implementation authority:

- `services/agent-config-sync`
- `packages/agent-config-sync-node`
- `plugins/cli/plugins`

Temporary content/source input:

- downstream `RAWR HQ` plugin content and source workspace.

Duplicate downstream authority to sunset later:

- `packages/agent-sync`
- downstream sync implementation inside `plugins/cli/plugins`.

## Target State

Upstream owns reusable sync semantics, provider-native packaging/install,
destination projection/export, retirement, cleanup-behind, undo capture, status,
and drift reporting.

Downstream should eventually retain personal/content/customization material but
not a parallel implementation source for shared plugin sync tooling.

## Public Surface

Expected canonical upstream surfaces:

```bash
rawr plugins sync all [--source-workspace <path>] [--dry-run] [--json]
rawr plugins sync <plugin-ref> [--source-workspace <path>] [--dry-run] [--json]
rawr plugins sync drift [--source-workspace <path>] [--json]
rawr plugins status --checks sync|install|all [--source-workspace <path>] [--json]
rawr plugins export ...
rawr plugins export all ...
rawr undo
```

`--source-workspace` means "read content from this workspace." It does not mean
the source workspace owns architecture. Install repair and provider-home writes,
when explicitly requested in a future workstream, use the invocation workspace
and provider resources, not the content source workspace as authority.

## Internal Boundaries

Service-owned:

- planning,
- execution,
- retirement,
- cleanup-behind,
- undo,
- provider-effective source content,
- managed ownership rules.

Node adapter-owned:

- filesystem resources,
- provider CLI helpers,
- Codex/Claude package generation and install helpers.

CLI projection-owned:

- oclif flags,
- source workspace resolution,
- user output,
- status/drift aggregation,
- install/link repair coordination where explicitly requested.

Downstream-owned temporarily:

- personal plugin content until imported/sunset.
- local customization material.

## Downstream Behavior Inventory Required Before Sunset

Future downstream sunset work must classify every downstream-only behavior as
one of: bring upstream, preserve as content/source input, remove as duplicate
authority, or clean as stale docs. Inventory must cover at least:

- direct Codex prompt/skill/script projection behavior,
- Claude local plugin projection/install behavior,
- Cowork ZIP/package generation behavior,
- old undo capsule behavior,
- stale managed retirement behavior,
- target-home environment/config precedence,
- source workspace scanning and content discovery,
- status/drift output shape,
- downstream plugin CLI command paths and imports.

The downstream plugin CLI paths are evidence/inventory first. Do not treat them
as deletion targets until upstream parity and content safety are proven.

## Bring / Preserve / Remove / Ignore

Bring upstream if missing:

- downstream-only tests or edge behavior that still matter and are not already
  covered by `agent-config-sync`.
- downstream content routing examples where they clarify `source-workspace`.

Preserve upstream:

- native provider deployment as sanctioned path.
- generic projection/export as explicit auxiliary path.
- service-owned retirement and cleanup-behind rules.
- undo-backed mutating sync behavior.
- unmanaged-content preservation.

Remove later downstream:

- `packages/agent-sync` once upstream parity and downstream consumption are
  proven.
- downstream duplicate sync implementation and stale package references.
- stale docs that present downstream sync code as continuing authority.

Ignore:

- downstream duplicate implementation as target architecture.
- any source-workspace example that implies upstream is already the content home.

## Test And Evidence Contract

Future implementation must prove before downstream removal:

- Upstream sync/status/drift covers required downstream behavior.
- `source-workspace` can read downstream content without transferring
  architecture authority.
- bounded `--source-workspace` status/drift/dry-run proof can run without
  mutating provider homes or performing global link repair.
- Managed orphan retirement and cleanup-behind preserve unmanaged content.
- Undo capture remains available for mutating sync.
- Downstream package references to `@rawr/agent-sync` are removed only after
  replacement paths are in place.
- No global sync/link repair is run as incidental proof.

Expected upstream gates:

```bash
bunx nx run @rawr/agent-config-sync:test
bunx nx run @rawr/agent-config-sync-node:test
bunx nx run @rawr/plugin-plugins:test
bunx nx run-many -t typecheck --projects=@rawr/agent-config-sync,@rawr/agent-config-sync-node,@rawr/plugin-plugins
```

Expected downstream sunset gates should be defined in the downstream removal
workstream after upstream parity is proven.

## Non-Goals

- Do not delete downstream plugin content during upstream parity work.
- Do not run global `rawr plugins sync` or link repair in preparation.
- Do not treat projection/export as provider deployment.
- Do not hide provider-native gaps with silent direct writes.
- Do not remove downstream duplicate authority before upstream parity proof.

## DRA Disposition

Accepted after review repair. The spec fixes canonical upstream ownership while
preserving downstream as temporary content/source input and requiring a
downstream behavior inventory before sunset.

## Review Repair Addendum

- Downstream plugin CLI paths are inventory inputs before they are removal
  targets.
- `--source-workspace` proof must be bounded and non-mutating.
- Mixed oclif/dependency ownership remains recorded for downstream sunset.
