# Execution Queue

This is the short operating queue for the Habitat platform finalization. The
canonical design, inventory, acceptance detail, and stack dispositions remain
in [[design]], [[classification-ledger]], [[stack-cut-sheet]], and [[tasks]].

## Ground

- The `habitat-cli-v0.5.10` foundation release remains fixed at
  `85b0e49eb5385dfae3a1a1522e7c50df04e06580`, while the landed Habitat owner
  qualification proof has advanced cumulatively through catalog
  `e9d545c4783ef270d4a86b410efa6ef2ff824f63`, package-output
  `cdf21be1f8f47879d34e29bd442a3beabe337c58`, content-workspace
  `a799e1fd998a5c0556252d735505355ae4d7e4c8`, native-agent-provider
  `5772a4b8007fbae5d8da86e308d908359e7dc5b5`, and versioned-content
  `443c146920795786b850188e2b6179bd29a6bd19`, then agent-plugin lifecycle
  `a397eb7cde1c668b430a6e54203c9d97e1e7a8d9`. Task 2.10 is sealed by those
  exact-main owner receipts.
- Task 2.10a is sealed by the packed-installed
  `@habitat-ai/cli:acceptance:oclif-native-plugins` receipt. Habitat now owns
  native external-extension management, while the Rawr dependency/configuration,
  production hello fixture, and obsolete product-bound Oclif-app packet are
  absent. No replacement Oclif-app or CLI-topic law is active.
- Task 2.10b is sealed by the exact-main `0.5.14` bounded
  foundation-continuation [release receipt](foundation-continuation-release-receipt.json)
  and [adoption receipt](foundation-continuation-adoption-receipt.json). The root
  uses the released CLI/SDK pair; only the eight retained Habitat
  service/resource owners select the immutable v2 acquisition successors.
  Providers remain at v1, and every transferred or deleted instance remains
  untouched for task 2.11.
- The exact pre-deletion source authority for task 2.11 is
  `main@cc494354449465fa4178f36d4d5222b4d4072f5d`, with whole-tree identity
  `2eacd194803e542a579b9c6c845605123fcb2bbb`; later fresh owners may consult
  that frozen source only as provenance and owner-local test evidence.
- Gates A through C, Rawr's finite owner transfer, the bounded Habitat `0.5.15`
  continuation adoption, and repository separation are sealed. Task 2.12
  closed from clean canonical worktrees at Habitat
  `main@3e6341df406d0476b1e486f6e4b1102d7debc37c`, Rawr
  `main@a1a4fe7ed051ff405605c82c09ccd73332595383`, and Marketplace
  `main@851a5b87e86278757eb99b952281b90a35e74869`. Tasks 3.1 through 3.4 and tasks
  4.1 and 4.2 are sealed; the active source container is now task 4.3.
- The accepted pre-Gate-A semantic sieve removes only closures already
  classified for deletion and carrying no retained capability. It does not
  weaken or substitute for the publication barrier around surviving readers.
- Task 3.2a is sealed by the exact `0.5.15` release and adoption receipts. The
  root is bootstrapped by registry `@habitat-ai/cli@0.5.15` while
  `apps/habitat` remains outside the Bun workspaces. Bun 1.3.14 keeps a valid
  frozen lock; the released CLI is not added as a `file:`, `link:`, or
  duplicate workspace dependency.
- Task 3.3 is sealed at Habitat
  `main@d29177af06810b9de905ed133d2dad9fab8abe29` / tree
  `c83b7aecf6bfe06630dbe0fcc17dff4c551e9198`. The sole SDK package now lives at
  `packages/core/sdk`, the empty mixed `@habitat-ai/rawr-core` owner is absent,
  and push-to-main Repository Ratchet run `31339103432` passed the complete
  platform graph.
- Task 3.4 is sealed at Habitat
  `main@c59cb3255ac024e34ff0dc0c3aa01aa4572e5bcd` / tree
  `dc18105ac2a87cd59ede9c2143a66b5225bb8a90`. The ownerless root Elysia and
  Inngest declarations and lock closure are absent; current packed SDK/CLI
  public exports remain cold without either host; and push-to-main Repository
  Ratchet run `31342319663` passed the complete platform graph. No host peer
  metadata, loader, runtime owner, or blueprint landed early.
- Task 4.1 is sealed at Habitat
  `main@2c0aa807a1d3a2c8b2e843be92e2088170e4fbba` / tree
  `a08884381c2e50cf58c7f4f51398f9eb016165c9`. The private package-less
  `runtime-definition` owner, exact task-4.1 terminal SDK authoring faces, and
  `runtime-definition@1` are live while immutable `app@1` remains
  byte-identical. The named `runtime-definition:test` cache proof passed in
  Repository Ratchet; the
  `@habitat-ai/cli:acceptance:oclif-installed-package` installed
  `runtime-definition-acceptance` / `runtime_definition_v1_structure` proof
  passed on Ubuntu and Windows; push-to-main Repository Ratchet run
  `31358233213` passed the complete platform graph. No `app@2`, provider
  selection, acquisition, execution, mount, native host, MCP face, deployment
  implementation, or sibling-process control landed early.
- Task 4.2 is sealed at Habitat
  `main@42c65376babeacae3058f865e1c680631879fc96` / tree
  `fd151f1baa628d714fa61cd6f696d3683d0c4e55`. The terminal SDK now exposes
  cold `plugins/server`, side-effect-only `plugins/server/effect`,
  `plugins/async`, and `plugins/async/effect` faces; `service@3` selects the
  terminal-SDK consumer contract while Catalog remains acyclic on `service@2`.
  PR #944 passed Repository Ratchet and installed-package acceptance on Ubuntu
  and Windows, and push-to-main Repository Ratchet run `31376301029` passed the
  complete platform graph. No native host, MCP face, live runtime owner, or
  dispatcher materialization landed early.
- Task 1.7 records Magic's committed consumer oracle
  `ec7a49c596ca50d5c8ef8ce3f8e3e40cb08c33a7` / tree
  `2b3c99700d5db8264b7ee42910575e8b877bda3a`, separately from clean blueprint
  snapshot `4e2f5d63`. It freezes only generic process-local ownership,
  server/async isolation, native-host lifecycle, and external-companion demand.
  Magic product wiring, copied `mcp-openapi` tarball, and dirty deployment
  evidence are excluded.
- Proposal commit `203c9c686b0c18644218de5583902bcb180544a8` is provenance only;
  its admitted app/process concepts are selectively re-authored here and the
  commit is never cherry-picked. Proposal commit
  `419d5286bf83a41175a001233de244699c1b72da` is rejected as a landing unit
  because it removes immutable `app@1` and selects an unexercised direct MCP SDK
  shape. This completed authority correction is a prerequisite to task 4.1,
  not a parallel implementation lane.
- oRPC service execution follows native authority: synchronous and
  Promise-returning operations use `.handler`; exact
  `@orpc/experimental-effect@2.0.0-beta.23` implementation-owned `.effect`,
  installed once in `src/service/impl.ts`, owns Effect-backed request fibers.
  `handlerGen` is internal vendor machinery only. The app/process supplies
  `effect/context` plus `effect/wrap`, and no oRPC service Effect enters
  `ProcessExecutionRuntime`.
- Telemetry and Fluree worktrees are held adoption sources. The Session Metrics
  source is completed transfer provenance. None is a parallel Habitat
  implementation lane.
- Merged local residue is removed before source work resumes.
- The rejected task-4 prototype stack in PRs #931, #938, and #939 is closed and
  retired after the runtime authority correction in PR #940. Its commits remain
  provenance only. No new runtime owner inherits that stack or its complete
  `app@2`, task-4.2 plugin faces, or direct MCP choices.

## Containers

- [x] **Gate A - foundation producer**: finish the bounded task 2.8 sieve; seal
  selected, closed, constructible `service@1`; produce `runtime-schema`, the SDK
  service faces, and `HabitatCommand`; complete the admitted toolchain move;
  pass isolated-registry installed-candidate acceptance; and land the accepted
  exact-main producer. Prove plain `.handler` plus the official Effect bridge
  and reject every manual/custom runner. Leave the remaining private
  `RawrCommand`/`RawrResult` source and readers untouched, revive no condemned
  closure, and admit no second public/candidate command model. Landed at
  `main@98f34ca4c931a5e0fa4868825f86709ade603633`.
- [x] **Gate B - exact-main publication**: from the accepted Gate A exact-main
  revision, use the fixed Nx Release group to publish and registry-smoke only
  `@habitat-ai/sdk` and `@habitat-ai/cli`, then record the exact
  [release receipt](gate-b-release-receipt.json).
- [x] **Gate C - reader cutover**: only after that registry receipt, migrate
  the root Nx bootstrap to the exact released CLI, move surviving readers to
  released `HabitatCommand`, delete any condemned reader closure still
  remaining, and remove `RawrCommand`, `RawrResult`, and every predecessor
  reader with no shim, alias, fallback, or dual public authority. Sealed against
  registry `@habitat-ai/cli@0.5.6` and its exact paired SDK.
- [x] **Rawr**: migrated through the released substrate to exact Habitat
  `0.5.10`, imported the three services and three CLI topics through native Nx,
  reconciled Session Metrics, and retired Hyperresearch production fixtures.
  Canonical Rawr `main@a1a4fe7ed051ff405605c82c09ccd73332595383`
  owns the accepted product closure.
- [x] **Foundation continuation**: exact `@habitat-ai/cli` /
  `@habitat-ai/sdk` `0.5.14` is published and registry-smoked. The Habitat root
  uses that pair and selects `service@2` / `resource@2` only for retained
  platform owners. This remains inside the first functional checkpoint, not
  another package cohort or runtime release.
- [x] **Separation**: retain and rename Habitat platform owners, delete every
  transferred or rejected predecessor, rename the workspace, pass the
  cumulative absence gate, and seal the three clean canonical repository
  boundaries through task 2.12.
- [x] **Telemetry owner qualification**: task 3.1 now owns one private
  provider-neutral telemetry resource and nested OpenTelemetry Node provider,
  exposes only contracts and declarative configuration through the SDK, and
  deletes the mixed-core telemetry singleton. Runtime provisioning and harness
  observation remain with their exact later owners.
- [x] **SDK root export classification**: task 3.2 exhaustively preserves the
  current type-only `HabitatClient` and runtime
  `createHabitatClientForWorkspace` exports at the SDK root. Neither has a
  conforming destination yet; task 11.5 owns their reader migration and
  replacement. No source, package export, empty SDK family, or runtime owner
  changed in this node.
- [x] **Compatibility acquisition continuation**: one Git-visible inventory per
  owner check passes local and installed candidate acceptance. The `0.5.15`
  SDK/CLI pair, including only the already-qualified declarative telemetry face,
  is published, registry-smoked, and adopted. No runtime,
  provider acquisition, app/profile selection, mount, or instrumentation
  bootstrap lands in this continuation.
- [x] **Core SDK reservation**: task 3.3 deletes the empty mixed-core package,
  moves the unchanged `@habitat-ai/sdk` package wholly into
  `packages/core/sdk`, preserves `packages/core/runtime/schema`, retires the
  temporary predecessor-name overlay, and passes the exact-main platform-only
  gate with no predecessor path, package, reader, alias, or compatibility
  facade.
- [x] **Native-host reservation**: task 3.4 removes ownerless Elysia/Inngest
  root declarations and their lock closure, proves every current packed SDK/CLI
  public export stays cold and host-isolated, and leaves optional peer metadata
  plus owner-local loading for the first conforming runtime harness.
- [x] **Cold runtime definition**: task 4.1 establishes the private package-less
  `runtime-definition` owner, its cold app/process/entrypoint/profile and
  launch-identity records, definition descriptors and observation contract,
  exact terminal SDK authoring faces, and `runtime-definition@1`. Its graph,
  cache, policy, and installed-artifact proofs pass with `app@1` byte-identical
  and no live runtime or `app@2`.
- [x] **Cold server and async plugin faces**: task 4.2 establishes the
  topology-specific server/internal authoring face, the official
  implementation-owned Effect-oRPC bootstrap, host-neutral async declarations,
  and complete `service@3` without a native host or live runtime owner.

The active queue has one bounded node:

1. execute task 4.3 as the sole active node: author the cold `ProcessView`,
   `RoleView`, `ServiceBoundary`, and `ServiceBinding` declarations in
   `runtime-definition` and the SDK service face. Leave live `BoundService`,
   `bindService`, and cache mechanics for task 8.3.

The remaining containers execute in this dependency order. A later container
may supply a frozen oracle or acceptance obligation, but it does not share
write authority with the active one:

1. **Cold definition (`4.3-4.6`)**: continue from the sealed
   runtime-definition and plugin-face base through service-view, reader-binding,
   service-context, and web declarations without acquisition, native hosts, or
   `app@2`.
2. **Derivation (`4.7-4.11`)**: normalize the authored graph and emit the
   deployment-safe cold portable process plan. Land the definition-owned
   provider-effect plan from `6.1` after provider selection and before the
   compiler consumes it; do not insert a placeholder compiler input.
3. **Compilation and boot order (`5.1-5.5`, `6.2-6.5`)**: seal the complete
   process plan, deterministic boot artifact, and the two path-qualified Fluree
   integrations without acquiring a provider or publishing another package.
4. **Provisioning (`7.1-7.5`)**: build one process-owned beta.101
   `ManagedRuntime` from one `Layer.effectContext` lifecycle adapter, force its
   context before mount, and prove rollback and reverse release.
5. **Process runtime (`8.1-9.2`, `10.1`)**: bind services, lower adapters, match
   execution descriptors, run only non-oRPC Effect lanes, and return one
   process-owned stop handle without invoking a harness.
6. **Harness, observation, and mounting (`10.2-10.7`)**: seal the public
   companion contract, private `StartedHarness`, non-authorizing read models,
   and stop-before-release finalization state machine.
7. **Habitat self-host and Oclif (`11.1-11.8`)**: audit the already-qualified
   tool identity, co-land complete `app@2` with the self-host catalog, then
   realize `habitat resolve`, `check`, and `hook`, generators, child-process
   fixtures, and isolated-registry package acceptance.
8. **Additional CLI verticals (`12.1-12.3`)**: freshly author and select the
   agent-plugin, development, and authoring topics from frozen behavior
   evidence; never revive predecessor source.
9. **Native hosts (`13.1-13.6`)**: add Elysia/oRPC and native Inngest beside
   `runtime-harnesses`, prove same-app child isolation, and treat the MCP
   companion as conditional rather than a release blocker.
10. **Web (`14.1-14.2`)**: prove the cold build and native mount handoff through
    the terminal SDK web face without restoring a product web app.
11. **Audit and runtime-spine release (`15.1-15.6`)**: close telemetry receipts
    and residue, pass the complete graph and installed artifacts, land exact
    main, and publish only the SDK/CLI pair.
12. **Consumer adoption and drain (`15.7-15.9`)**: issue lane-specific
    informational handoffs and an exact receipt contract, accept owner-local
    migrations, retire each source only after its sink accepts, archive the
    change, and drain only dispositioned Graphite/worktree residue.

These nodes do not realize the final agent-plugin topic/overlay/profile,
development vertical, generators, authoring topic, private CLI source-bundle
contract, or final generic Oclif laws early. Task 11.4 owns the
foundation/source-bundle/law vertical; task 11.6 owns native generator
mechanics; and tasks 12.1 through 12.3 own the agent-plugin, development, and
authoring topic verticals respectively.

## Consumer Checkpoints

- Civ7 may now run an owner-local foundation migration from its exact `0.5.5`
  proof to released `0.5.15`: that pair now contains the service definitions
  whose absence blocked its Controller Foundation row. This is a foundation
  re-attestation, not early runtime adoption.
- Magic remains the primary runtime behavior oracle. Task 13.5 requests parity
  against its committed process-isolation assertions; task 13.6 communicates
  the independent MCP-companion disposition; task 15.7 alone opens the final
  runtime migration. Magic retains product placement and deployment control.
- The final handoff is informational and lane-specific. It states released
  facts, consumer-owned proof obligations, prototype-retirement conditions,
  and the return-receipt schema without scripting product implementation.

## Initiative Exterior

This change finishes the Habitat runtime spine, process-local observation and
telemetry integration, and a deployment-safe cold plan handoff. It does not
claim either of the following reserved systems:

- a persisted observability companion that owns exporter/backend policy,
  storage, indexing, retention, and retrieval; or
- a deployment/control-plane companion that owns placement, rollout,
  supervision, and provider-specific deployment mechanics.

Those become separate Habitat OpenSpec containers after their prerequisite
runtime handoffs are real. Product deployment controllers such as Magic's
Railway/GitHub flow remain consumer-owned evidence and integrations, never
Habitat source. After task 15.9 has drained source-quarry branches and accepted
all sinks, rename the legacy Habitat and Marketplace repository locators as two
independent operational migrations; Rawr's repository identity is already
correct. Marketplace record locators change only through its governed data
interface, not a bulk text rewrite.

Only the first unchecked container is active. Later containers may supply
acceptance obligations or frozen source evidence, but they do not share write
authority with the active container. Gates A through C are a temporary
publication barrier, not a compatibility architecture.
