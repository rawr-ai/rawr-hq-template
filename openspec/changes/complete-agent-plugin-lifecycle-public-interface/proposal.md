## Why

Template `main` already owns the controller, release construction, qualified
agent-plugin commands, and native Codex/Claude adapters. Personal RAWR HQ needs
a narrow external interface for repository validation and one reviewed
`current-main` selection. It does not need controller-store transport, a second
launcher, or an issuer/promotion protocol layered over Git review.

The initial C6 design overfit proof mechanics. [[authority-amendment]] narrows
the remaining work to thin convergence while preserving unrelated landed C1-C5
behavior.

## What Changes

- Keep the closed staged/clean repository checks under
  `rawr agent plugins check`.
- Add one releases-owned `release-input-record` mode beneath that existing
  command. It canonicalizes a bounded stdin body or validates exact envelope
  bytes through one pure procedure; it does not write Personal records or
  acquire repository, filesystem, artifact, or provider authority.
- Add one releases-owned `release-input-refresh` mode beneath the same command.
  An explicit closed member list selects staged Git roots; the procedure derives
  payload manifests and exact skill ownership, preserves surviving explicit
  ancillary declarations, and emits canonical bytes without writing or building.
- Replace the acceptance-request/evidence/promotion chain with one canonical
  `current-main` record that binds landed personal Git identity, release input,
  complete release-set identity, provider projections, and evaluation profile.
- Make canonical provider sync resolve that record directly, then delegate all
  provider mutation and inventory reads to the native Codex and Claude adapters.
- Retire the old `attest-promotion` command and v1 current-main resolution path;
  no alias, fallback, or compatibility route remains.
- Retire receipt-owned `rawr agent plugins retire`; canonical closed-set sync is
  the only provider cleanup path and bounds omission cleanup by native
  provenance.
- Retire `rawr agent plugins export` and `rawr agent plugins undo` from command
  discovery, the oRPC contract, router, client, controller composition, and
  public package surfaces. Add no stub, alias, forwarding route, or fallback.
- Remove `completeNativeHomes`, its target-record scan, and the caller bridge.
  Provider lifecycle remains explicit and point-addressed; it does not aggregate
  homes for another owner.
- Canonicalize generated Oclif manifest objects so equivalent controller builds
  produce the same bytes and digest.
- Keep the owner-local DevOps CLI fixture and the serialized owning CLI test
  target as independent test-boundary corrections.

## Explicitly Removed From C6

- Controller-store artifact transfer and cross-store A/B proof.
- A second immutable launcher, caller-echoed digest/protocol bindings, and the
  installed refusal matrix built around them.
- Public mechanical-evidence handles as channel authority.
- Protected-lane runtime machinery beyond closed release-input exclusion.
- New issuer lineage, hosted approval replay, promotion attestations,
  app/runtime composition, destination/export realization, undo capsules, or
  provider installation logic.

## Modified Capabilities

- `agent-plugin-command-lifecycle`: exposes repository checks, one pure
  release-input record codec, one read-only staged-index refresh, and one closed
  current-main record codec without adding a command ID, and retires the
  receipt-owned explicit provider-retire command.
- `agent-plugin-lifecycle-mode-selection`: canonical sync/status consume one
  resolved selector and the managed-retire request is removed.
- `agent-plugin-promotion`: the issuer/acceptance/promotion capability is
  removed rather than adapted.
- `agent-provider-projection`: projection compatibility binds directly to the
  reviewed selector rather than accepted/promotion facts.
- `agent-provider-deployment`: canonical sync consumes that record and continues
  to use native provider commands and live inventory without canonical receipts,
  target-identity sidecars, or undo capsules.
- `agent-plugin-build-artifact-store`: mechanical evidence remains optional
  complete-test proof and is not channel/deployment/retention authority.
- `agent-plugin-managed-export`: removed from the curated lifecycle controller.
  Useful destination/publication requirements transfer to the dedicated full
  architecture migration rather than being repaired here.
- `agent-plugin-undo-capsule`: removed from the reachable controller and service
  surfaces after a read-only installed-state check proves no live capsule is
  stranded.
- `agent-provider-deployment`: removes the complete-home aggregate and scan;
  targeted, complete-test, canonical sync, and status remain explicitly
  point-addressed.
- `rawr-controller-authority`: generated official manifests are canonical, so
  equivalent controller builds have one digest.

### New Capabilities

- `agent-plugin-channel-selection`: one Git-reviewed current-main v2 record is
  the complete channel-selection authority.

## Impact

- Template implementation only. Personal remains content and governed-data
  authority and invokes the installed Template controller externally.
- The repositories share no source, history, runtime paths, or synchronization
  dependency.
- Inngest candidate work remains `HF01_PENDING`. This settlement's exact
  canonical-main invocation supplies no external candidate locator or member
  and therefore requests no candidate bytes. Generic Template tooling does not
  infer protected status from a caller's explicit workspace.
- App/runtime composition remains owned by the separate architecture migration.

## Related

- Corrected authority: [[authority-amendment]].
- Decisions and state law: [[design]].
- Execution record: [[tasks]] and [[README]].
- Landed service topology:
  [[openspec/changes/archive/2026-07-18-retire-mixed-plugin-lifecycle/SERVICE_TOPOLOGY]].
