# agent-plugin-build-artifact-store Specification

## Purpose
TBD - created by archiving change establish-agent-plugin-release-product. Update Purpose after archive.
## Requirements
### Requirement: Read-only explicit source eligibility
The Template-owned check application MUST accept an explicit content-workspace Git locator and verify repository identity, content authority, claimed commit and tree, tracked payload membership, staged and working-tree state, ignored and untracked consumed paths, path aliases, and release-input alignment without writing source, artifacts, lifecycle records, controller state, Oclif state, providers, destinations, or undo state. It MUST report dirty, staged, untracked-consumed, ignored-consumed, wrong-repository, wrong-tree, aliased, and payload-misaligned inputs as ineligible. If it reports a candidate digest for dirty work, it MUST label that digest ineligible.

#### Scenario: Every dirty input class remains read-only
- **WHEN** tracked worktree changes, staged changes, consumed untracked files, consumed ignored files, and commit-misaligned payloads are probed separately
- **THEN** check returns an ineligible classification naming the exact source-state reason
- **AND** all source, artifact, lifecycle, controller, Oclif, provider, destination, and undo write counters remain zero

#### Scenario: Wrong or aliased repository is rejected
- **WHEN** the locator resolves to the wrong repository, wrong tree, a path alias, or a checkout whose canonical identity differs from the claimed content authority
- **THEN** check reports ineligible without importing or executing repository code
- **AND** path similarity, shared ancestry, or tree equivalence does not grant authority

### Requirement: Eligible build is commit-aligned and fail-closed
The Template-owned build application MUST construct release bytes only after the same source eligibility proof succeeds and MUST consume exactly the bytes represented by the claimed commit and tree. One Git-object snapshot capability MUST resolve the canonical repository and exact commit/tree, enumerate every admitted path and Git object ID, and return bounded owned byte copies read from those immutable Git objects. The worktree filesystem is eligibility evidence only and MUST NOT supply release payload bytes. Build MUST revalidate repository identity, HEAD, index, worktree, ignored and untracked consumed paths, tree, and object bindings before opening artifact staging and immediately before publication. Its final eligibility linearization observation MUST be one bounded Git status view that includes tracked, index, untracked, and ignored state after the closing repository anchor; a late consumed untracked or ignored entry observed there MUST reject before publication. A failed eligibility, ownership, or canonicalization check MUST close every durable output port before artifact publication. Check and build MUST be separate owner-specific application entrypoints and MUST NOT delegate to the inherited mixed `agent-config-sync` or plugin aggregate.

#### Scenario: Ineligible source emits no durable bytes
- **WHEN** build encounters any dirty, staged, untracked-consumed, ignored-consumed, wrong-repository, wrong-tree, aliased, payload-misaligned, or ownership-conflicting input
- **THEN** it returns a deterministic failure before publishing a release, release set, package, export, ledger, or undo capsule
- **AND** temporary work is absent after guarded cleanup

#### Scenario: Source changes between verification and read
- **WHEN** a failpoint changes a payload file, Git index, commit, tree, or canonical repository identity after eligibility inspection but before construction completes
- **THEN** build detects the mismatch and publishes no durable artifact
- **AND** it does not retry against newer ambient source

#### Scenario: Worktree bytes cannot win a clean-check race
- **WHEN** a consumed worktree file changes between eligibility probes while the claimed commit and tree remain available
- **THEN** every candidate payload byte still comes only from the exact immutable Git blob object and final eligibility revalidation blocks publication
- **AND** no filesystem read, ambient retry, or later worktree state substitutes for the claimed object snapshot

#### Scenario: Late consumed path is visible at final eligibility
- **WHEN** a consumed untracked or ignored path appears after the final index/object observations but before the closing bounded status view
- **THEN** build rejects before the first durable artifact publication
- **AND** the closing status, not an earlier tracked-only scan, remains the supported ordinary-race linearization point

### Requirement: C2 proof isolates protected lanes
C2 implementation and acceptance proof MUST use generated fixture repositories and exact protected-root access and output traps. C2 applications and tests MUST NOT open, read, hash, materialize, build, package, export, release, distribute, rewrite, or re-evaluate the actual protected oRPC, effect-oRPC, Inngest, or effect-Inngest bytes. The accepted oRPC and effect-oRPC evidence set MUST remain read-only provenance, and pending HF01 MUST remain an external precondition to the later personal migration container. Generic check and build applications MUST NOT parse, validate, infer, or own the governed protected-lane record.

#### Scenario: Closed oRPC lane remains read-only evidence
- **WHEN** C2 proof exercises source eligibility, release construction, packaging, or export behavior relevant to the closed oRPC and effect-oRPC lane
- **THEN** it uses generated fixtures and records zero access to the actual protected roots and evidence bytes
- **AND** it does not re-evaluate the lane or turn its evidence and research locations into product authority

#### Scenario: Pending Inngest remains outside C2 applications
- **WHEN** C2 proof exercises a behavior analogous to a pending Inngest source or materialization destination
- **THEN** it uses a generated fixture and does not invoke a C2 application with actual protected bytes
- **AND** exact access and output traps prove zero materialization, build, package, export, release, distribution, or rewrite of the protected lane

### Requirement: Stable exact artifact storage
The artifact store MUST persist immutable releases, release sets, and related mechanical artifacts below a branded `ArtifactStoreRoot` derived only by the CLI-owned agent-plugin layout from verified `ControllerRuntimeContext.dataRoot` and injected into the service. The service MUST NOT read `HOME`, cwd, environment variables, a content path, or an independently discovered fallback to select that root. Every payload member MUST be an independently stored regular file; publication and verification MUST reject symlinks, outside-resolving links, and regular files whose link count is greater than one. Every handle MUST be an explicit digest or validated artifact path bound to a canonical manifest and bytes; a content checkout path, research-vault path, worktree, Git remote, or lifecycle record MUST NOT be an artifact handle. Lookup and verification MUST fail on missing, malformed, tampered, aliased, or digest-mismatched data and MUST NOT rebuild source as a substitute.

#### Scenario: Disposable source locator becomes unavailable
- **WHEN** a verified artifact is published from a generated fixture repository and that disposable fixture checkout is then made unavailable
- **THEN** digest lookup and artifact verification still return the exact immutable release bytes
- **AND** no path formerly used to locate source participates in artifact identity; the actual personal checkout and protected research locations are never used or mutated by this fixture

#### Scenario: Missing or tampered accepted artifact blocks
- **WHEN** a referenced artifact is deleted or any manifest, mode, link, or payload byte differs from its claimed digest
- **THEN** lookup reports missing or mismatched exactness and returns no usable artifact
- **AND** it performs no implicit rebuild, repair, source read, or replacement publication

#### Scenario: Shared inode is not immutable artifact storage
- **WHEN** an artifact payload file is hardlinked to a source checkout, sibling artifact, staging tree, or any other path
- **THEN** publication or verification rejects the shared inode before returning a usable handle
- **AND** byte equality and in-store realpath do not grant independent artifact ownership

#### Scenario: Ambient roots cannot redirect artifact state
- **WHEN** cwd, `HOME`, XDG values, `RAWR_DATA_DIR`, and content-workspace paths differ from the injected branded artifact root
- **THEN** artifact lookup and publication use only the root derived from the verified controller runtime context
- **AND** no fallback directory is read, created, or treated as artifact authority

### Requirement: One production artifact verification boundary
Export and packaging request types MUST accept only a closed parsed artifact reference containing the required distinct digest identities, never a verified snapshot, mutable path, or verification claim. Each consumer application MUST invoke its own injected read-only `ArtifactReader` port internally. The build and artifact owner MUST provide the sole production adapter for those structurally compatible consumer ports; it MUST verify the digest store and return an ownership-transferred immutable snapshot containing closed manifest values and owned payload byte copies with no mutable buffer or filesystem-path alias. Export and packaging MUST NOT import or call the build application. Alternate production CAS readers, duplicated verification logic, public snapshot constructors or casts, and path-only trust MUST be forbidden by production-composition and package-surface gates. Generated fakes are permitted only below test roots.

#### Scenario: Caller cannot supply a verified snapshot
- **WHEN** a caller attempts to submit snapshot-shaped data, a mutable path, or a verification claim instead of the closed artifact-reference request
- **THEN** request parsing rejects that unreachable shape before the artifact reader or any mutating port is called
- **AND** only the internally invoked reader result can enter package or export planning

#### Scenario: Verified snapshot closes the consumer race
- **WHEN** the artifact store is altered after the verification port has captured a closed manifest and payload snapshot
- **THEN** the consumer uses only the bound verified snapshot or fails exactness before mutation
- **AND** it never follows a mutable path to substitute later bytes

#### Scenario: Production composition has one artifact reader
- **WHEN** the production import graph and package exports are inspected
- **THEN** only the build and artifact owner can construct a filesystem-backed artifact reader and no command, service, or public cast can construct a verified snapshot
- **AND** test fakes remain unreachable outside declared test roots

### Requirement: Atomic idempotent artifact publication
Artifact publication MUST verify a private same-filesystem staging tree, then invoke a no-replace publication primitive that atomically creates the digest-qualified final path only if absent. Ordinary replace-capable rename is forbidden as a fallback. A matching existing or concurrently winning artifact MUST converge through verification with zero byte, metadata, directory, or timestamp writes. Existing or concurrently appearing nonmatching state at the claimed digest MUST be preserved and fail without replacement. A publication failure before commit MUST leave no visible partial artifact and MUST preserve every prior or winning artifact.

#### Scenario: Repeated verified publication is read-only
- **WHEN** an identical verified artifact is published after the digest path already contains the exact manifest and bytes
- **THEN** publication reports convergence after live verification
- **AND** performs zero copy, chmod, rename, timestamp, directory, cleanup, or manifest writes

#### Scenario: Failure cannot expose a partial digest path
- **WHEN** staging, verification, fsync, or no-replace publication fails before the publication commit
- **THEN** the final digest path is absent or contains one complete prior or concurrently winning artifact
- **AND** no other digest-qualified artifact changes

#### Scenario: Concurrent digest winner is never clobbered
- **WHEN** an exact or conflicting digest-path entry appears after initial inspection but before no-replace publication
- **THEN** an exact winner is fully verified and reported as read-only convergence while a conflicting winner is preserved and blocks
- **AND** no replace-capable rename, repair, recursive cleanup, or winner metadata write occurs

### Requirement: Complete-set publication commits last and reports partial output
A complete build MUST publish and verify every member release artifact before it publishes the `ReleaseSetDigest` envelope as the final complete-set commit marker. It MUST reverify the exact ordered member release/artifact graph immediately before that marker. A `CompleteSetArtifactRef` MUST NOT be returned unless the marker and every member verify. If a member commits but a later member or final marker does not, the immutable committed member remains valid append-only output but has no complete-set or retirement authority. Retry MUST verify and converge those exact members, publish only missing members, and commit the marker last.

#### Scenario: Member publication failure is truthful and retryable
- **WHEN** `build all` fails after one or more member artifact commits but before the complete-set marker verifies
- **THEN** the result identifies each newly published and pre-existing verified `ReleaseArtifactRef`, returns no `CompleteSetArtifactRef`, and grants no channel or omission authority
- **AND** retry performs no write for those members and may report complete publication only after every member and final set envelope verify

#### Scenario: Complete-set marker is the final commit
- **WHEN** a failpoint runs after every member commit and immediately before or after no-replace set-envelope publication
- **THEN** readers observe either no usable complete-set ref or the complete verified member graph
- **AND** no partial member graph is returned as a complete set

### Requirement: Pin-aware and ownership-bounded retention
Retention MUST receive a closed `RetentionPinsV1` containing only `ReleaseArtifactRef | CompleteSetArtifactRef` values through an explicit consumer-owned read port. It MUST verify each release ref's release/artifact pair and expand each complete-set ref to its set envelope plus every ordered member `ReleaseArtifactRef`; a missing or mismatched pinned graph MUST block the plan rather than label any reachable member collectible. Bare release, artifact, or set digest strings MUST NOT be accepted as pins. The artifact store MUST NOT parse, infer, select, or mutate a governed channel or acceptance record. C2 retention MUST be read-only planning: it MUST report only entries outside the verified expanded pin graph and independently eligible under a deterministic age or space policy, and it MUST NOT delete from a snapshot whose channel selection can race removal. Activating deletion requires a later race-safe authorization contract with the channel owner; pins alone MUST NOT authorize it. Current-operation private staging cleanup MUST prove immediately that the candidate is the exact canonical non-symlink directory it created directly below the expected private staging parent, its basename satisfies the owner-created private prefix, and its realpath equals the validated candidate. It MUST reconcile the visible tree to its operation-local owned-entry ledger, individually unlink only captured regular files, and remove captured empty directories bottom-up with nonrecursive `rmdir`; production build code MUST NOT invoke recursive removal. A failed type, containment, alias, link, identity, visible-tree, or ownership check MUST preserve the candidate and fail closed.

#### Scenario: Active channel pins the exact artifact graph
- **WHEN** the channel owner supplies verified release and complete-set refs and retention evaluates old entries
- **THEN** every release artifact, set envelope, and transitive set member in the expanded graph is preserved regardless of age or space pressure
- **AND** a bare wrong-domain digest or missing/mismatched member blocks planning without reading the channel record or reconstructing bytes

#### Scenario: Pin snapshot cannot race channel selection
- **WHEN** an unpinned artifact appears eligible in a retention snapshot while a future channel selection could reference it concurrently
- **THEN** C2 reports the candidate without deleting it
- **AND** no deletion becomes reachable until a later contract supplies race-safe retention authorization without becoming a second channel selector

#### Scenario: Symlink and non-directory staging targets are preserved
- **WHEN** a private staging candidate is replaced by a symlink, regular file, path alias, outside-parent target, wrong-prefix child, or directory not created by the current operation
- **THEN** guarded cleanup is rejected before any unlink or `rmdir`
- **AND** the candidate target and every unrelated source, artifact, provider, destination, and repository path remain unchanged

### Requirement: Build results are closed and truthful
Check MUST return exactly `EligibleReport` or `IneligibleReport`. Build MUST return exactly `RejectedBeforePublication`, `PublicationIncomplete`, `PublicationUnsettled`, `Published`, or `ReadOnlyConverged`, with targeted-release or complete-set mode represented as a discriminant rather than optional flags. `PublicationIncomplete` MUST carry the exact newly published and pre-existing verified refs while proving the requested final ref absent; `PublicationUnsettled` MUST carry only observed verified refs and an unknown final-commit classification when store observation itself failed. Neither may carry a usable requested complete-set ref. Artifact reads MUST return exactly `Verified`, `Missing`, or `Mismatch`, and retention MUST return `RetentionPlan` or `BlockedPinnedGraph`. Failure variants MUST preserve primary and cleanup failures without overclaiming output. Contradictory optional boolean bags MUST be unrepresentable.

#### Scenario: Build result cannot overclaim output
- **WHEN** eligibility, staging, verification, publication, or guarded cleanup fails
- **THEN** the returned discriminated variant matches whether a complete artifact became visible and includes every primary and cleanup failure permitted by that variant
- **AND** no rejected/incomplete/unsettled result carries an unverified requested handle and no converged result reports a write

### Requirement: Mechanical evidence uses the sole immutable artifact home
The build/artifact owner MUST expose a narrow opaque mechanical-evidence publication/read adapter below the existing stable Template digest-addressed artifact home. Provider deployment MUST supply canonical evidence bytes through its consumer-owned publisher port; the artifact owner MUST NOT generate, interpret, accept, promote, or deploy the evidence.

#### Scenario: Provider evidence publishes by digest
- **WHEN** provider deployment supplies bounded canonical evidence bytes and their verified digest
- **THEN** the artifact adapter publishes them immutably under that exact digest and returns an explicit evidence handle

### Requirement: Evidence publication is no-replace and exact
Mechanical-evidence publication MUST use atomic no-replace semantics, verify an existing exact winner as converged, reject a conflicting/tampered winner, and never truncate or replace live artifact state. Reading MUST reverify exact bytes and digest.

#### Scenario: Existing exact evidence is read-only
- **WHEN** identical canonical evidence already exists at its digest handle
- **THEN** publication returns converged after verification with zero writes or metadata churn

#### Scenario: Missing or tampered accepted evidence blocks
- **WHEN** governed acceptance references evidence that is missing, altered, or digest-mismatched
- **THEN** promotion and canonical deployment block without rebuilding, regenerating, or repairing evidence

### Requirement: Evidence publication failure does not rewrite target truth
Evidence publication occurs only after provider test target outcomes and receipts are truthfully settled. A publication failure MUST be reported independently and MUST NOT roll back, advance, or rewrite any target receipt, provider state, capsule, acceptance, or channel record. A retry MUST publish the same canonical digest from the same final verification facts without encoding transaction history or repeating provider mutation.

#### Scenario: Partial targets remain truthful when publication fails
- **WHEN** target A verifies, target B fails, and evidence publication also fails
- **THEN** A and B retain their exact target-local outcomes and receipts, the aggregate result reports both failures, and no receipt references a nonexistent aggregate evidence handle

### Requirement: Governed evidence handles participate in retention
Evidence handles referenced by an acceptance request, accepted outcome, promotion attestation, or active channel record MUST be eligible for the existing transitive retention/pin model and MUST NOT be collected while referenced.

#### Scenario: Active accepted evidence is retained
- **WHEN** the fixed channel transitively references an accepted mechanical-evidence handle
- **THEN** artifact retention preserves the evidence bytes together with the referenced release and set artifacts

### Requirement: Release and vendor modules preserve artifact authority
The lifecycle service's `releases` module MUST own explicit Git verification, release construction, content-addressed publication, lookup, verification, and retention. Its `vendors` module MUST own repository-vendor observation and reviewable authoring. Neither module may import provider adapters, export ledgers, packaging output ownership, Oclif state, app composition, acceptance authorization, or personal executable code. Their operator reachability MUST be limited to the exact qualified `rawr agent plugins check|build|vendors status|vendors update` typed procedures.

#### Scenario: Build cannot cross a state authority
- **WHEN** every non-build mutation port is instrumented during check, build, lookup, verification, retention, and vendor operations
- **THEN** only the explicitly selected artifact publication or reviewable vendor repository authoring may mutate its declared state
- **AND** no provider, export, package, Oclif, app, acceptance, controller-selection, or unrelated personal repository mutation occurs

