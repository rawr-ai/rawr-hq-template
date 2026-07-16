## Context

C1 landed one immutable Template controller and a guarded external-extension boundary. The remaining agent lifecycle implementation is migration substrate: `@rawr/cli`, `@rawr/plugin-plugins`, `@rawr/agent-config-sync-node`, and `@rawr/agent-config-sync` currently mix source paths, rendering, provider mutation, export, packaging, retirement, and workspace-rooted undo. C2 does not rename or wrap that chain. It establishes new inert owners whose contracts are exercised directly until C5 activates qualified commands and deletes the displaced surface.

The repository-separation amendment is controlling authority. Personal RAWR HQ supplies curated bytes and governed records only through explicit versioned data/artifact interfaces; Template imports no personal module, history, executable tree, or OpenSpec machinery. The content-workspace path is a Git/data locator and is never persisted as release, artifact, package, ledger, capsule, marketplace, or controller identity.

C2 starts from Template `main` commit `ce816a7b4bdb0a23b575ac5fb01e64625647b452`, after C1 source and archive landing. oRPC/effect-oRPC is a closed read-only evidence lane and Inngest remains `HF01_PENDING`; C2 uses generated fixture repositories and never scans or emits either lane's actual bytes.

## Goals / Non-Goals

**Goals:**

- Make release values canonical, provider-neutral, closed-world, and path-independent.
- Prove source/Git eligibility before any durable build output.
- Store exact immutable artifacts under stable Template data and keep them usable after source deletion.
- Provide deterministic package and managed export applications with one state owner per explicit output.
- Give export one typed inverse-action protocol while keeping the controller as the sole last-operation capsule owner.
- Encode command absence, service independence, protected lanes, idempotence, and destructive-path safety as permanent architecture/test rails.

**Non-Goals:**

- Public `rawr agent plugins` command files or controller-manifest activation.
- Provider rendering, native installation, capability negotiation, receipts, status, acceptance, promotion, channel selection, or canonical retirement.
- Oclif mutation, app composition, personal repository mutation, vendor network refresh, PKI, operation history, or generic destination projection.
- Reuse, delegation, or compatibility wrappers around the legacy aggregate.
- Mutation, materialization, build, package, export, or re-evaluation of protected oRPC/effect-oRPC or pending Inngest content.

## Decisions

### 1. Five owners replace the mixed lifecycle aggregate

The dependency shape is fixed:

```text
packages/agent-plugin-release
  |-> services/agent-plugin-build
  |-> services/agent-plugin-export
  `-> services/agent-plugin-packaging

apps/cli/src/lib/agent-plugins/undo
  <- typed inverse actions emitted through a consumer-owned UndoWriter port
```

The arrows from the pure package mean direct dependency; the three services do not call or import one another. Each service depends only on `@rawr/agent-plugin-release`, its consumer-owned ports, its own adapters, and narrowly justified runtime libraries. Package and export requests carry only a closed `ArtifactRef`; each application invokes its own `ArtifactReader` port internally. The build/artifact owner supplies the sole production adapter at the later composition root and transfers a closed immutable snapshot with owned byte copies, never a mutable path or caller-supplied snapshot. Generated adapters remain test-only. Export also owns a `KnownNativeHomesReader` port: C2 has test fakes only, C3 later supplies the sole provider-owned production adapter, and absence or an incomplete snapshot blocks before destination access. These read capabilities grant no artifact-store or provider mutation authority and do not make one service call another application. The pure release package imports no filesystem, Git, process, environment, clock, random, provider, Effect, oRPC, or application module. No new package imports `@rawr/hq-sdk`, a legacy agent-sync package, or a broad lifecycle SDK.

This is preferred over a renamed lifecycle service because each mutable state has a different owner: artifact store, explicit package output, export destination/ledger, and controller capsule. A shared aggregate would recreate the invalid transaction and status authority.

Module cohesion is fixed without an umbrella lifecycle barrel: the pure package exposes curated `primitives`, parse/issues/result, canonical encoding, release input/payload/release envelope, release-set, and ownership modules; build contains check/build applications, one Git-object snapshot adapter, CAS/publication/lookup, the production artifact reader, and retention planning; export contains closed requests/results, layouts, plan, ledger/transaction, and its three consumer ports; packaging contains closed requests/results, format rendering, atomic output, and its reader port; CLI agent-plugin internals contain root layout plus undo schema/store/transaction/recovery/replay. No package exposes a wildcard/deep adapter surface.

### 2. Content input is a versioned snapshot, not an imported repository

The build application receives an explicit `contentWorkspace` locator and expected repository-policy identity. One Git-object snapshot port resolves the canonical repository root, remote/ref policy, clean status, exact commit/tree, admitted paths, and Git object IDs, then reads bounded owned bytes from those immutable commit/tree/blob objects. Worktree files are eligibility evidence only and never supply release payload bytes. The port returns a bounded `ContentWorkspaceSnapshot` containing authority identity, repository identity, commit/tree, declared plugin manifests, release-input entries, object bindings, and owned bytes/digests. Absolute paths exist only inside the adapter call and are absent from persisted values.

`check` performs this inspection read-only and may report a candidate digest as ineligible. `build` captures its own snapshot rather than reusing a check token and accepts only clean committed Git-object bytes. It revalidates repository/HEAD/index/worktree/ignored-untracked/tree/object bindings before staging opens and immediately before publication. Tracked modifications, staged changes, untracked or ignored consumed files, repository/tree mismatch, path aliases, and payload drift fail without ambient retry or durable output.

Template test fixtures define the versioned content schema. Personal C6 later supplies declarative content conforming to it through an installed controller; C2 does not import or execute personal code.

### 3. Canonical values close release identity before effects

`@rawr/agent-plugin-release` parses closed input objects into branded IDs and discriminated unions, rejects unknown/path-unsafe fields, sorts unordered collections by declared semantic keys, and emits one canonical UTF-8/LF byte form. Digests are computed over digest-free payload values and placed in separate envelopes so identity is non-circular.

The digest DAG is exact: `ReleaseInputDigest = H(ReleaseInputBody)` over curated membership/payload inputs but not Git provenance or lifecycle records; `PayloadDigest = H(PayloadEntries)` over path/mode/bytes; `ReleaseDigest = H(ReleaseBody)` over provenance, release-input identity, curated identity, payload manifest/digest, vendor/curation, and protocols; `ArtifactDigest = H(ArtifactBody)` over `ReleaseBody`, `ReleaseDigest`, artifact protocol/manifest, and exact payload entries; and `ReleaseSetDigest = H(ReleaseSetBody)` over authority/provenance, release-input identity, completeness witness, ownership index, and ordered member release/artifact digests. Each uses a distinct opaque brand and parser; no digest field enters its own preimage or substitutes for another domain.

`AgentPluginRelease` binds content authority, repository/commit/tree provenance, release-input digest, plugin ID/aliases, canonical payload manifest/digest, vendor/curation bindings, and schema/builder protocol. `AgentPluginReleaseSet` binds one authority and snapshot, an ordered member list, and a complete ownership index. Its constructor also requires a canonical completeness witness derived from the same verified release input and rejects missing or extra releases against the expected member/ownership declarations. `build all` alone can supply that witness and create a set. Duplicate plugin IDs, skills, aliases, provider-facing identities, or destination claims, plus toolkit/composition-derived members, reject the complete plan before any artifact write. Targeted build may create individual releases but never claims complete membership or peer retirement.

Checkout path, traversal order, mtimes, lifecycle authorization records, test evidence, ledgers, receipts, and capsule state are excluded from identity. Every payload or membership input is included.

### 4. Artifact publication is one verified content-addressed transaction

The CLI-owned agent-plugin layout derives branded artifact and capsule roots only from verified `ControllerRuntimeContext.dataRoot` and injects them; services never read `HOME`, cwd, environment, content paths, or a fallback root. The build service owns a filesystem CAS below that injected artifact root:

```text
<ArtifactStoreRoot>/releases/sha256/<ArtifactDigest>/
<ArtifactStoreRoot>/sets/sha256/<ReleaseSetDigest>/
```

`ArtifactRef` is a closed union. A release ref binds its `ReleaseDigest` and `ArtifactDigest`. A complete-set ref binds `ReleaseSetDigest`; the verified set envelope supplies ordered member release/artifact digests, and the reader verifies the envelope plus every member before returning one immutable complete snapshot. No generic digest, caller-invented set-artifact digest, or partial set read is accepted.

Publication writes a private canonical direct-child staging directory, copies independent regular-file bytes, writes manifest/envelope metadata, flushes, and verifies the complete candidate. A platform `NoReplacePublisher` then atomically installs it at the absent digest path; an ordinary replace-capable rename fallback is forbidden. A late exact winner is verified read-only convergence. A conflicting, incomplete, aliased, symlinked, hardlinked, or tampered prior/late target is preserved and blocks, never replaced or repaired.

`build all` may publish member release artifacts independently, then reverifies the exact ordered graph and publishes the `ReleaseSetDigest` envelope last as the complete-set commit marker. A failure after any member reports `PublicationIncomplete` with exact newly published and pre-existing refs but no complete-set ref; an observation failure reports `PublicationUnsettled`. Append-only members remain harmless without set/channel authority, and retry converges them before writing only missing members and the final marker. Failpoints cover every member commit and both sides of set-marker publication.

Reads always verify the requested distinct release/set/artifact digests. Removing the source checkout cannot affect the artifact. Export and packaging accept only refs and invoke their reader internally; the artifact owner's sole production adapter returns ownership-transferred immutable values/byte copies. Caller-minted snapshots, mutable buffers, public snapshot casts, or alternate production readers are forbidden by request shape, package surface, and composition graph. Retention receives only closed `RetentionPinsV1` refs. It verifies release pairs and expands a complete-set ref to its envelope plus every member artifact; bare digests or missing/mismatched graphs block the plan. The port has no channel authority, missing accepted bytes never reconstruct, and no pinned transitive member is labeled collectible.

C2 publishes artifacts append-only and exposes no digest deletion or collection mutation. A pin snapshot cannot be made atomic with a future repository-owned channel selection inside this container, so retention is read-only planning until a later accepted protocol can prove race-safe cross-owner retention without becoming another channel selector. Product recursive deletion is permitted only for an owner-created private staging root after immediately proving its exact canonical parent, direct-child private prefix, `lstat` non-symlink-directory type, and exact `realpath`. A test may recursively remove only its exact top-level `mkdtemp` fixture root under the same immediate checks, never an internal destination, package, capsule, artifact, source, provider, or repository path. No artifact-digest or broad artifact-home deletion exists.

### 5. Export is a destination-local state machine, not provider deployment

The export request accepts exactly one parsed artifact-ref mode, one `codex|claude` layout, explicit absolute destinations, and `managed-only|replace-planned` policy. Export invokes its `ArtifactReader` and `KnownNativeHomesReader` ports internally. The latter must return a versioned, digest-bound complete snapshot of canonical homes; callers cannot supply or override homes, missing/incomplete read models block, and any overlap with any returned home blocks. C2 supplies only generated test fakes; the C3 provider owner later supplies the sole production read adapter without giving export provider mutation or ambient discovery authority.

Each canonical destination owns one versioned ledger containing its canonical destination identity, layout, generation, managed plugin scopes, exact relative file/directory claims, payload digests, and prior-state binding needed for truthful inverse settlement. Each plugin scope binds its own release provenance. An optional complete-set claim binds a set digest and exact member mapping only while every scope matches; a targeted mutation preserves peer scopes but clears that claim, while a targeted no-op preserves a still-truthful byte-identical ledger. Ledger lookup fails closed on malformed data, identity mismatch, symlink, alias, hardlink, nonregular file, or containment failure. Ledger publication binds the expected generation and digest, revalidates them immediately before a private same-parent atomic replacement, and rejects stale or partial state. `managed-only` blocks on any unmanaged planned path. `replace-planned` may capture and adopt only an exact current-plan non-aliased regular file with link count one. Targeted export updates only selected member claims and cannot retire peers. Complete-set export may retire absent entries only when the same destination ledger proves ownership. A destination overlapping any declared native home always blocks.

Payload writes walk and revalidate each destination parent component without following symlinks, reject aliased, hardlinked, directory-valued, special, outside-resolving, or changed live entries, and never open or truncate the live target. Publication writes and verifies an owner-created private same-parent regular file, revalidates the captured live entry immediately before commit, atomically replaces the path entry, then verifies destination-visible type, containment, link count, and digest. Missing planned directories are created only component by component under the same checks. Publication failpoints therefore expose an exact prior or verified replacement entry and never unlock orphan cleanup from an unverified result.

Application order is plan, validate every path/claim, capture exact prior state and expected after-state, preflight bounds, atomically transition controller state to `applying`, write/replace planned files, verify complete visibility, retire only ledger-owned orphans, write the final ledger, reconcile the exact applied subset, then compare-and-transition to `idle` with that subset as the committed capsule. Unmanaged neighbors survive. Files are unlinked individually after `lstat` and canonical containment/claim checks; only recorded empty directories are pruned bottom-up with non-recursive `rmdir`. Destination cleanup never uses recursive removal.

An exact repeated export still inventories live destination and ledger state but performs zero file, directory, metadata, ledger, capsule, provider, or Oclif write.

### 6. Packaging is deterministic explicit output and Cowork is only a format

Packaging accepts only a closed artifact ref and invokes its internal `ArtifactReader`; format adapters receive the returned immutable canonical manifest and owned payload bytes, sort entries, normalize modes and archive metadata, fix timestamps, and exclude locator/prior-output state. Cowork produces a valid deterministic ZIP/manual-upload artifact and creates no home, marketplace, provider receipt, status, enablement, or sync claim.

The sole mutation is the explicitly requested output. Staging uses an owner-created verified private same-parent regular file; identical existing bytes converge without rewrite. A different output is atomically replaced only under the explicit file contract, never by opening/truncating the live target or recursively clearing its parent. Failed-temp cleanup revalidates canonical parent/direct-child prefix, current-writer identity, `lstat` regular non-symlink type, link count one, and containment before one-file unlink; substitution is preserved and reported.

### 7. The controller owns one transactional last-operation capsule

Stateful applications receive a consumer-owned `UndoWriter`; they never resolve or persist a capsule path. The controller library under `apps/cli/src/lib/agent-plugins/undo/**` owns one closed persisted `CapsuleState` below the injected branded capsule root: `idle` with zero/one committed capsule, `applying` with its prior capsule and current candidate, or `undoing` with its committed capsule and replay settlement. Independent optional committed/pending files are forbidden. A linearizable controller store atomically begins a transition and returns an opaque generation token bound to the state digest and target ledger/receipt generations. Stage, settle, abort, recovery, and clear are compare-and-set transitions requiring the same token; concurrent begin, stale tokens, `applying`, or `undoing` block unrelated mutation. Any synchronization-only admission directory is released only after immediate canonical parent/direct-child, non-symlink-directory, captured entry-identity, token/generation/current-owner, and emptiness proof followed by one non-recursive `rmdir`; stale, replaced, foreign, or reacquired entries are preserved.

Before atomic begin, protocol v1 preflights the complete worst-case candidate against 4,096 actions, 16,384 distinct relative paths, 64 MiB decoded prior bytes, and 96 MiB canonical serialized state; overflow rejects before mutation and never spills. Before each external mutation, `applying` durably records exact before/expected-after data. Recovery reconciles live state to classify the exact applied subset. No mutation token-aborts to the prior `idle`; any applied subset, including failed verification, settles as operation B over A; ambiguous state remains `applying` and blocks.

Undo compare-transitions `idle` to `undoing`, validates owner/target, and replays in reverse. Failure or process exit remains durably `undoing`, so a cold process must classify already-restored/prior/post/ambiguous state and resume only that generation; no B can strand a partial undo. Exact restoration compare-transitions to `idle` with no capsule. The single state machine plus generation fencing prevents concurrent begin, stale settlement, destination-ledger lost updates, and clear-versus-commit races. It provides no history query, expiry, generic cleanup, or authorization to delete state not named by inverse actions.

Replay dispatch is a closed owner/version match, not a generic filesystem capability. C2 wires only `ExportInverseActionV1` to the export owner's inverse executor. That executor revalidates the canonical destination, ledger generation/claim, exact relative path, and bound prior/expected-post entry before every mutation. It restores prior bytes through a verified private same-parent file with atomic expected-state replacement or no-replace publication into expected absence; it restores prior absence through individual unlink only after immediate canonical containment, exact expected-post identity/digest, regular-file, non-symlink, and link-count-one checks. It prunes only action-recorded empty directories bottom-up with non-recursive `rmdir`. Replay-temp cleanup uses the same direct-child private-prefix, current-writer identity, `lstat`, link-count-one, and realpath proof before one-file unlink. Substitution, aliasing, a hardlink, foreign state, nonemptiness, or an authority mismatch preserves the object and leaves the generation `undoing`; no recursive replay cleanup exists.

C2 proves this library and export integration directly. The future `agent plugins undo` command and provider/multi-home inverse actions belong to C5 and C3 respectively; the existing root undo command is untouched.

Generated malformed or broken-plugin fixtures remain diagnosable through closed check/parser results without executing content or repairing another owner, and targeted artifact applications do not need unrelated members to parse or run. C2 adds no public removal path: C3 owns provider-specific diagnosis/removal semantics, and C5 proves that the qualified installed commands can diagnose and remove a broken curated plugin while deleting the mixed aggregate.

### 8. Inert applications and architecture guards enforce the activation boundary

C2 exports owner-specific application entrypoints for direct tests only. It adds no file below `apps/cli/src/commands/agent/plugins/**`, no controller classification/manifest row, no alias, and no import/call from a legacy command or aggregate. Permanent gates assert the exact Nx graph (pure release has no workspace dependency; each service has only release among the new owners), pure-import/global exclusions, sole production artifact-reader construction, test-only fakes, curated package exports and negative type fixtures, CLI-only capsule persistence, append-only CAS, root target/Vitest registration, and dependency reachability from CLI/Oclif entry roots. A text-only absence scan cannot substitute for graph reachability.

This is preferred over temporarily delegating old commands to new services because delegation would make a partial C2 product reachable through the wrong ontology and preserve the aggregate as authority. C5 activates the complete qualified surface while deleting the old tree.

### 9. Typed results report authority-local truth

Results are closed exhaustive discriminated unions rather than optional event bags. Check is `EligibleReport|IneligibleReport`; build is `RejectedBeforePublication|PublicationIncomplete|PublicationUnsettled|Published|ReadOnlyConverged`; package is `RejectedBeforeOutputMutation|ReadOnlyConverged|OutputReplacedVerified|OutputUnsettled`; each export destination and the aggregate are `ReadOnlyConverged|RejectedBeforeMutation|MutatedSettled|MutatedUnsettled`; undo is `NoCommittedCapsule|RejectedBeforeReplay|RestoredAndCleared|ReplayUnsettled`. Build's incomplete/unsettled variants enumerate durable verified member refs but never expose an unverified requested set ref. Only unsettled mutation variants carry applied-but-unverified events, a pending generation, or recovery. Failures preserve primary and cleanup errors. No service returns aggregate provider/channel health or permits contradictory state claims.

## Risks / Trade-offs

- **[Temporary inert duplicate capability]** Legacy commands still contain older behavior until C5. **Mitigation:** no import or call in either direction, new code is directly test-only, architecture guards prevent reachability, and C5 owns deletion/activation as one cutover.
- **[Canonicalization omission]** A semantically relevant field could be excluded from a digest. **Mitigation:** admitted/excluded input ledgers, mutation/property tests for every field class, digest-free envelope separation, and exhaustive closed parsers.
- **[Filesystem alias or destructive cleanup]** Symlinks, hardlinks, path races, or broad removal could escape ownership. **Mitigation:** canonical identities, immediate `lstat`/realpath checks, independent files, individual destination unlink, non-recursive directory pruning, and guarded private-root recursive cleanup only.
- **[Partial export without usable undo]** Mutation may succeed before capsule settlement. **Mitigation:** durable pre-mutation `applying` state, exact before/after bindings, applied-subset reconciliation including failed targets, explicit crash/failpoints, truthful unsettled results, cold recovery, and no next operation while state is unresolved.
- **[Concurrent lifecycle mutation loses inverse or ledger state]** Two operations could otherwise share one observed capsule or ledger generation. **Mitigation:** atomic exclusive controller admission, generation-token-bound stage/commit/abort/clear, ledger expected-generation checks, stale-token rejection, and concurrent-start/clear-versus-commit breakers.
- **[Artifact pinning leaks channel authority]** A CAS collector could infer current desired state. **Mitigation:** pins arrive through an explicit consumer-owned read port; C2 neither parses nor writes the canonical channel.
- **[Protected content accidentally enters fixtures]** Repository scans could touch real oRPC/Inngest bytes. **Mitigation:** generated repositories only, exact protected-root guards, no primary personal checkout access, and no legacy sync command.

## Migration Plan

1. Land this changeset-only bootstrap and the C1 closure attestation; drain its Graphite branch/worktree.
2. Open a fresh C2 implementation worktree from the landed bootstrap main and record that exact parent in `README.md`.
3. Add breaker-first generated Git, CAS, destination, package, and capsule fixtures plus activation/protected-path guards.
4. Implement the pure release package, then build/CAS, packaging, export, and controller capsule in dependency order. Mine legacy behavior/tests without importing legacy owners or types.
5. Run owner-specific and uncached affected proof, standing TypeScript/testing/structural reviews, exact installed-controller command-absence proof, and strict OpenSpec validation.
6. Land source and archive records through Graphite, prove merged main, then drain C2 before C3 or C5 depends on it.

Rollback before C5 is a source revert because C2 has no public reachability. Test artifacts, destinations, and capsules use explicit disposable roots and are removed only through their owning guarded cleanup paths. No provider, Oclif, personal repository, or protected-lane rollback exists in C2.

## Open Questions

None block implementation. Any evidence that requires a provider adapter, canonical acceptance/channel authority, a second undo store, personal executable import, legacy aggregate delegation, or unguarded recursive destination deletion is a redesign trigger rather than an implementation choice.
