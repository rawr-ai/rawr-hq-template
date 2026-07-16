## 1. Bootstrap Authority And Landing

- [x] 1.1 Attest C1 archive landing, exact post-main proof, 41/41 task closure, and local Graphite/worktree drain in the archived C1 record without creating new lifecycle authority.
- [x] 1.2 Bind this C2 record to the superseding repository-separation amendment, accepted packet provenance, exact clean Template parent, C2 B/I corpus, owner ledger, activation boundary, protected lanes, destructive-path policy, and closure contract.
- [x] 1.3 Pass pinned strict OpenSpec validation and independent TypeScript, behavior-first testing, structural-quality, and destructive-path reviews with no unresolved P1/P2; advance the record to `READY_TO_SUBMIT`.
- [ ] 1.4 Land this changeset-only bootstrap through Graphite with `--ai`, prove exact Template `main`, drain the bootstrap branch/worktree, then open a fresh implementation worktree from and record that landed commit before any implementation-code edit.

## 2. Breaker Fixtures And Architecture Rails

- [ ] 2.1 Add generated content Git repositories covering clean, tracked-dirty, staged, untracked-consumed, ignored-consumed, wrong-repository, wrong-tree, aliased-locator, payload-race, and source-deletion states for B06/B10/B32.
- [ ] 2.2 Add disposable artifact, package, destination, ledger, and capsule fixtures with filesystem snapshots, mutation-port counters, private-temp and live-target substitution races, concurrent starts, cold-process reopen at every transaction/replay boundary, and deterministic failpoints for B05/B10/B23-B25.
- [ ] 2.3 Add exact Nx/import/package-surface/production-composition gates: release has zero workspace dependencies; each service's only new workspace dependency is release; no sibling service, legacy aggregate, `hq-sdk`, app, personal, protected-lane, or provider edge; only build constructs the production artifact reader; only CLI undo persists capsule state; test fakes stay below tests; no wildcard adapter exports or public snapshot casts.
- [ ] 2.4 Add protected-root access/output traps proving generated fixtures only, no actual oRPC/effect-oRPC or Inngest/effect-Inngest bytes, no primary-personal checkout access, and no legacy `rawr plugins sync` invocation.
- [ ] 2.5 Add a destructive-path gate allowing recursive removal only for an immediately revalidated owner-created product staging root or the current test's exact top-level `mkdtemp` fixture root under canonical-parent/direct-child/prefix, `lstat` non-symlink-directory, and exact-realpath checks; forbid artifact-digest and internal destination/package/capsule/source/provider/repository recursion.

## 3. Pure Release Product

- [ ] 3.1 Create `@rawr/agent-plugin-release` with cohesive `primitives`, parser/issues/result, canonical encoder, release input/payload/release envelope, release-set, and ownership modules behind one curated root export; add no wildcard/deep adapter exports or filesystem, Git, process, environment, clock, random, provider, Effect, oRPC, application, or workspace dependency.
- [ ] 3.2 Implement canonical UTF-8/LF digest-free bodies and envelopes with distinct opaque `ReleaseInputDigest`, `PayloadDigest`, `ReleaseDigest`, `ArtifactDigest`, and `ReleaseSetDigest` brands plus the exact non-circular preimage DAG and closed `ReleaseArtifactRef|CompleteSetArtifactRef` graph.
- [ ] 3.3 Implement provider-neutral `AgentPluginRelease` construction with complete admitted-input coverage and explicit exclusion of checkout, traversal, mtime, authorization, ledger, receipt, and capsule state.
- [ ] 3.4 Implement `AgentPluginReleaseSet` construction so only a verified-input completeness witness from `build all` can produce closed membership, missing/extra members reject, and every member shares one content authority, repository, commit, tree, and release-input identity.
- [ ] 3.5 Implement the complete deterministic distribution ownership index and reject every duplicate plugin, skill, alias, provider-facing identity, destination claim, missing owner, toolkit unit, and composition alias before publication.
- [ ] 3.6 Prove B07-B09 with field-class mutation properties, order/path permutations, digest-brand negative compile fixtures, deterministic all-conflict reports, omitted/extra membership, mixed-authority rejection, complete-set graph verification, and targeted non-retirement/non-convergence behavior.

## 4. Git Eligibility And Build Application

- [ ] 4.1 Create `@rawr/agent-plugin-build` owner-specific `check` and `build` applications over one Git-object snapshot port, artifact store, pin reader, and closed result unions; expose the sole production adapter structurally satisfying consumer-owned `ArtifactReader` ports without importing a consumer or displaced aggregate.
- [ ] 4.2 Implement read-only canonical Git locator verification and exact commit/tree/blob enumeration/reads for repository policy, clean index/worktree, consumed membership, ignored/untracked payloads, path aliases, and release-input alignment; record filesystem payload opens at zero.
- [ ] 4.3 Implement a bounded owned-byte Git snapshot that removes absolute paths before pure construction, never reuses a check token, and revalidates repository/HEAD/index/worktree/ignored-untracked/tree/object bindings before staging and immediately before publication across dirty/reset/ref/index/worktree races.
- [ ] 4.4 Trap every durable output until eligibility, canonicalization, complete ownership, and C2 protected-path isolation succeed; preserve primary plus guarded-cleanup failure truth.
- [ ] 4.5 Prove B05/B06/B32 with separate read-only check and fail-closed build tests, mutation counters, source races, personal-like misleading executable files, and source-checkout removal.

## 5. Immutable Artifact Store

- [ ] 5.1 Add the CLI-owned agent-plugin layout deriving branded `ArtifactStoreRoot` and `CapsuleRoot` only from verified `ControllerRuntimeContext.dataRoot`; inject disposable branded roots in tests and prove no service reads env, `HOME`, cwd, content paths, or fallback roots.
- [ ] 5.2 Implement the split digest-addressed CAS for release `ArtifactDigest` entries and `ReleaseSetDigest` envelopes with closed release/complete-set refs, exact member graph verification, independently committed member artifacts, and the set envelope published last as the complete-set marker; include no checkout, worktree, research, or channel identity.
- [ ] 5.3 Implement private same-filesystem staging, independent regular-file copies, manifest/mode/digest verification, flush, and atomic no-replace final publication with no replace-capable fallback; supply and prove supported Darwin/Linux adapters plus fail-closed unsupported-platform/filesystem behavior, verify a late exact winner as convergence, and preserve/block on a late conflicting winner, symlink, alias, shared hardlink, or malformed target.
- [ ] 5.4 Implement exact lookup plus the sole production `ArtifactReader` adapter returning closed ownership-transferred immutable values/owned byte copies; block missing/tampered data, caller-supplied snapshots, mutable aliasing, alternate readers, rebuild, repair, and source substitution.
- [ ] 5.5 Implement read-only retention planning from closed `RetentionPinsV1` values containing only release or complete-set artifact refs; verify release pairs, transitively expand set envelopes to every member, block missing/mismatched graphs and bare digests, parse no channel, expose no C2 artifact-deletion API, and record race-safe cross-owner retention as a later protocol prerequisite rather than inventing a second selector.
- [ ] 5.6 Prove B10/I12 with publication/read failpoints around every member and the final set marker, truthful `PublicationIncomplete|PublicationUnsettled` refs and retry convergence, Darwin/Linux no-replace adapter contract plus unsupported rejection, late exact/conflicting winners, conflicting/tampered/shared-inode artifacts, complete-set member faults, caller-buffer/CAS mutation after reader return, transitive ref pins, missing accepted bytes, source deletion, and zero-write repeated paths.
- [ ] 5.7 Audit every staging recursive removal and prove immediate canonical parent, owner-created direct-child/private-prefix identity, `lstat`, non-symlink directory, and exact realpath checks under substitution races; prove no artifact-digest deletion path exists.

## 6. Deterministic Packaging

- [ ] 6.1 Create `@rawr/agent-plugin-packaging` with a closed artifact-ref request, closed result union, consumer-owned `ArtifactReader`, one versioned format, and one explicit output file only.
- [ ] 6.2 Implement canonical entry order, paths, modes, metadata, and fixed archive timestamps, including a deterministic valid Cowork ZIP with no provider semantics.
- [ ] 6.3 Implement verified same-parent temporary-file publication and atomic path-entry replacement without opening/truncating the live target; guard failed-temp one-file unlink by canonical-parent/direct-child/private-prefix, current-writer identity, immediate `lstat`, link-count-one, and realpath proof; reject aliases, symlinks, hardlinks, directories/special files, changed captures, recursive cleanup, and every hidden state output.
- [ ] 6.4 Prove B24/I12/I14 across source path/removal, cwd, mtime, traversal, prior-output, format and failpoint permutations, including exact-output read-only convergence, substituted private temps, cleanup-failure truth, and trapped adjacent authorities.

## 7. Managed Export Destinations

- [ ] 7.1 Create `@rawr/agent-plugin-export` with a closed artifact-ref request/result union, consumer-owned `ArtifactReader`, test-only `KnownNativeHomesReader` fakes, `codex|claude` layout, explicit destinations, and `managed-only|replace-planned`; reject caller home overrides and block without a complete reader snapshot pending C3's sole production adapter.
- [ ] 7.2 Implement one canonical destination ledger with generation/digest fencing, per-plugin release provenance, optional truthful complete-set claim, exact claims/digests, fail-closed parsing and type/alias/hardlink/containment checks, atomic old-or-complete-new publication, and duplicate/stale-writer rejection.
- [ ] 7.3 Implement deterministic artifact-backed Codex and Claude plans, default unmanaged-collision blocking, exact reversible `replace-planned` adoption, unconditional complete-snapshot native-home overlap rejection, and path-safe same-parent payload/ledger publication that never opens/truncates a live target and guards failed private-temp one-file unlink by current-operation identity and immediate canonical/type/link/realpath checks.
- [ ] 7.4 Implement the per-destination inspect/plan/capture/pre-mutation-inverse-stage/apply/verify/retire/final-verify/ledger-commit/applied-subset-settlement transaction with truthful owner-scoped events and inverse coverage for every mutation actually applied.
- [ ] 7.5 Implement targeted scope preservation and complete-set ledger-bounded orphan retirement only after replacement visibility; unlink exact claimed files individually and prune only revalidated recorded empty directories bottom-up with non-recursive `rmdir`.
- [ ] 7.6 Prove B23/I07/I08/I12 with full-S1/targeted-A2/full-S2 ledger truth, multi-destination partial failures, ledger publication failpoints/generation conflicts, managed/unmanaged collisions, payload/orphan/private-temp symlink-hardlink substitutions, cleanup-failure truth, shared names, native-reader absence/override/overlap, unmanaged descendants, and zero-write repeat.
- [ ] 7.7 Audit export to prove no recursive destination removal, provider/Oclif/controller-selection/manifest/relink/channel/personal mutation, controller write outside the declared generation-fenced `UndoWriter`, service-local capsule, generic projection fallback, or cross-destination cleanup authority.

## 8. Controller Last-Operation Capsule

- [ ] 8.1 Define closed typed inverse actions, `UndoWriter`, result unions, opaque generations/tokens, and one persisted `idle|applying|undoing CapsuleState`; validate owner/version/target/path/prior/post bindings and forbid independent optional stores.
- [ ] 8.2 Implement a linearizable CLI-owned capsule store under injected `CapsuleRoot` with atomic exclusive begin and token-bound compare-and-set stage/settle/abort/recover/clear; path-check atomic state publication and bind synchronization-only admission `rmdir` to immediate canonical parent/direct-child, captured directory identity, matching token/generation/current owner, and emptiness proof without recursive removal.
- [ ] 8.3 Enforce protocol-v1 pre-mutation caps of 4,096 actions, 16,384 paths, 64 MiB decoded prior bytes, and 96 MiB serialized state with byte-exact boundary tests and no spill store.
- [ ] 8.4 Integrate export so exact before/after inverse data is durable before each mutation, no-op stays read-only, no-applied failure token-aborts to A, every applied subset settles as B, and ambiguous `applying` state blocks until cold recovery.
- [ ] 8.5 Implement `idle -> undoing` closed owner/version dispatch and reverse replay with C2's export-specific executor, live classification of post/already-restored/prior/ambiguous actions, verified same-parent atomic restore, no-replace restore into expected absence, exact expected-post one-file unlink, action-recorded empty-directory non-recursive `rmdir`, durable partial-failure blocking, cold-process recovery, exact verification, and token-bound `undoing -> idle{committed:null}`; expose no generic path or recursive cleanup executor.
- [ ] 8.6 Prove B25/I13/I12 with concurrent starts, stale tokens, clear-vs-commit, stale admission release after replacement/reacquisition, A-then-B, converged no-op, every mutation/replay/state-replace crash boundary, partial multi-destination apply/undo, expected-post/ledger/capsule-state-temp/replay-temp/directory substitutions including hardlinks and nonempty directories, guarded cleanup-failure truth, malformed actions, source deletion, bounds, zero recursive replay calls, and absence of history/scan/GC APIs.

## 9. Integrated Proof And Review

- [ ] 9.1 Run uncached build, typecheck, lint, test, and structural targets for each new owner, then the exact Nx affected graph from the recorded bootstrap-main base with uncommitted and committed implementation states.
- [ ] 9.2 Run pinned strict OpenSpec validation plus exact Nx edges, pure imports/globals, production composition, package surfaces/type-negative fixtures, capsule ownership, activation reachability, append-only CAS, root target/Vitest registration, repository separation, protected/destructive paths, and `git diff --check` gates.
- [ ] 9.3 Prove direct internal application integration from explicit content locator through immutable artifacts to deterministic package/export and controller capsule while provider, Oclif, personal, acceptance, channel, and command mutation ports remain trapped.
- [ ] 9.4 Complete final TypeScript, behavior/transaction, structural-quality, and independent recursive-delete reviews; repair and rerun affected proof until no P1/P2 remains.
- [ ] 9.5 Record exact commands, digests, project counts, failpoint results, reviewer dispositions, and residual named deferrals in this README without claiming C3/C5 behavior.

## 10. Landing, Archive, And Drain

- [ ] 10.1 Commit and submit the reviewed C2 source through Graphite with `--ai`, merge to canonical Template `main`, and rerun exact post-main OpenSpec, architecture, affected-graph, and inert end-to-end proof.
- [ ] 10.2 Sync the five truthful capability deltas into canonical specs and move the completed change to its dated archive through a guarded same-filesystem non-recursive move only after source landing.
- [ ] 10.3 Land the archive record through Graphite, prove canonical Template `main` and repository status clean/green, and record exact source/archive commits and PRs.
- [ ] 10.4 Remove every C2 disposable worktree only through `git worktree remove`, prune merged local Graphite branches without restacking unrelated work, prove no C2 stack node or worktree-backed authority remains, and open C3 only after full drain.
