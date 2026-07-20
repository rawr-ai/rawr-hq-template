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
  app/runtime composition, or provider installation logic. Existing qualified
  undo remains only for managed-export capsule state.

## Modified Capabilities

- `agent-plugin-command-lifecycle`: exposes repository checks plus one
  closed current-main record codec without adding a command ID, and retires the
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
- `agent-plugin-managed-export`: export collision authority is destination-local
  and uses one visible root-owner marker instead of a hidden provider-home
  registry.
- `agent-plugin-undo-capsule`: every provider capsule/replay requirement is
  removed; qualified undo remains export-only.
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
- Execution ledger: [[tasks]] and [[README]].
- Landed service topology:
  [[openspec/changes/archive/2026-07-18-retire-mixed-plugin-lifecycle/SERVICE_TOPOLOGY]].
