## Why

The repository currently treats CLI, server, web, and HQ process roles as peer
apps, so app selection, provider acquisition, native mounting, and shutdown are
reconstructed in entrypoints instead of flowing through the canonical runtime
realization system. The frozen predecessor runtime lineage plus later admitted
resource, product, and distribution amendments define the correct kinds and
seven-phase lifecycle; this change first removes product and dead source from
the platform repository, then realizes that law once so Habitat can self-host
and downstream products can consume a released substrate.

The exact sectional source ledger is [[authority-amendment]].

## What Changes

- Establish one closed Habitat application contract: the Habitat platform owns
  the substrate and realizes its non-core tooling through a self-hosted app,
  while downstream product apps own their composition, profiles, process
  declarations, and thin entrypoints. Runtime owns compilation, provisioning,
  execution, mounting coordination, and process finalization for both.
- Apply a semantic sieve before runtime implementation: a current Rawr name
  conveys no ownership. Retain reusable platform capability in Habitat, move
  only proven downstream product capability to Rawr, and delete duplicate,
  obsolete, weak, or unclear machinery.
- Move the proven ChatGPT corpus, Hyperresearch, and Codex/Claude session
  intelligence product closures to the existing independent Rawr repository
  before the Habitat runtime spine opens.
  Use native Nx history-preserving import, retire Habitat-side Rawr application
  law, and leave Marketplace as an independent content repository.
- Implement the minimum generic runtime spine that preserves every canonical
  phase: definition, selection, derivation, compilation, provisioning,
  mounting, and observation.
- Keep Effect lifetime authority with the app/process and native execution
  authority with the selected bridge. Public `effect/context` and `effect/wrap`
  carry the process-owned Context, resource lifetime, policy, and telemetry;
  plain oRPC operations use `.handler`, Effect-backed operations use official
  `@orpc/experimental-effect` `handlerGen` or `.effect`, and
  `ProcessExecutionRuntime` never executes oRPC service Effects. Reject manual
  or custom Effect runners.
- Define harness as one platform kind with a shared lifecycle contract, then
  realize Oclif first and retain explicit Elysia and Inngest extension points
  without encoding their native semantics in runtime mounting or observation.
- **BREAKING** Remove the flattened `apps/cli`, `apps/server`, `apps/hq`, and
  `apps/web` identities from Habitat. Platform capability moves to the Habitat
  self-host, its control-plane API plugin, or another qualified platform owner;
  proven product capability moves to Rawr; the rest is deleted. Retain no
  compatibility app, alias, fallback, or duplicate Nx identity.
- Cross one bounded publication barrier for the command migration: Gate A
  accepts and lands the sole public/candidate `HabitatCommand` contract while
  existing private `RawrCommand`/`RawrResult` readers remain untouched; Gate B
  publishes and registry-smokes only the exact SDK/CLI pair from accepted main;
  Gate C starts only from that receipt, moves the root Nx bootstrap to that
  exact registry CLI, migrates surviving readers, and deletes both Rawr symbols
  and every reader without a shim, alias, fallback, or dual public authority.
  This is release ordering, not retained compatibility. Replace Habitat-side
  Rawr workspace discovery with explicit Habitat workspace input. Product-owned
  Rawr configuration transfers with its product owner. Agent-plugin lifecycle,
  development/repository
  operations, native Oclif plugin mechanics, and CLI generators are Habitat
  capabilities. Current doctor, HQ graph, reflect, routine, tools-export,
  workflow-harden, config, journal, security, hello, and the predecessor
  agent-plugin creation surfaces are deleted rather than renamed when their
  current implementation has no generic Habitat owner.
- Keep the runtime substrate inside the sole public runtime and authoring
  distribution, `@habitat-ai/sdk`. Keep `@habitat-ai/cli` as the separate
  public Oclif executable package and expose its one consumer Oclif host
  entrypoint for private downstream apps; do not publish internal runtime phases
  or harnesses as a package cohort.
- Hold the mixed native-telemetry source root as adoption evidence. Before core
  reservation, re-author its path-qualified OpenTelemetry resource/provider and
  core-singleton retirement into fresh Habitat-owned nodes; do not restack or
  merge the predecessor root. Distribute that selected provider through the
  optional `@habitat-ai/sdk/telemetry` integration subpath rather than another
  package or the CLI host. After runtime lands, re-author each admitted profile,
  process, and harness obligation beside its final owner, then retire the held
  source only after destination acceptance. Downstream products select only the
  released integration from their own repositories.

## Capabilities

### New Capabilities

- `app-runtime-realization`: The constitutional app, profile, compiler,
  provisioning, process-runtime, adapter, and observation lifecycle.
- `runtime-harness-boundary`: The generic native-host mount and stop contract
  plus bounded Oclif, Elysia, and Inngest realizations whose native stop
  operations own any drain semantics.
- `repository-separation`: Habitat contains no downstream product source, Rawr
  owns its product closure, and Marketplace remains an independent content
  repository.

### Modified Capabilities

- `repository-ratchet-runtime`: Subprocess acceptance moves from the deleted
  generic test-utils package to the CLI or semantic owner whose behavior it
  proves.

### Removed Capabilities

- `rawr-cli-application`: Habitat retires this product capability after an
  owner-local Rawr OpenSpec receives the application contract and the
  independent Rawr repository lands.

## Impact

- App and runtime Habitat blueprints, Nx project identities, import boundaries,
  and AGENTS routing.
- `@habitat-ai/sdk` public authoring and runtime surface plus private,
  package-less Nx runtime projects whose exact outputs assemble into that one
  public package.
- Habitat control-plane and Oclif source/compiled entrypoints, command mounting,
  error handling, cancellation, drain, the task 2.8 publication barrier, and
  official oRPC/Effect bridge ownership.
- Current peer app roots and the telemetry change's runtime prerequisite.
- No provider-home mutation, marketplace settlement, Marketplace-repository code
  sharing, app-composition repair outside the canonical runtime, or new public
  package cohort.
