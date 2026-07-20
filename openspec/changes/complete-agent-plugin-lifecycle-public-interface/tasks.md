## 1. T6A: Thin Authority Record

- [x] 1.1 Record packet provenance, repository separation, the corrected
  objective/hard core/exterior/falsifiers/authority ledger, proof boundary, and
  closure in [[authority-amendment]], [[design]], and [[README]].
- [x] 1.2 Delete transfer, evidence-handle, second-launcher, caller-binding, and
  installed refusal-matrix requirements from the active C6 design.
- [x] 1.3 Replace issuer/promotion framing with one reviewed current-main v2
  record and direct native convergence requirements.
- [x] 1.4 Run strict OpenSpec validation and all four standing reviews; amend
  this Graphite node and resolve every P1/P2 before implementation continues.

## 2. T6B: Repository Checks

- [x] 2.1 Retain only release eligibility plus staged/clean repository
  validation beneath the existing `check` command; delete the protected-lane
  mode, flags, DTOs, schemas, service contract, router/index, handler, bindings,
  public exports, client operation, projection, and tests without an alias or fallback.
- [x] 2.2 Observe staged Git state without object-authoring or worktree-changing
  commands; revalidate once and return `SourceChanged` without retry or writes.
- [x] 2.3 Bind clean mode to exact repository/ref/commit/tree and declared
  inputs; authorize no build from staged state.
- [x] 2.4 Record that the exact settlement invocation selects canonical
  personal main and its landed release input, supplies no external Inngest
  candidate locator or destination, and never requests candidate bytes while
  `HF01_PENDING`; prove the public interface has no candidate field or inferred
  candidate status. Do not add generic candidate-path recognition to Template.
  The operational invocation and proof remain T6F tasks 8.2-8.5.
- [x] 2.5 Rerun focused service/CLI/content-workspace behavior, lint,
  typecheck, build, structural/Habitat, and one-procedure proof; close four
  standing reviews on the narrowed interface.

## 2A. C5 Context-Direction Correction

- [ ] 2A.1 Replace the upward `service/base.ts -> modules/*/ports.ts` dependency
  aggregation with minimal typed initial dependencies owned at the service
  root. App/CLI runtime may construct concrete resource providers, but the
  service package must not import provider implementations or controller code.
- [ ] 2A.2 Narrow ready host dependencies from the service root in each
  `module.ts`. Use module provider middleware only when the module actually
  materializes a derived execution resource under `context.provided`; do not use
  it to rename or re-bag an existing dependency. Keep product decisions in
  procedure handlers and module model/policy files.
- [ ] 2A.3 Delete service `bindings/*` and public `ports/*` package subpaths.
  Move host materialization to the CLI composition edge, route stateful
  export-owner classification/replay through export procedures, and expose no
  compatibility alias or second client.
- [ ] 2A.4 Close the service package surface around its client factory/type and
  specifically required contract only. Update positive Habitat topology and
  dependency-direction enforcement, then pass focused behavior, full service
  and CLI tests, lint, typecheck, build, strict OpenSpec, and all four standing
  reviews in semantic module-sized Graphite nodes.

Current-main composition progress is recorded in
[[README#C5 Current-Main Service Composition Proof]]. The caller-built reader
and public governance binding are retired; the remaining transition surfaces
keep tasks 2A.1-2A.4 open.

## 3A. Pure Codec And Public Interface

- [x] 3A.1 Define one governance-owned TypeBox model at
  `model/dto/current-main.ts`: exact `{schemaVersion,currentMainDigest,body}`
  envelope, closed body fields, fixed `[claude,codex]` tuple, 2 MiB bound, and
  `cm2_` over newline-terminated canonical body bytes.
- [x] 3A.2 Add closed `current-main-record` encode-body/validate-envelope through
  one governance procedure and the existing qualified `check` command. Return
  canonical bytes/protocol/digest/byte length without Git, provider, artifact,
  export, or other lifecycle ports; project exact newline-preserving envelope
  text at the CLI transport boundary without reserializing the record.
- [x] 3A.3 Prove canonical round trips; malformed, surplus, oversized,
  noncanonical, digest, v1, and provider-tuple rejection; pure codec cold ports;
  one-procedure CLI dispatch; no executable authority; and exact JSON/human CLI
  envelope transport.
- [x] 3A.4 Run focused tests, full lifecycle tests, lint, typecheck, build,
  structural/Habitat, strict OpenSpec, and four standing reviews; commit this
  semantic Graphite node alone. Proof: [[README#T6C1a Proof]].

## 3B. Observed-Git Selection And Cutover

- [x] 3B.1 Add the separate closed `current-main-selection` locator request.
- [x] 3B.2 Resolve the fixed record from observed canonical Git, verify stable
  repository identity, source reachability/tree/fixed release-input digest, and
  return one `CanonicalChannelSelection`. Later unselected content must leave
  the reviewed selector valid; compiled `refs/heads/main` and observed Git stay
  authoritative.
- [x] 3B.3 Delete v1 current-main, acceptance, hosted approval, promotion, and
  `attest-promotion` from service contracts/routers/public exports/client/CLI
  and positive Habitat inventory without aliases or compatibility decoders.
  Keep qualified `undo` for managed-export capsule state only. Remove the
  otherwise-unused hosted-governance resource.
- [x] 3B.4 Prove wrong/stale Git identity, changed release input, later
  unselected content retaining selection, one-procedure CLI dispatch, and
  old-path unreachability.
- [x] 3B.5 Run focused tests, lint, typecheck, build, structural/Habitat, strict
  OpenSpec, and four standing reviews; commit this semantic Graphite node alone.

## 4. T6C2: Thin Canonical Provider Path

- [x] 4.1 Change only canonical sync/status to consume the resolved selection
  through a narrow required dependency view. Provider code must not parse raw v2
  bytes or call receipt, sidecar, evidence, hosted, promotion, or undo ports.
- [x] 4.2 Plan from exact native `rawr-hq` marketplace identity plus embedded
  artifact provenance, preserve unmanaged/ambiguous collisions, verify artifact
  and projection bindings before native mutation, and report
  `BLOCKED_SELECTION` for invalid desired state.
- [x] 4.3 Prove no-record adoption, stale same-ID native remove/add refresh,
  omitted-member residue cleanup, unmanaged preservation, artifact/projection
  mismatch before mutation, exact applied-prefix failure, multi-home isolation,
  and a live-read repeat with every lifecycle/native mutation counter zero.
- [x] 4.4 Prove both halves of canonical ownership: matching `rawr-hq`
  marketplace with missing/invalid embedded provenance blocks, and valid-looking
  embedded provenance under a foreign marketplace blocks, each with zero native
  mutation. Inject one failure during omitted-member retirement after selected
  visibility; report the exact prefix, then prove retry re-reads and converges
  without rollback.
- [x] 4.5 Delete the receipt-owned managed-retire procedure from contract,
  router, public client, CLI, manifest, and positive Habitat inventory without
  an alias. Preserve targeted/complete mode scope and receipt/evidence behavior.
- [x] 4.6 Remove `ProviderUndoWriter`, provider capsule owner protocols,
  production bindings, replay registration, and provider inverse-action tests
  from every provider mode. Targeted/complete and canonical failures must report
  exact applied prefixes and retry from live native inspection; qualified undo
  must dispatch export actions only. Retain one closed migration-only decoder
  for an exact landed v1 `idle` committed provider capsule: provider operations
  remain capsule-cold, export atomically retires it under the controller lock
  before its first transaction with zero provider/native calls, and malformed or
  unsettled legacy state blocks only export/undo capsule activation without
  mutation or override.
- [x] 4.7 Run focused tests, lint, typecheck, build, structural/Habitat, strict
  OpenSpec, and four standing reviews. Consume a frozen exact landed-v1
  committed-provider-capsule byte fixture through a decoder-only migration
  module; retain no encoder, provider action constructor, classifier, executor,
  public export, or production/test construction API. Prove sync/status ignore
  the fixture, qualified undo cannot replay it, first export retires it atomically
  and remains usable, and repeat performs no migration;
  prove malformed/`applying`/`undoing` legacy state blocks export/undo unchanged
  while targeted, complete-test, canonical sync, and status remain capsule-cold.
  Prove precommit rejection/conflict preserves exact legacy bytes and admits no
  export; unknown-commit or session-release failure returns non-success and
  admits no export; cold retry re-reads and either retries the same retirement
  CAS or observes export-only `idle`, always with zero provider/native calls.
  Commit this semantic Graphite node alone.

## 5. T6C3: Export Destination Independence

- [x] 5.1 Require every provider mode to use an explicit pre-existing home and
  treat any entry or unreadable result at the fixed marker slot as
  `BLOCKED_COLLISION` before native commands. Recheck the slot at the native
  resource boundary; never create the home or parse/import the export marker
  codec. Prove missing/marked provider home refusal with zero native calls; a
  transition from absent at planning to occupied or unreadable at the resource
  edge returning a `BLOCKED_COLLISION` issue with zero calls for that native
  invocation; truthful uncertainty when the same issue follows an already
  invoked composite mutation bridge; and existing unmarked provider convergence
  followed by a read-only repeat.
- [ ] 5.2 Give exports one private exact marker at
  `.rawr-agent-plugin-owner.json` with canonical bytes
  `{"owner":"export","schemaVersion":1}\n`. Make that exact claim a prerequisite
  before payload/capsule work. The selected mechanism either lets ordinary
  export perform `Absent -> ExactExportOwned` as one no-replace visibility
  transition, or makes ordinary export refuse `Absent` while an export-authorized
  protected preclaim performs that transition. If another entry wins the root
  slot, preserve it and block. No provider may enter an export-created unmarked
  directory under either mechanism. Once claimed, the root and marker survive
  payload/ledger undo and an empty export set. Do not add a root inverse action,
  marker repair/replay, publication receipt, or lifecycle recovery store.

  **BLOCKED -- publication capability decision.** Implementation cannot proceed
  until the user, or an explicitly user-delegated product authority, selects
  either (a) one narrowly scoped shared/native directory no-replace capability
  with no lifecycle semantics or generalized publication framework, or (b) a
  separate point-addressed export-authorized protected preclaim operation.
  Option (a) is the minimal frame-compatible recommendation.
  A stateless option (b) is not admissible because an interrupted unmarked root
  is indistinguishable from a legitimate provider home. Selecting (b) requires
  a separate authority amendment naming its persistent fence carrier and owner,
  provider observation, and exit/re-entry law, then proving that the fence does
  not become a second destination truth, shared ownership protocol, or hidden
  multi-home coordinator. Under an authorized (b), ordinary export refuses
  `Absent` and admits only an exact preclaimed root. Do not weaken the no-
  unmarked-window invariant to avoid that choice, and do not duplicate a native
  syscall subsystem inside the export resource.

  After selection, prove absent claim, a cold zero-write exact-marker retry,
  exact-marked admission, unmarked/wrong/file/symlink refusal, competing-root
  preservation, committed claim followed by later planning refusal with truthful
  durable-marker reporting, root and marker identity persistence through export
  undo, provider refusal after undo, and export-local multi-destination overlap.
  For (a), require substrate-level atomic-publication conformance plus a bounded
  provider race trace. Name the substrate and scheduler ceiling; one overlap
  test is not a universal linearizability proof. Option (b)'s proof cannot be
  specified until its fence amendment is accepted. Add no second lifecycle
  service, transaction history, root digest, registry, provider field, or receipt.
- [ ] 5.3 After both owner-local boundaries are active, delete
  `KnownNativeHomesReader`, `completeNativeHomes`,
  `CompleteTargetIdentityReader`, `scanTargets`, their sidecar-derived bindings,
  and ambient overlap planning without aliases. Retain only explicit
  point-addressed target identity state for targeted/complete-test modes and
  export-local overlap checks between destinations in the same request. Prove
  no cross-owner scan, aggregate, or ledger read.
- [ ] 5.4 Run focused export/provider/service/CLI tests, lint, typecheck, build,
  structural/Habitat, strict OpenSpec, and four standing reviews. Extend closed
  positive Habitat inventories for owner-local exports/provider ports, routers,
  bindings, and resources so their admitted topology contains no aggregate or
  scan surface; retain `shared/release` and add no shared root-owner subtree.
  Commit provider refusal, export admission, aggregate removal, and structural
  closure as coherent semantic Graphite nodes rather than one aggregate change.

## 6. T6D: Truthful Test Owners

- [x] 6.1 Move DevOps Oclif command proof from the false parent-source fixture
  into an owner-local `@rawr/plugin-devops` fixture with guarded cleanup.
- [x] 6.2 Make the named CLI Vitest project own filesystem-file serialization
  and keep `TMPDIR` bootstrap in the owning Nx target.
- [x] 6.3 Rewrite their OpenSpec proof hunks against the thin stack, rerun the
  owner-local tests and ordinary CLI target, and close standing reviews.
- [x] 6.4 Make the lifecycle Vitest project own file serialization after two
  distinct real-Git fixtures proved file-level concurrency was not a truthful
  admission oracle; prove two consecutive ordinary Nx passes without a wrapper
  or retry.

## 7. T6E: Deterministic Official Manifest

- [x] 7.1 Canonicalize generated Oclif object keys by code-unit order while
  preserving array order and input immutability.
- [x] 7.2 Prove insertion-order independence in the focused controller test.
- [x] 7.3 Build the same clean Template commit into two fresh controller roots;
  require equal controller digests and byte/mode-identical normalized release
  trees without provider execution.
- [x] 7.4 Run controller lint/typecheck/tests and all four standing reviews;
  commit the deterministic packaging fix separately.

## 8. T6F: Landing And Settlement

- [ ] 8.1 Submit every retained Template Graphite node with `--ai`, land on
  canonical Template `main`, sync/prune the stack, and install/select that exact
  controller through the existing stable installer.
- [ ] 8.2 Replace the obsolete personal hook through the installed Template
  interface; land the personal content/release-input slice without bypass.
- [ ] 8.3 Build/test the complete current personal-main set, including
  `cognition:state-machine-design`, in one durable non-repository controller
  data root. Keep Inngest excluded while `HF01_PENDING`.
- [ ] 8.4 Run complete-test with real Codex and Claude binaries in explicit
  disposable homes seeded through supported native commands with one omitted
  RAWR-managed member and a stale same-ID cognition release. Verify cognition's
  selected native refresh and provider-visible bytes while the omitted member is
  preserved. This is owner-scoped lifecycle/provider acceptance (a small shared
  scenario driver is allowed), never `@rawr/controller-build:acceptance`.
- [ ] 8.5 Review and land one personal `current-main` record binding both Codex
  and Claude, then canonically converge the same disposable homes. Verify
  omitted-member native/config/cache residue removal and repeat with identical
  managed inventory plus every lifecycle/native mutation counter zero. Cleanup
  may recursively remove only an owner-created disposable root after proving the
  canonical temp parent, exact private prefix, directory/non-symlink type, and
  realpath containment; it must never recursively remove a caller-supplied or
  approved provider home.
- [ ] 8.6 Converge only the approved native homes, repeat read-only, and record
  persistent Codex Desktop-task visibility as a bounded operational observation
  because adapter app-server inspection is a fresh process. Fresh-process list
  alone does not prove the persistent task, and no app/runtime harness is added.
- [ ] 8.7 Queue the sealed corrective oRPC skill/proof-fixture release after the
  cognition settlement through the same closed-world path; do not widen C6 or
  use legacy sync.
- [ ] 8.8 Archive the change records, land record-only closure nodes, drain local
  and remote Graphite branches/worktrees in both repositories, and prove clean
  canonical `main`, required ratchets, and healthy installed operations.

## Related

- Corrected authority: [[authority-amendment]].
- Decisions: [[design]].
- Live proof: [[README]].
