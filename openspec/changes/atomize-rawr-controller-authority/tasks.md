## 1. OpenSpec And Authority Gate

- [x] 1.1 Record the landed C0 commit/tree as design provenance, cite the superseding repository-separation amendment, bind Template parent `4daa77b1904212d13f50bf6af0c88b4cc96a1ad7`, and declare the C1 write/protected sets in this changeset.
- [x] 1.2 Pass pinned strict OpenSpec validation and obtain TypeScript, behavior-first testing, and structural-quality reviews with no unresolved P1/P2 findings; record dispositions in `README.md`.
- [ ] 1.3 Land this changeset-only bootstrap on Template `main`, drain its Graphite branch/worktree, and record the landed bootstrap commit before any implementation code is committed.

## 2. Breaker-First Controller Fixtures

- [ ] 2.1 In `apps/cli/test/controller-fixture/**`, create isolated data-root/home helpers that materialize controller A/B releases, trap every write port, and can delete all source/verifier worktrees after activation (B01, B02, B32).
- [ ] 2.2 Add failing target-trampoline, selector-record, bundled-runtime, launcher/verifier-dependency, and member substitution cases for path, digest, platform, architecture, version, package, command, topic, alias, hidden-alias, hook, lock, and cross-revision mismatch; include a valid trampoline from the wrong target and an imported verifier sentinel, then assert zero pre-verification filesystem-module loads, read-only failure, and exact prior selector bytes (B01).
- [ ] 2.3 Add activation failpoints before validation and selector replacement, during canonical selector write/fsync/rename, between the trampoline's one record read and digest-qualified exec, entry-argument versus loaded-module/symlink mismatch, a concurrent A-to-B activation interleaving, and a second identical activation; assert each invocation pins one release, prior-controller availability, and zero-write convergence (B32).
- [ ] 2.4 Add a hermetic black-box fixture with isolated HOME/XDG/data, scrubbed workspace/module environment, hostile foreign content cwd plus hostile selected-release `bunfig.toml`, purported bootstrap-home/config trees, `.env`, ESM/CJS preloads, and write sentinels, deleted source/verifier trees, and a fresh process; prove the platform-null bootstrap contract permits zero hostile execution before composing official commands with missing/colliding/throwing-extension recovery (B02, B03, B32).

## 3. Explicit Controller Product

- [ ] 3.1 Create pure `packages/controller-release/**` for branded paths/digests, target-specific bootstrap-trampoline identity, canonical bounded `ControllerSelectorV1` schema/codec, bundled Bun runtime and launcher path/digest/target identity, digest-free payload manifest, canonical serialization, release envelope, and exhaustive verification; enforce its no-effect/import boundary and bundle the same source into the launcher rather than copying the verifier (B01, B32).
- [ ] 3.2 Add the schema-validated command-package classification and permanent completeness guard in Template controller source plus `scripts/architecture/**`; classify `hello` only as an external fixture and every supported official module exactly once (B01).
- [ ] 3.3 Implement the platform/architecture-specific manifest-driven release builder using the explicit member roots plus the Nx transitive runtime graph, frozen lock, bundled pinned Bun binary/license and digest, exact target-specific native trampoline identity, one self-contained single-file verifier launcher, staged build/install, and a complete runtime file/link/mode/digest inventory; create no release-controlled bootstrap config/home input, forbid shared dependency stores, and final-move only a verified envelope/payload (B01, B32).
- [ ] 3.4 Add pure/contract tests for non-circular canonical identity, selector/native-parser golden-vector conformance and rejection, selector-hashed launcher bundle closure with built-in-only pre-verification imports, classification uniqueness, graph-root closure, protected/unrelated exclusion, dependency/mode tampering, and sibling/shared-store symlink aliases (B01, B32).

## 4. Stable Activation And Launcher

- [ ] 4.1 Implement target-specific non-shell native pre-JavaScript bootstrap trampolines and filesystem build/activation adapters under `scripts/controller/**` plus thin CLI verification composition; atomically own one canonical `current.v1` record, verify installed trampoline target/digest before selection, parse the record once, verify contained runtime and self-contained launcher bytes before `execve`, scrub ambient shell/Bun/Node injection, use only the platform null device for explicit Bun config and temporary HOME/XDG, derive release identity only from canonical loaded-module `import.meta`, require the entry argument to match, permit only runtime built-ins until the inlined verifier accepts the full release, restore operator cwd only after verification, never reread `current.v1` in application code, and cover idempotent selection and exact prior-state retention (B32).
- [ ] 4.2 Replace `apps/cli/bin/run.js` checkout adjacency with verified release-context startup and `CONTROLLER_RELEASE_REQUIRED` refusal outside a materialized controller; update CLI tests to invoke a controller fixture instead of source identity (B02).
- [ ] 4.3 Replace `scripts/dev/install-global-rawr.sh` and `activate-global-rawr.sh` with build/verify/select behavior whose stable global path targets the exact verified target trampoline and whose canonical selector record names only contained digest-qualified release inputs; delete checkout-owner-file semantics (B02, B32).
- [ ] 4.4 Remove controller authority from `auto-refresh-main.sh` and post-checkout/post-merge behavior; retain only repository-local dependency maintenance that cannot change the selected controller (B01, B02).
- [ ] 4.5 Run clean-home activation, source-worktree deletion, hostile cwd/global and selected-release bunfig/bootstrap-home plus `BUN_OPTIONS`/`NODE_OPTIONS` preloads, `.env`, cross-target trampoline, malformed/tampered selector, verifier-dependency/import sentinel, identical reactivation, and rollback fixtures with code-execution, module-load, and filesystem/write-event evidence (B01, B02, B32).
- [ ] 4.6 Remove universal undo expiry, HQ Ops journaling, and their imports from `apps/cli/src/index.ts`; prove version, doctor, and recovery commands have zero unrelated pre/post-dispatch writes.

## 5. Complete Official Module Closure

- [ ] 5.1 Update root and CLI `packageManager` to exact Bun `1.3.14`, update manifests/lock, and make DevOps, Hyperresearch, Sessions, ChatGPT Corpus, the interim lifecycle module, Help, and the native `@oclif/plugin-plugins` external manager ship in the controller; suppress stock command discovery, expose sole Template projections, and keep Hello external-only.
- [ ] 5.2 Generate and verify production command manifests from built official output; fail when a declared controller command is missing, duplicated, or supplied by user state (B01).
- [ ] 5.3 Replace the old install-all acceptance with an empty-user-registry controller fixture proving every official command works after source deletion and an outside-release `hello` appears only after guarded native linking (B01-B03).

## 6. Guarded External Extension Boundary

- [ ] 6.1 Under `apps/cli/src/lib/external-extensions/**`, parse native Oclif registry/package/static-command manifests without importing candidates; disable stock automatic user-plugin loading and inject only accepted entries (B03).
- [ ] 6.2 Implement complete reserved package/command/topic/alias/hidden-alias/hook comparison against the selected controller manifest with malformed/missing-manifest logical quarantine and zero startup writes (B03).
- [ ] 6.3 Add sole Template `plugins` projections with `delegate-native|converged|reject` dispositions and a mutation port that can invoke only the public `@oclif/plugin-plugins#commands` classes through the already-verified Bun runtime with the same platform-null config/HOME/XDG, explicit no-env/no-install flags, scrubbed environment, and controller-root-only import sandbox; prove runtime/config mismatch causes zero native dispatch/write and there is no native-home writer, copied manager, deep import, duplicate command discovery, or shadow registry (B03, I08).
- [ ] 6.4 Add code-load-free guarded discovery and read-only list/inspect projections over active/quarantined native entries; make uninstall/reset delegate to the native manager and remain usable with deleted paths or throwing hooks (B03).
- [ ] 6.5 Add a native-manager failure fixture seeded with non-empty active/quarantined/broken entries and failpoints at candidate acquisition, validation, native install/link/update, actual-state postvalidation, and subsequent guarded discovery; assert pre-dispatch rejection has zero native writes, any native residue is quarantined, staging is cleaned, prior controller state is unchanged, and native recovery remains usable (B03).
- [ ] 6.6 Parameterize the zero-write oracle over converged install, link, update, absent uninstall, and empty reset, proving the policy returns `converged` without native dispatch while trapping registry/package writes, reinstalls, hook loads, metadata churn, controller writes, and non-Oclif writes (B03).
- [ ] 6.7 Add every collision class including reserved manager lifecycle hooks, malformed/missing/version-mismatched manifests, rejected nested `oclif.plugins`/`devPlugins`, install tarball binding, link mutation/postcheck, update-result quarantine, rejected `reset --reinstall`, wrong Bun version/revision or cross-target trampoline identity, package-script plus ESM/CommonJS dynamic-manifest import sentinels, outside-to-inside symlink/file-URL aliases, scrubbed ambient linked-user registry, manager subprocess `userPlugins:false`, init/finally hook faults, genuine Hello activation, and the composed fresh-process/source-deletion recovery acceptance (B02, B03, B32).

## 7. Remove Official Relink Authority

- [ ] 7.1 Delete workspace official-module build/link commands, flags, branches, helpers, imports, and exports in `plugins cli install all`, `rawr-source-runner`, link doctor repair, and every install-reconcile path owned by sync/status/converge (B01, I01, I08).
- [ ] 7.2 Instrument native Oclif mutation ports and prove every interim lifecycle command records zero install, link, update, uninstall, reset, or registry-repair calls; provenance drift remains a read-only failure (B01).
- [ ] 7.3 Replace positive legacy ratchets with controller-closure, external-only-registry, and semantic-absence guards for every removed relink ID/flag/helper/import while leaving C5 broader aggregate deletion obligations active.

## 8. Provenance Diagnostics

- [ ] 8.1 Replace checkout-owner/global-symlink semantics in `doctor global` with selected digest, data root, canonical selector bytes/status, bundled Bun path/digest/platform/architecture plus supported/observed version/revision, target-specific trampoline path/protocol/platform/architecture/digest, launcher/member/lock verification, global resolution, and active/quarantined extension reporting (B01, B32).
- [ ] 8.2 Add healthy, tampered, missing-member, wrong-realpath, broken-extension, and absent-source tests; trap activation, relink, rebuild, registry, and filesystem mutation ports for every doctor case (B01-B03, B32).

## 9. C1 Verification And Review

- [ ] 9.1 Run `@rawr/controller-release` build/typecheck/lint/test, `@rawr/cli` build/typecheck/lint/test/controller-fixture, every changed official plugin's targets, and controller architecture guards with cache disabled where state matters.
- [ ] 9.2 Run graph-derived `nx affected -t build,typecheck,lint,test,structural --base=<recorded-bootstrap-main> --head=HEAD` and the explicit clean-home/source-deletion controller acceptance; record commands and results in `README.md`.
- [ ] 9.3 Have the TypeScript standing role verify closed types, manifest/transaction boundaries, and no helper aggregate; have testing verify B01-B03/B32 falsifiers; have structural quality verify deletion of checkout/link authority and absence of personal coupling. Resolve all P1/P2 findings.
- [ ] 9.4 Update only C1-owned active controller/external-extension guidance and record deferred C5 semantic deletions without preserving compatibility aliases or stale official-link instructions.

## 10. Landing And Closure

- [ ] 10.1 Commit through Graphite, submit the complete reviewed C1 stack with `--ai`, merge it to Template `main`, and rerun the required main-branch build/test/controller acceptance gates.
- [ ] 10.2 Archive the completed OpenSpec change only after source commits land, then land the archive record if required by the pinned workflow; record exact main commits and proof labels.
- [ ] 10.3 Drain every C1 Graphite branch and disposable worktree, prove Template status/main/stack cleanliness, and leave no controller identity, release, link, or state under a feature worktree.
