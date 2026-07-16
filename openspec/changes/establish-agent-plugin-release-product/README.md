# C2 Agent Plugin Release Product Execution Record

**Status:** READY_TO_SUBMIT

**Change:** `establish-agent-plugin-release-product`

## Authority Binding

Authority is applied in this order:

1. Repository separation amendment at personal RAWR HQ `main` commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`, file `docs/projects/agent-plugin-lifecycle-normalization/AUTHORITY_AMENDMENT.md`, blob `10bb040317d62834806b86b36a3a14f13c539fbc`.
2. Accepted lifecycle packet provenance at personal RAWR HQ commit `cc631f60c9254802be647d66662823ae47d5e7db`, project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`.
3. The packet's normative proposal, C2 workstream container, B05-B10/B23-B25/B32 behavior rows, and I02-I04/I07-I08/I11-I14/I17-I19 invariants, except repository-relationship clauses superseded by item 1.
4. Landed C1 canonical controller and external-extension specifications plus the closed C1 execution record.
5. This Template-owned OpenSpec execution record.
6. Current code, tests, history, and installed state as migration or proof evidence only.

The two personal Git objects are accepted design-packet provenance only. This Template change starts from clean Template `main` and has no ancestry, cherry-pick, transplant, executable import, workspace link, runtime selection, or tree-equivalence relationship with personal RAWR HQ. Template will later consume personal curated content only through explicit versioned data, Git-verification, record-schema, and immutable-artifact interfaces.

## Repository Record

| Field | Value |
| --- | --- |
| Owning repository | RAWR HQ-Template |
| Bootstrap parent `main` | `ce816a7b4bdb0a23b575ac5fb01e64625647b452` |
| C1 reviewed source / landed `main` | `6e6f7aadc46e9ce87beb97dc3ea1ab7475bd4d28` / `5aad2da932e3c74c586a64a5f381a5c4a80424d2` (PR #333) |
| C1 reviewed archive / landed `main` | `0fbfadbdd300ff0e8d3d0a3e3f2690b1544839e5` / `ce816a7b4bdb0a23b575ac5fb01e64625647b452` (PR #334) |
| Bootstrap worktree / branch | `wt-template-c2-release-product-bootstrap` / `codex/c2-agent-release-product-bootstrap` |
| Implementation parent `main` | pending bootstrap landing |
| Implementation worktree / branch | pending bootstrap landing and drain |
| OpenSpec CLI | `@fission-ai/openspec@1.3.1` |
| Current gate | reviewed changeset-only bootstrap ready for Graphite submission; implementation code remains closed until this record lands on Template `main` and its branch/worktree drain |

## Director Frame

### Objective

Establish the inert Template-owned product that turns one clean, commit-aligned curated-content snapshot into canonical provider-neutral releases, one closed-world release set, exact immutable artifacts, deterministic packages, and explicit ledger-owned exports without installing a provider or activating a command.

### Hard core

- `@rawr/agent-plugin-release` is pure and owns the exact non-circular release-input/payload/release/artifact/set digest DAG, closed artifact refs, complete-set witness, and distribution ownership index with non-interchangeable opaque brands.
- The build application alone verifies repository eligibility, reads payload only from exact Git commit/tree/blob objects, revalidates worktree eligibility at both publication boundaries, and publishes immutable artifacts below a root injected from verified controller runtime context. Publication is atomic no-replace; `build all` commits members independently and the set envelope last, truthfully reporting partial durable members without a usable set ref. A checkout is a locator and can disappear after publication.
- Package/export requests accept only artifact refs and invoke consumer-owned readers internally. The build/artifact owner supplies the sole production reader and transfers immutable owned bytes; callers and sibling services cannot mint or alias a verified snapshot.
- Every curated skill has exactly one release member as distribution owner. Toolkit packs and composition aliases cannot become members.
- Only `build all` with a same-input completeness witness emits complete release-set membership; missing and extra members reject. A targeted release never claims channel convergence or peer retirement.
- Packaging mutates only one explicit output; Cowork is a deterministic package format and never a provider.
- Each canonical export destination owns one generation-fenced ledger with per-plugin provenance and an optional truthful complete-set claim. Export obtains native homes only through a complete provider-owned read snapshot, deletes only exact ledger claims, preserves unmanaged neighbors, and publishes payloads without following or truncating a live target.
- The controller owns one closed `idle|applying|undoing CapsuleState` below an injected runtime root. Linearizable generation-token transitions serialize mutation/undo, hard protocol bounds reject before mutation, and interrupted apply or replay cold-recovers or blocks; closed owner/version dispatch permits only the export owner's exact path-safe inverse executor in C2, never a generic path deleter, and no service persists another undo store.
- A repeated fully converged build, package, or export inspects live state and performs no write, metadata churn, cleanup, capsule replacement, provider call, or Oclif mutation. A retry after truthful incomplete complete-set publication may write only the missing members and final set marker.
- C2 parses and checks generated broken-plugin inputs without executing them, reports owner-scoped failures without repairing adjacent state, and keeps targeted artifact operations independent of unrelated members. Public command-level diagnosis and removal closure belongs to C5; provider-specific diagnosis/removal belongs to C3.
- New applications remain unreachable from public command discovery until C5 activates the complete qualified surface while deleting the mixed aggregate.
- Product recursive deletion is confined to an immediately revalidated owner-created private staging root. Tests may recursively remove only the current test's exact top-level `mkdtemp` fixture root after the same canonical-parent/direct-child/prefix, `lstat` non-symlink-directory, and exact-realpath checks, never an internal destination/package/capsule/artifact path. C2 artifacts are append-only; destination and undo cleanup use exact individual unlink and recorded-empty-directory non-recursive `rmdir` only; private-temp unlink is guarded by current-operation identity and immediate canonical/type/link/realpath proof.

### Exterior

Provider rendering and native installation, capability negotiation, receipts, test evidence, governed acceptance, promotion, channel selection, canonical provider retirement, public command activation, app composition, personal content migration, vendor refresh, Oclif mutation, operation history, PKI, and ambient multi-home coordination are outside C2.

### Falsifiers and redesign triggers

- Any release or artifact identity contains a checkout path, mtime, traversal order, lifecycle authorization record, destination ledger, receipt, or undo state.
- A dirty, staged, untracked-consumed, ignored-consumed, wrong-repository, wrong-tree, or payload-misaligned build emits durable bytes.
- A build reads payload from the worktree filesystem, reuses a check token, or skips final Git-object and eligibility revalidation.
- Duplicate ownership is resolved by order, name, or hash instead of rejecting the complete plan.
- A complete set lacks a same-input expected-membership witness or a set reference returns a partial member graph.
- Artifact publication can clobber a concurrent winner, `build all` returns a set ref before the final marker and all members verify, or incomplete publication is hidden behind a rejected result.
- Retention accepts bare digest domains, fails to expand a complete-set ref to every member artifact, or mutates from a channel-racy pin snapshot.
- Missing or tampered accepted artifact bytes trigger source reconstruction, fallback, or repair.
- A package/export request accepts snapshot-shaped data, a mutable buffer/path, an alternate production reader, or a caller-supplied native-home override.
- Export removes a path not proven by the same destination ledger, follows a symlink/hardlink/alias, uses recursive destination deletion, or treats a native provider home as an export destination.
- A no-op converge writes a file, directory, metadata field, ledger, artifact, package, or capsule.
- Capsule state can represent committed/pending independently, exceed its v1 bounds, admit concurrent generations, let a stale releaser remove a newer admission entry, release a partial undo, dispatch a generic filesystem action, recursively clean during replay, or disagree with the returned transition union.
- A service owns capsule persistence, reads an ambient data root, infers a channel, calls another stateful C2 service, or delegates to a legacy aggregate.
- A command file, controller-manifest row, compatibility alias, or old-command call makes C2 reachable early.
- Implementation requires personal executable code, repository ancestry, standing tree equivalence, protected-lane bytes, or the dirty primary personal checkout.

Any such finding pauses the affected unit before compensating machinery is added. A provider adapter, second state owner, generic projection fallback, or cross-repository executable relationship is a redesign trigger.

## Working Vocabulary

| Bag | C2 terms |
| --- | --- |
| Identity | content authority, Git-object snapshot, five digest brands, artifact ref, completeness witness, ownership index |
| Transition | inspect, qualify, canonicalize, publish, verify, package, export, retire, begin, settle, recover, undo |
| Boundary | Git locator/object database, pure release, injected artifact CAS, explicit output, destination ledger, closed capsule state |
| Exactness | closed, canonical, complete, deterministic, immutable, idempotent, equivalent |
| Failure | ineligible, conflict, tampered, missing, blocked, partial, cleanup failure, retryable |
| Forbidden mechanism | aggregate, alias, ambient scan, fallback, implicit rebuild, service-local history, repository mirror |

These terms describe implementation and proof only; they do not replace the normative proposal or workstream vocabulary.

## Authority Ledger

| State or fact | Sole owner | C2 use | Forbidden owner or path |
| --- | --- | --- | --- |
| curated source and governed content records | personal RAWR HQ | explicit versioned input to a future installed tool | Template import, executable mirror, Git ancestry |
| source eligibility and exact bytes | build Git-object snapshot port | worktree eligibility plus commit/tree/blob-owned bytes and boundary revalidation | filesystem payload read, reusable check token, checkout identity |
| release and complete-set identity | pure release package | canonical values and ownership closure | provider adapter, destination, aggregate SDK |
| immutable released bytes | Template artifact store | exact publish/read/verify; sole production `ArtifactReader` | caller snapshot/path, sibling reader, source checkout, channel record |
| explicit package output | packaging application | deterministic replace-or-converge at requested file | provider home, source workspace, ambient output scan |
| export live state and claims | each canonical destination and its local ledger | plan/apply/verify/scoped retirement | provider receipt, cross-destination ledger, source plan |
| last operation and current settlement | controller closed `CapsuleState` | one bounded generation-fenced `idle|applying|undoing` state; cold recover or block | independent slots, service store, history database, worktree |
| native provider identity and homes | future provider-owned `KnownNativeHomesReader` | complete read-only overlap snapshot; C2 fakes only | request override, export discovery or mutation |
| selected accepted release set | future governed channel record | not read or inferred in C2 | artifact collector, build all, caller-authored override |
| external CLI extension registry | native Oclif manager | never read or mutated in C2 | release, package, export, capsule |

## Corpus And Proof Boundary

| Rows | Owner and oracle | C2 evidence |
| --- | --- | --- |
| B05 / I08 | owner-specific applications; `AuthorityDeltaOracle` | C2 slice: direct application tests, broken-plugin check without content execution or adjacent repair, targeted-member isolation, mutation-port traps, dependency and activation guards; C3 adds provider-specific diagnosis/removal and C5 completes qualified real-command routing, operator diagnosis/removal, and mixed-owner deletion |
| B06 / I02 / I11 | build Git adapter; `GitEligibilityOracle` | C2 closes B06/I11 with exact object-byte reads, zero filesystem payload opens, every dirty/misaligned/race class, boundary revalidation, and no output from failed eligibility or prepublication rejection; C6 completes installed-tool locator use |
| B07 | pure release package; `CanonicalDigestOracle` | C2 closes the row with exact digest preimages/brands, order/path permutations, admitted/excluded mutation properties, and negative type fixtures |
| B08 / I03 | release-set ownership index; `OwnershipIndexOracle` | C2 slice: generic all-conflict and toolkit/composition rejection before writes; C6 proves every actual personal curated skill has one owner |
| B09 / I04 | complete release-set constructor; `ClosedWorldOracle` | C2 slice: same-input completeness witness, omitted/extra and mixed-authority rejection, full graph reads, targeted non-retirement; C3/C6 complete acceptance/channel selection |
| B10 | artifact store; `ArtifactExactnessOracle` | C2 closes the contract with no-replace late-winner proof, member-by-member/final-marker failpoints, truthful incomplete/unsettled refs, sole-reader/copy-isolation, complete-set member faults, tamper/delete/source-removal/transitive-ref-pin/implicit-rebuild probes; C3 repeats at canonical deployment |
| B23 / I07 | explicit export destination; `DestinationLedgerOracle` | C2 closes export with per-scope/set-claim transitions, generation races, ledger/payload/private-temp failpoints and substitution/cleanup-failure truth, collision/path safety, complete native-home reader, ledger-bounded GC, and second-run write traps; C3 separately closes provider receipt deletion |
| B24 / I14 | packaging application; `PackagePurityOracle` | C2 closes the row with source-path/mtime/order/prior-output permutations, private-temp substitution/cleanup-failure proof, and deterministic Cowork ZIP proof |
| B25 / I13 | controller state plus owner inverse protocol; `InverseCapsuleOracle` | C2 slice: bounds, concurrent/stale fencing, A/B, applied failure, capsule-state and replay-temp substitution/cleanup failpoints, cold apply/undo recovery, owner-typed reverse replay, exact atomic restore/unlink/non-recursive prune, substitution blocking, CAS clear, and service-store rejection; C3 adds provider actions and C5 real commands |
| B32 / I02 / I13 | injected controller roots and destination owners; `StableAuthorityPathOracle` | C2 slice: branded runtime-derived artifact/capsule roots, ambient-root traps, source/worktree deletion, alias containment; C3 completes provider metadata and C6 public-interface proof |
| I12 | every mutating C2 owner | C2 slice: filesystem and adapter-call snapshots prove repeated build/package/export convergence is read-only; C3 completes provider sync and C5 completes real-command proof |
| I17-I18 | repository boundary and Graphite process | C2 closure: Template-only diffs, landed canonical `main`, archived record, drained branch/worktree; C6/C7 independently close personal and final operational settlement |
| I19 | protected-lane pre-action boundary | C2 slice: generated fixtures only, exact protected-root absence guard, no primary-personal or legacy-sync access; C6 owns the parsed migration pre-action gate and accepted HF01 consequences |

Tests assert state transitions, owner-scoped events, exact bytes, and mutation-call absence. Source-shape checks are reserved for dependency direction, command absence, protected paths, and forbidden reachability where shape is the contract.

## Write Set

- `packages/agent-plugin-release/**` for pure primitives, closed parsers/issues/results, exact digest DAG/envelopes/refs, complete-set witness/construction, and ownership closure behind a curated root export;
- `services/agent-plugin-build/**` for exact Git-object eligibility/snapshots, check/build result unions, append-only CAS publication/read verification, sole production artifact reader, read-only retention planning, and generated Git/CAS fixtures;
- `services/agent-plugin-export/**` for closed requests/results and consumer ports, Codex/Claude layouts, generation-fenced per-scope ledgers, path-safe transactions, managed retirement, inverse actions, and fixtures;
- `services/agent-plugin-packaging/**` for closed requests/results, consumer reader, deterministic explicit outputs, and Cowork ZIP format;
- `apps/cli/src/lib/agent-plugins/{layout,undo/**}` for verified-runtime root derivation, the controller-owned closed capsule state/store/recovery/replay, and production `UndoWriter`, tested directly without a command;
- new Nx project metadata, package manifests, root workspace/lock/test configuration, generated-fixture utilities, and narrow architecture/activation/protected-path guards required to build and prove those owners;
- this OpenSpec change and the downstream C1 closure attestation in its archived record.

Legacy `@rawr/plugin-plugins`, `services/agent-config-sync`, and `@rawr/agent-config-sync-node` are migration evidence only. C2 may mine behavior and fixtures but must not import, wrap, rename, delegate to, or expand them. Their deletion and public command cutover belong to C5.

## Forbidden And Activation Boundary

C2 adds no file below `apps/cli/src/commands/agent/plugins/**`, no controller classification or manifest entry, no alias, no import or call from an existing command, and no bridge from the displaced aggregate. It does not mutate provider homes, Oclif state, acceptance/channel records, personal content, app definitions, or live operational homes. It has no generic destination projection fallback and no canonical channel inference.

Direct internal application and library tests are the only C2 reachability. C5 alone may activate the qualified commands, after C2 and C3 are complete, while deleting the mixed surface atomically.

## Protected Lanes

The oRPC/effect-oRPC research lane is closed and its evidence is read-only provenance:

- V7 manifest `bfa0eac652d3200af3edcf8afffd91cc995ae096ca786dd2d919484919d2981f`;
- results `888f81684ce1d3d8c805298023089d8619b6e1b79d7ba3465875caa1af3d9e17`;
- report `64ad4e7143054e896fe9a0d271c1530e23be69427def7ceaee4caaa2de1393fe`;
- Codex 0.144.5 compatibility proof `81db52240d3c7fe493f0bd22b685aa0736ac443b04d09b50f5c6dee95cdae2ca`;
- personal baseline `cb808ece6ccc8418fe141d0a180318a9572ab8a4`, `dev:orpc` tree `8688147109cf338bdd8d88845e5449269c28e6d7`, and Civ7 merge `dff1ec97474e9c1b080a9ec577f624b49ba842a9`.

C2-C5 do not mutate, re-evaluate, materialize, build, package, export, synchronize, or rewrite that lane's actual bytes. Its later personal convergence is authorized only through the normalized complete release-set, channel, and operational-settlement path.

Inngest remains `HF01_PENDING`. Until immutable HF01 acceptance exists, C2 does not read candidate bytes into a fixture or artifact and performs no materialization, build, package, export, sync, release, distribution, or destination write for that lane.

All C2 behavior proof uses generated fixture repositories and disposable explicit data/destination roots. The actively owned dirty primary personal checkout is never entered. Legacy `rawr plugins sync` is never invoked.

## Team Topology

The director owns authority interpretation, integration, product judgment, Graphite, proof labels, and closure.

| Role | Gate return |
| --- | --- |
| TypeScript design/refactoring | pure/value boundaries, illegal-state findings, dependency direction, module delta, compiler/static gates, complexity traps |
| behavior-first testing | B05-B10/B23-B25/B32 falsifiers, transition and failpoint coverage, write/call oracles, residual risk |
| structural code quality | wrong-owner preservation, aggregate/wrapper resurrection, activation leaks, deletion and maintainability findings |
| destructive-path safety | every recursive-remove callsite, destination/undo deletion path, and package/export/capsule/replay private-temp cleanup; canonical/type/link/alias/ownership checks, stale admission release, substitution races, and cleanup-failure truth |

Bounded implementation workers receive disjoint owner paths only after this bootstrap lands. Reviewers remain read-only and do not acquire product authority.

## Gate And Proof Log

| Gate | Status | Evidence |
| --- | --- | --- |
| C1 source/archive landing and drain | PASS | PRs #333/#334; exact commits above; 41/41 C1 tasks attested in the archived record; no C1 local Graphite branch, node, or worktree remains |
| repository separation | PASS | bootstrap parent is clean Template `main`; personal amendment and packet objects are cited only as provenance; no cross-repository implementation relation exists |
| Nx first hop | PASS after dependency install | repository projects and graph inspected; `bun install --frozen-lockfile` restored dependencies in this new worktree |
| pinned OpenSpec creation | PASS | `bunx @fission-ai/openspec@1.3.1 new change establish-agent-plugin-release-product`; schema `spec-driven` |
| changeset completeness and strict validation | PASS | pinned `@fission-ai/openspec@1.3.1 validate --all --strict --no-interactive` passed the active change and both canonical specs (3/3); tracked and all ten new-file whitespace checks passed; proposal, design, five deltas, tasks, and this record agree |
| inherited architecture ratchets | PASS | controller classification reports 9 complete packages; official relink authority is absent; repository separation is structurally verified |
| standing bootstrap reviews | PASS | independent TypeScript/domain, behavior-first testing, structural-quality, and destructive-path reviews report no unresolved P1/P2 after repairs for digest/ref domains, partial set publication, no-replace winners, transitive pins, temp cleanup, owner-typed undo replay, stale admission release, and C2/C3/C5 diagnosis allocation |
| bootstrap landing and drain | PENDING | changeset-only Graphite PR must land on Template `main`; post-main proof and branch/worktree drain precede implementation code |

## Closure

The bootstrap settles when the changeset is complete and strict-valid, each in-scope B/I row has an owner and oracle, standing reviews have no unresolved P1/P2, the combined C1 attestation and C2 record land on canonical Template `main`, post-main validation is green, and this bootstrap Graphite branch/worktree are drained. Only then may a fresh C2 implementation worktree start from the exact landed bootstrap commit recorded above.

C2 itself closes later only when all implementation tasks and spec deltas are truthful, owner-specific and exact affected proof is green, no command or provider path can reach the inert applications, source deletion and repeat-convergence oracles pass, the source and archived records land on Template `main`, and every C2 branch/worktree is drained. C3 may depend on C2 only after that closure. Personal C6 starts independently from clean personal `main`; it never consumes Template through ancestry or executable-tree equivalence.
