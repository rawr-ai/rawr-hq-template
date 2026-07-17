# C2 Agent Plugin Release Product Execution Record

**Status:** CLOSED

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
| C2 bootstrap reviewed / landed `main` | `8638870ff396ed431f8d49788c0811df45ee8204` / `23d1f1efcf54a4860fa55261df7f29e5c68d063f` (PR #335) |
| Bootstrap worktree / branch | `wt-template-c2-release-product-bootstrap` / `codex/c2-agent-release-product-bootstrap` (merged and drained) |
| Implementation parent `main` | `23d1f1efcf54a4860fa55261df7f29e5c68d063f` |
| Implementation worktree / branch | `wt-template-c2-agent-release-product` / `codex/c2-agent-release-product` (merged and drained) |
| C2 source reviewed / landed `main` | `e8bf7b31a673def65c04f1246cdc8a08a04482e3` / `dac4c6407dcc8d75adc34738f5ae9995a43a1810` (PR #336) |
| C2 source tree | `acc62e861ee970d6567c2fb477ff2b796ea7a327` (reviewed and landed) |
| Archive worktree / branch | `wt-template-c2-agent-release-product-archive` / `codex/c2-agent-release-product-archive` (merged and drained) |
| C2 archive reviewed / landed `main` | `bba27c52941ef8cb5f66e1b801c446eb7378349e` / `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2` (PR #337) |
| C2 archive tree | `ba692eb5bf22b83b8389ae98c069d454ad7961c9` (reviewed and landed) |
| OpenSpec CLI | `@fission-ai/openspec@1.3.1` |
| Current gate | C2 is closed on canonical Template `main`; C3 may consume only its landed contracts and remains responsible for provider reachability, while public command reachability stays closed until C5 |

## Director Frame

### Scope correction

C2 is an authority-normalization container, not a launcher-security or hostile-maintainer container. A bounded review of test-fixture cleanup was allowed to generalize into static anti-obfuscation and subprocess policing that did not protect a packet invariant. That was a categorical error: a supported-path accident-prevention concern was treated as a new product authority and then used to expand the proof boundary.

The correction is structural. C2 guards the concrete recursive cleanup operations it owns, especially wrong-root test cleanup, and otherwise returns to release identity, distribution ownership, immutable artifacts, destination truth, and idempotent transitions. Review findings block closure only when they demonstrate a packet invariant violation, a supported-behavior defect, or a maintainability defect in the implemented owner boundary. Hypothetical source obfuscation, arbitrary same-user code modification, and generalized launcher hardening are outside this initiative.

### Objective

Establish the inert Template-owned product that turns one clean, commit-aligned curated-content snapshot into canonical provider-neutral releases, one closed-world release set, exact immutable artifacts, deterministic packages, and explicit ledger-owned exports without installing a provider or activating a command.

### Hard core

- `@rawr/agent-plugin-release` is pure and owns the exact non-circular release-input/payload/release/artifact/set digest DAG, closed artifact refs, complete-set witness, and distribution ownership index with non-interchangeable opaque brands.
- The build application alone verifies repository eligibility, reads payload only from exact Git commit/tree/blob objects, revalidates worktree eligibility at both publication boundaries, and publishes immutable artifacts below a root injected from verified controller runtime context. Publication is atomic no-replace; `build all` commits members independently and the set envelope last, truthfully reporting partial durable members without a usable set ref. A checkout is a locator and can disappear after publication.
- Package/export requests accept only artifact refs and invoke consumer-owned readers internally. The build/artifact owner supplies the sole production reader and transfers immutable owned bytes; callers and sibling services cannot mint or alias a verified snapshot.
- Every curated skill has exactly one release member as distribution owner. Toolkit packs and composition aliases cannot become members.
- Only `build all` with a same-input completeness witness emits complete release-set membership; missing and extra members reject. A targeted release never claims channel convergence or peer retirement.
- Packaging mutates only one explicit output; Cowork is a deterministic package format and never a provider.
- Each canonical export destination owns one generation-fenced ledger with per-plugin provenance and an optional truthful complete-set claim. Export obtains native homes only through a complete provider-owned read snapshot, deletes only exact ledger claims, preserves unmanaged neighbors, and publishes payloads without following or truncating a live target. A multi-destination request admits one canonically ordered aggregate undo candidate, executes through one token, and settles once with the exact applied target/action subset; a later destination cannot replace or erase earlier inverse coverage.
- The controller owns one closed `idle|applying|undoing CapsuleState` below an injected runtime root. One stable controller-owned, non-authoritative advisory-lock inode supplies an operation-scoped exclusive session: brand-new root initialization creates it exactly once, and successful begin then retains it across every stage, external mutation, observed-post bind, and terminal settle/abort or explicit suspension for cold recovery, while applying recovery and undo hold the same exclusion for their complete workflows. After initial creation, supported controller paths never unlink, rename, replace, or recreate that entry, so concurrent supported operations contend on one inode; a missing or substituted entry fails closed rather than being repaired. A live owner makes competing begin, recovery, and undo busy without mutation; kernel process exit releases synchronization ownership without adding persisted identity. Hard protocol bounds reject before mutation, owner-typed observed-post bindings prevent path inference, and interrupted apply or replay cold-recovers or blocks. The CLI dependency-injection root registers only the export owner's production codec, applying-recovery classifier, and exact path-safe inverse executor in C2. Joint action/target and sequence validation binds every destination plus ledger generation/digest, exhausts the candidate, and rejects replay-unsafe ordering; no generic path deleter exists and no service persists another undo store.
- A repeated fully converged build, package, or export inspects live state and performs no write, metadata churn, cleanup, capsule replacement, provider call, or Oclif mutation. A retry after truthful incomplete complete-set publication may write only the missing members and final set marker.
- C2 parses and checks generated broken-plugin inputs without executing them, reports owner-scoped failures without repairing adjacent state, and keeps targeted artifact operations independent of unrelated members. Public command-level diagnosis and removal closure belongs to C5; provider-specific diagnosis/removal belongs to C3.
- New applications remain unreachable from public command discovery until C5 activates the complete qualified surface while deleting the mixed aggregate.
- Production C2 contains no recursive deletion. Tests may recursively remove only the current test's exact top-level `mkdtemp` fixture root after canonical-parent/direct-child/prefix, repeated `lstat` non-symlink-directory, captured device/inode, and exact-realpath checks, never an internal destination/package/capsule/artifact path. C2 artifacts are append-only; build staging, destination, and undo cleanup use exact individual unlink and bottom-up non-recursive `rmdir` only; private-temp unlink is guarded by current-operation identity and immediate canonical/type/link/realpath proof.

### Exterior

Provider rendering and native installation, capability negotiation, receipts, test evidence, governed acceptance, promotion, channel selection, canonical provider retirement, public command activation, user-facing app composition and authoring behavior, personal content migration, vendor refresh, Oclif mutation, operation history, PKI, and ambient multi-home coordination are outside C2. The inert CLI dependency-injection registration needed to bind the export owner protocol to the controller remains inside C2 and creates no product app-composition surface.

### Falsifiers and redesign triggers

- Any release or artifact identity contains a checkout path, mtime, traversal order, lifecycle authorization record, destination ledger, receipt, or undo state.
- A dirty, staged, untracked-consumed, ignored-consumed, wrong-repository, wrong-tree, or payload-misaligned build emits durable bytes, including when a consumed path appears before the final bounded status linearization observation.
- A build reads payload from the worktree filesystem, reuses a check token, or skips final Git-object and eligibility revalidation.
- Duplicate ownership is resolved by order, name, or hash instead of rejecting the complete plan.
- A complete set lacks a same-input expected-membership witness or a set reference returns a partial member graph.
- Artifact publication can clobber a concurrent winner, `build all` returns a set ref before the final marker and all members verify, or incomplete publication is hidden behind a rejected result.
- Retention accepts bare digest domains, fails to expand a complete-set ref to every member artifact, or mutates from a channel-racy pin snapshot.
- Missing or tampered accepted artifact bytes trigger source reconstruction, fallback, or repair.
- A package/export request accepts snapshot-shaped data, a mutable buffer/path, an alternate production reader, or a caller-supplied native-home override.
- Export removes a path not proven by the same destination ledger, follows a symlink/hardlink/alias, uses recursive destination deletion, or treats a native provider home as an export destination.
- A no-op converge writes a file, directory, metadata field, ledger, artifact, package, or capsule.
- Capsule state can represent committed/pending independently, exceed its v1 bounds, admit concurrent generations, treat or remove the stable synchronization file as lifecycle state, settle an applied action without a validated observed-post binding, accept an action/target generation mismatch, lose an earlier destination from a multi-destination capsule, release a partial undo, dispatch a generic filesystem action, recursively clean during replay, or disagree with the returned transition union.
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
| State | inspected, converged, incomplete, settled, verified, green, landed, retired |
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
- `apps/cli/src/lib/agent-plugins/{layout,undo/**}` for verified-runtime root derivation, the controller-owned closed capsule state/store/recovery/replay, production `UndoWriter`, and the inert app-composition registration of the export-owned protocol, tested directly without a command;
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
| structural code quality | wrong-owner preservation, aggregate/wrapper resurrection, activation leaks, deletion and maintainability findings |
| architecture and authority | sole owners, qualified boundaries, dependency direction, activation closure, repository separation, and absence of a mixed or duplicate authority |
| behavior-first testing | B05-B10/B23-B25/B32 transitions and falsifiers, owner-scoped failures, idempotence, write/call oracles, and residual product risk |

Bounded implementation workers receive disjoint owner paths only after this bootstrap lands. Reviewers remain read-only and do not acquire product authority.

## Implementation Decisions

- Release protocol v1 bounds are 1,024 members, 16,384 total ownership claims, 16,384 payload entries per member, 64 MiB decoded payload bytes per member and across the complete set, and 96 MiB canonical release-input envelope bytes. These are parser/construction bounds, not lifecycle acceptance policy, and overflow is a closed prepublication rejection before aggregate payload allocation.
- Artifact no-replace publication is a build-owned platform adapter behind `NoReplacePublisher`. The pinned Bun controller runtime calls fd-relative Darwin `renameatx_np` with exclusive/no-follow flags or Linux `renameat2` with `RENAME_NOREPLACE`; opened canonical parent directories and direct-child basenames close parent substitution. Unsupported platform, missing symbol, unsupported filesystem, or an unclassifiable result fails closed. A disposable Darwin spike proved exact absent-target success and conflicting-target preservation; implementation tests still own failpoints and Linux/static adapter proof.
- Build performs one full eligibility revalidation before any staging and one cached final gate after staging immediately before the first possible durable publication. Its closing bounded porcelain-v2 status observes tracked, index, untracked, and ignored state after the closing repository anchor; that status is the supported ordinary-race linearization point. Subsequent member-by-member CAS commits use only the captured immutable commit/tree/blob bytes and do not re-read ambient worktree payloads or split one complete-set attempt across changing source observations. Partial results arise only from the publication transaction itself.
- Cowork v1 is a deliberately buffered classic ZIP bounded before copying or rendering to 65,534 entries, 64 MiB aggregate decoded payload, and 128 MiB projected archive bytes; unsafe arithmetic, filename overflow, and one-unit overbounds reject as `PackageRenderFailed` before output access.
- Controller workflows use one stable non-authoritative direct-child regular lock file held with OS advisory `flock` on pinned Darwin/Linux. The invocation that creates a brand-new capsule root creates the lock once with exclusive-create semantics; every existing-root path opens it without create and fails closed if it is missing. A successful begin returns a nonserializable applying-session capability that retains the same opened lock through stage/external-mutation/observed-post cycles and initiates one release on settle, abort, or explicit suspension for cold recovery. Applying recovery and undo each acquire and retain the same exclusion from their first state observation through final transition or unsettled return. Competing same-process or interprocess begin, recover, or undo is nonblocking busy and invokes no owner classifier, replay executor, or external mutation. Every terminal or unsettled path attempts synchronization release exactly once and reports `Released|ReleaseFailed` separately from its persisted lifecycle kind; a release diagnostic never rewrites a settled or unsettled state claim. Kernel close/crash release gives cold recovery without a stealable/removable mkdir lock. After initialization, controller code never unlinks, renames, replaces, or recreates the inode, persists it as session identity, or interprets it as lifecycle state; held-path revalidation blocks an observed alias or substitution without repairing it. Unsupported lock mechanics fail closed. Owner-typed `markApplied` settlement binds a bounded canonical observed-post value. A crash after external mutation but before that binding remains truthfully `applying` and blocked. Arbitrary external rewriting of the private controller state root is outside C2's product threat boundary, just as rewriting installed controller and selector bytes is outside the accepted initiative.
- Export canonicalizes destination execution order independently of caller order, preflights and begins once for the complete candidate, uses one ordered action-handle sequence, and settles once. Each canonical destination is one contiguous group in the candidate. Within a group, create-directory/write-payload actions stay in deterministic plan order, retire-payload follows the write phase, retire-directory follows payload retirement in bottom-up plan order, and the sole optional write-ledger action is final; duplicates, destination interleaving, phase regression, and ledger-first/middle forms reject before begin. Settlement accepts only a valid applied prefix of that admitted grammar and never requires a not-yet-applied final ledger. The controller's export codec jointly selects targets from action destination plus exact prior ledger generation/digest, rejects incomplete or foreign bindings, and derives only the applied target subset at settlement. The production registration delegates live classification, exact restore, and aggregate prior verification to export-owned functions; cold apply and undo therefore need neither source nor a proof-local fake.
- Every injectable export deletion/publication window re-admits the canonical parent after the failpoint, then proves the exact leaf identity/absence/emptiness before the syscall without another awaited gap. File publication carries the operation-created device/inode and metadata through final verification and observed-post binding, so same-byte foreign substitution cannot become ledger or capsule-owned. Pinned Bun directory-handle close accepts its runtime's synchronous-void result while still surfacing real close failures.
- Release input carries an exact `skillInventory` for every member and closes it bijectively against canonical `skills/<unit>/SKILL.md` payloads and ownership claims. Missing, extra, relabeled, toolkit-pack, composition-alias, top-level `agent-pack/**`, and root `plugin.yaml` identities reject before artifact work.
- The public build surface exports one closed `createGitContentWorkspaceSnapshotReader` factory. The generic command runner and object-reader injection remain internal/test mechanics; production filesystem access at the content boundary is limited to root metadata while payload bytes come from Git objects.
- Multi-member publication keeps the set invisible until every independently durable member verifies and the final set marker commits. A later-member failure leaves no usable set ref; a retry publishes only missing state and a fully converged repeat is read-only.
- Package publication validates the private temp and parent after the last precommit failpoint, commits the output entry, then verifies output identity as the final observation. Competing exact winners converge; foreign winners and cleanup failures remain truthful without truncating the live target.
- Capsule validation failures carry internal typed result codes from their source. Human-readable wording is detail only and cannot change the stable `CapsuleFailure.code` returned by the state machine.
- Cold-reopen proof uses fresh pinned-Bun processes across all five persisted applying transition classes and three undo replay boundaries after removing the generated source locator, so recovery depends only on the controller capsule and owner protocol.
- Generated content fixtures include personal-looking executable files and package execution metadata. Build treats them as inert Git bytes, never executes or filesystem-opens them, and produces no adjacent output; this proves repository path is a locator rather than controller authority.
- The permanent C2 architecture gate fixes the four project roots and full Nx edges, exact root-only exports, pure-import constraints, sole production artifact reader, CLI-only capsule persistence plus the inert CLI-to-export dependency-injection edge, inert command surface, root target/Vitest registration, and ordinary runtime-import ownership. It rejects every production `rm`/`rmSync` callsite and admits recursive removal only at exactly four test-fixture cleanup helpers. Those helpers guard the current test's top-level `mkdtemp` root and are exercised behaviorally; publication, cleanup, failpoint ordering, and substitution safety remain behavior/failpoint contracts rather than source-expression contracts. The gate also proves that the capsule owner's supported mutation calls cannot target its stable lock entry. Production build staging, packaging, export, capsule, and replay have no recursive-remove callsite.
- Cleanup enforcement is deliberately calibrated to supported code paths. It does not attempt to recognize obfuscated imports, arbitrary subprocess programs, runtime source rewriting, or other hostile-maintainer behavior. The fixture helpers themselves own the wrong-root guard; normal product cleanup uses explicit one-entry operations and behavioral tests.

## Gate And Proof Log

| Gate | Status | Evidence |
| --- | --- | --- |
| C1 source/archive landing and drain | PASS | PRs #333/#334; exact commits above; 41/41 C1 tasks attested in the archived record; no C1 local Graphite branch, node, or worktree remains |
| repository separation | PASS | bootstrap parent is clean Template `main`; personal amendment and packet objects are cited only as provenance; no cross-repository implementation relation exists |
| Nx first hop | PASS after dependency install | repository projects and graph inspected; `bun install --frozen-lockfile` restored dependencies in this new worktree |
| pinned OpenSpec creation | PASS | `bunx @fission-ai/openspec@1.3.1 new change establish-agent-plugin-release-product`; schema `spec-driven` |
| changeset completeness and strict validation | PASS | pinned `@fission-ai/openspec@1.3.1 validate --all --strict --no-interactive` passed the active change and both canonical specs (3/3); tracked and all ten new-file whitespace checks passed; proposal, design, five deltas, tasks, and this record agree |
| inherited architecture ratchets | PASS | controller classification reports 9 complete packages; official relink authority is absent; repository separation is structurally verified |
| standing bootstrap reviews | PASS | independent TypeScript/domain, behavior-first testing, structural-quality, and destructive-path reviews report no unresolved P1/P2 after repairs for digest/ref domains, partial set publication, no-replace winners, transitive pins, temp cleanup, owner-typed undo replay, linearizable admission, and C2/C3/C5 diagnosis allocation |
| bootstrap landing and drain | PASS | PR #335 merged reviewed commit `8638870ff396ed431f8d49788c0811df45ee8204` as exact Template `main` `23d1f1efcf54a4860fa55261df7f29e5c68d063f`; detached post-main proof passed pinned strict OpenSpec (3/3), all three architecture ratchets, and diff checks; Graphite pruned the merged branch with `--no-restack`, and the proof/bootstrap worktrees were removed only through `git worktree remove` before this fresh implementation worktree opened |
| scope correction | PASS | generalized subprocess, source-obfuscation, and hostile-maintainer ratchets were removed; the permanent gate now enforces only supported C2 topology plus direct production recursive-removal absence and the exact four guarded fixture-root helpers |
| owner implementation suites | PASS | uncached build/typecheck/lint/test passed for release 23/23, build 53/53, packaging 35/35, export 61/61, and CLI 273/273; one overloaded parallel CLI wave hit an unrelated existing 5-second test timeout, then the isolated test and complete serial CLI suite passed |
| integrated lifecycle proof | PASS | exact complete-set `rs1_a4a8855417b561c295e49da0f592a3851efb3bbdd782b50ab0cebcac4ffd7dfc`; package `pkg1_0c9c14769d2da69b5cd6b12d0fe23784841448466c9297de24e771572fd8c4ec`; first build/package/export mutate, repeats return `ReadOnlyConverged`; two destinations and 14 actions undo to restored state; 378 read-only Git commands, zero forbidden mutation calls, zero converged tree writes |
| permanent architecture and strict record gates | PASS | all inherited and C2 permanent gates, repository separation, projection boundaries, sync check, direct integration proof, pinned strict OpenSpec 3/3, `git diff --check`, and new-file trailing-whitespace scan passed |
| exact affected graph | PASS | uncached build/typecheck/lint/test passed for all 37 projects affected from `23d1f1efcf54a4860fa55261df7f29e5c68d063f` in the complete uncommitted state, committed source state, and exact landed `origin/main` tree |
| standing implementation reviews | PASS | TypeScript/refactoring repaired typed capsule failure classification so wording cannot change result codes; architecture/authority, behavior-first testing, and structural-quality reviews approved with no remaining packet-invariant, supported-behavior, or material-maintainability P1/P2 |
| source landing and post-main proof | PASS | PR #336 landed reviewed source as `dac4c6407dcc8d75adc34738f5ae9995a43a1810`; reviewed and landed trees both equal `acc62e861ee970d6567c2fb477ff2b796ea7a327`; pinned strict OpenSpec, permanent architecture/integration proof, and the exact uncached 37-project affected graph passed against landed `origin/main` |
| canonical spec synchronization and archive move | PASS | pinned OpenSpec archive synchronized 40 added requirements into five canonical capability specs and moved the active change to `archive/2026-07-16-establish-agent-plugin-release-product` after same-device and absent-destination checks; no recursive shell removal was used |
| archive landing and post-main proof | PASS | PR #337 landed reviewed archive commit `bba27c52941ef8cb5f66e1b801c446eb7378349e` as exact Template `main` `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2`; reviewed and landed trees both equal `ba692eb5bf22b83b8389ae98c069d454ad7961c9`; pinned strict canonical-spec validation passed 7/7, no active change remained, permanent architecture gates passed, and repository status was clean |
| Graphite and worktree drain | PASS | both C2 disposable worktrees were removed only through `git worktree remove`; Graphite metadata records each merged PR head with parent `main`, and `gt delete` removed the two merged local nodes without restacking C3 or unrelated work; `gt ls` and `git worktree list` contain no C2 node or worktree. Merged GitHub PR heads remain historical remote refs, not active local Graphite branches |

## Closure

The bootstrap settles when the changeset is complete and strict-valid, each in-scope B/I row has an owner and oracle, standing reviews have no unresolved P1/P2, the combined C1 attestation and C2 record land on canonical Template `main`, post-main validation is green, and this bootstrap Graphite branch/worktree are drained. Only then may a fresh C2 implementation worktree start from the exact landed bootstrap commit recorded above.

C2 is settled at source `main` commit `dac4c6407dcc8d75adc34738f5ae9995a43a1810` plus archive `main` commit `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2`. All implementation tasks and spec deltas are truthful, owner-specific and exact affected proof is green, no command or provider path reaches the inert applications, source-deletion and repeat-convergence oracles pass, and no C2 local Graphite node or disposable worktree remains. C3 starts independently from that exact clean Template `main`. Personal C6 starts independently from clean personal `main`; it never consumes Template through ancestry or executable-tree equivalence.
