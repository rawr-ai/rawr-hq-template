## 1. T6A: Thin Authority Record

- [x] 1.1 Record packet provenance, repository separation, the corrected
  objective, hard core, exterior, falsifiers, state and capability owners,
  acceptance boundary, and
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

- [x] 2A.1 Replace the upward `service/base.ts -> modules/*/ports.ts` dependency
  aggregation with minimal typed initial dependencies owned at the service
  root. App/CLI runtime may construct concrete resource providers, but the
  service package must not import provider implementations or controller code.
- [x] 2A.2 Narrow ready host dependencies from the service root in each
  `module.ts`. Use module provider middleware only when the module actually
  materializes a derived execution resource under `context.provided`; do not use
  it to rename or re-bag an existing dependency. Keep product decisions in
  procedure handlers and module model/policy files.
- [x] 2A.3 Delete service `bindings/*` and public `ports/*` package subpaths.
  Keep admitted host materialization at the CLI composition edge, retire
  export-owner classification/replay with the export capability, and expose no
  compatibility alias or second client.
- [x] 2A.4 Close the service package surface around its client factory, named
  construction-boundary types, thin composed router, and specifically required
  contract. Update positive Habitat topology and
  dependency-direction enforcement, then pass focused behavior, full service
  and CLI tests, lint, typecheck, build, strict OpenSpec, and all four standing
  reviews in coherent semantic Graphite nodes.

Current-main composition progress is recorded in
[[README#C5 Current-Main Service Composition Proof]]. The caller-built reader,
public bindings/ports, and export transition are retired. The composed
standing-review gate is complete.

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

## 3C. Personal Checkpoint Prerequisites

- [x] 3C.0 Make the canonical release-input body and envelope closed TypeBox
  schemas and derive their public wire types with `Static<>`. Retain the
  existing semantic parser for canonical ordering, digest, ownership, and
  aggregate limits. Keep the `encode-body` procedure input as an explicitly raw
  candidate so malformed bodies continue to return releases-owned typed issues;
  do not move that failure into oRPC adapter validation.
- [x] 3C.1 Add one releases-owned `release-input-record` procedure beneath the
  existing qualified `check` command. Accept a bounded body or exact envelope
  from stdin, return the canonical envelope bytes, and acquire no Git,
  artifact, provider, export, governance, or filesystem authority. Prove exact
  body/envelope round trips, typed malformed-input refusal, one-procedure
  dispatch, and human output byte identity; land this as one semantic Graphite
  node. Record proof in [[README#T6F Personal Checkpoint Prerequisites]].
- [x] 3C.1a Add one releases-owned read-only staged-index refresh mode beneath
  the existing qualified `check` command. Require an explicit closed member
  list, derive payload manifests and `skills/<identity>/SKILL.md` claims from
  those selected roots, preserve explicit repository-owned ancillary bindings
  from a valid existing record, and emit canonical envelope bytes without
  writing, staging, building, publishing, or provider mutation. An unchanged
  repeat must emit identical bytes.
- [x] 3C.2 Close the declared plugin-root axis during staged and clean repository
  checks: a canonical immediate plugin child absent from the release input must
  refuse before undeclared payload materialization. Preserve declared-member
  file closure, ignore unrelated repository paths, add no global scanner or
  semantic Grit rule, and land the behavior as a separate semantic node.
- [x] 3C.3 Project the exact verified provider binding on each successful
  complete-test target outcome so the current-main record can be authored from
  the same projection that was tested. Failures expose no binding; evidence
  codecs and stores remain unchanged. In the same provider-owned node, prove a
  stale selected member is natively refreshed while an omitted installed member
  is preserved by complete-test, then prove the repeat is read-only.
- [x] 3C.3a Move the fixed current-main record policy path out of the curated
  plugin root to `.rawr/agent-plugin-lifecycle/channels/current-main.json`.
  Accept no old-path alias, scan, fallback, or migration reader; old-path-only
  state is inert and rejected as undeclared plugin content.
- [x] 3C.4 Publish an immutable installed-controller artifact from landed
  Template `main` for repository-independent consumption. Personal CI may
  verify and invoke that artifact by absolute path; it may not checkout,
  rebuild, import, or vendor Template implementation. Record the exact digest,
  source revision, platform, byte length, and update recipe.
  The first landed-main attempt, run `29736289655` at `2f9e303a...`, failed
  closed before upload because portable archive construction changed verified
  payload modes. The bounded exact-mode repair and final continuation landed at
  `86a55a75`; run `29882221794` then published the closed immutable release and
  the exact Darwin arm64 artifact was installed at controller digest
  `3e1a8a4c...`. Manifest verification remains unchanged. Evidence:
  [[README#T6F Installed Controller Publication And Selection]].
- [ ] 3C.5 Replace the obsolete Personal hook only after 3C.1-3C.4 are landed
  and installed. The first Personal checkpoint must include its canonical
  release input, positive content topology, honest lint/typecheck units, and
  unconditional CI invocation of the pinned external controller. Do not use
  `--no-verify`, legacy mixed sync, ambient global repair, or a source checkout
  fallback. Server-side required-check enforcement remains an explicit external
  precondition wherever the repository host plan cannot enforce it. Child PR
  #183 at `852702b8...` implements the final-controller binding, but it and
  current-main PR #182 remain unlanded because billing blocked their required
  jobs before runner allocation.

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

## 5. T6C3: Legacy Export And Aggregate Retirement

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
- [x] 5.2 Inspect the installed controller capsule root read-only and prove no
  applying, undoing, committed, or otherwise non-idle export capsule is stranded.
  Record the exact path/type/result without creating, repairing, clearing, or
  replaying capsule state.
- [x] 5.3 Retire `rawr agent plugins export` and
  `rawr agent plugins undo` from command discovery, parsing/projection, the oRPC
  contract, router, client, service context, controller composition, public
  package exports, and active behavioral oracles. Delete export/capsule runtime
  machinery without a stub, alias, forwarder, fallback, or replacement
  publication framework. Preserve `rawr agent plugins package` and unrelated
  `rawr tools export`.
- [x] 5.4 Delete `KnownNativeHomesReader`, `completeNativeHomes`,
  `CompleteTargetIdentityReader`, `scanTargets`, and their sidecar-derived caller
  bridge. Retain only explicit point-addressed target identity state for
  targeted/complete-test modes. Prove no provider-home scan, aggregate,
  destination ledger read, or cross-owner inference remains.
- [x] 5.5 Positively narrow Habitat service and command topology around the five
  remaining modules and exact remaining commands; close the public export and
  provider binding/port package surfaces. Run focused provider/service/CLI
  behavior, lint, typecheck, build, structural/Habitat, strict OpenSpec, and four
  standing reviews. Transfer useful destination/export work to the dedicated
  full architecture migration; do not implement it here.

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

- [x] 8.1a Submit every retained Template continuation node with `--ai`, land
  through PRs #390-#396 on canonical Template `main` `2f9e303a...`, and drain
  the local continuation stack/worktrees without disturbing unrelated work.
- [x] 8.1b Land the bounded installed-asset mode repair, publish and verify the
  immutable controller from exact canonical Template `main`, then install/select
  that exact controller through the existing stable installer.
- [x] 8.1c Land the final TypeBox boundary-ownership, deterministic Nx-check,
  and standard operational-terminology continuation. All five module boundaries
  are sealed and the no-cache integrated lifecycle check passes; land the stack,
  then publish and select the resulting immutable controller before canonical
  settlement. Add no lifecycle state or provider mutation mechanism. PRs
  #411-#437 landed at canonical Template `main` `86a55a75`, workflow run
  `29882221794` published the immutable release, the exact Darwin arm64
  controller digest `3e1a8a4c...` is selected and healthy. Evidence:
  [[README#T6F Installed Controller Publication And Selection]].
- [ ] 8.2 Land current-main PR #182 and child final-controller-binding PR #183
  through their unchanged required remote checks. Both remain unlanded because
  billing blocked job allocation; no bypass is authorized.
- [x] 8.3 Build/test the complete current personal-main set, including
  `cognition:state-machine-design`, in one durable non-repository controller
  data root. Keep Inngest excluded while `HF01_PENDING`.
- [x] 8.4 Run complete-test with real Codex and Claude binaries in explicit
  disposable homes seeded through supported native commands with one omitted
  RAWR-managed member and a stale same-ID cognition release. Verify cognition's
  selected native refresh and provider-visible bytes while the omitted member is
  preserved; prove two selected plugins may expose the same plugin-scoped hook
  event without a global collision. This is owner-scoped lifecycle/provider
  acceptance (a small shared scenario driver is allowed), never
  `@rawr/controller-build:acceptance`.
- [ ] 8.5 After Personal PRs #182 and #183 land, resolve the landed
  `current-main` record binding both Codex and Claude, then canonically converge
  the same disposable homes. Verify
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
  canonical `main`, healthy installed operations, and a read-back server-side
  Template rule that requires `Required lint, typecheck, and topology` on
  `main`; local hooks and a merely present workflow are not sufficient proof.
  Ruleset `19508824` already satisfies only the prospective rule-readback
  component; see [[README#Template Required Ratchet Settlement Gate]].

## Related

- Corrected authority: [[authority-amendment]].
- Decisions: [[design]].
- Live proof: [[README]].
