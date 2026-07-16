## 1. OpenSpec And Authority Gate

- [x] 1.1 Record the landed C0 commit/tree as design provenance, cite the superseding repository-separation amendment, bind Template parent `4daa77b1904212d13f50bf6af0c88b4cc96a1ad7`, and declare the C1 write/protected sets in this changeset.
- [x] 1.2 Pass pinned strict OpenSpec validation and the preimplementation TypeScript, behavior-first testing, and structural authority reviews with no unresolved P1/P2 findings; record dispositions in `README.md`. Final implementation review remains task 9.3.
- [x] 1.3 Land this changeset-only bootstrap on Template `main`, drain its Graphite branch/worktree, and record the landed bootstrap commit before any implementation code is committed.
- [x] 1.4 Record and apply the accepted C1 authority-scope correction: supported authority failures remain in scope, while hostile replacement of complete installed state and recursive launcher-security machinery are excluded.

## 2. Breaker-First Controller Fixtures

- [x] 2.1 Under `scripts/controller/test/**`, `apps/cli/test/command-fixture/**`, and the installed black-box harness, create isolated data-root/home helpers that materialize controller A/B releases, trap declared write ports, and delete the source snapshot after activation (B01, B02, B32).
- [x] 2.2 Add incomplete/mixed controller cases for member path, digest, package, command, topic, alias, hidden-alias, hook, lock, and cross-revision mismatch; assert every pre-selector failure is read-only and retains exact prior selector bytes, while post-selector auxiliary failure reports truthful partial settlement (B01).
- [x] 2.3 Add activation failpoints before validation and selector replacement, during selector temp-write/flush/rename, between the stable launcher's one selector read and release exec, a concurrent A-to-B activation interleaving, selector/alias races including cleanup failure, and a repeated exact full-state activation; assert each invocation pins one release, precommit prior-controller availability, and zero-write full convergence (B32).
- [x] 2.4 Add a hermetic black-box fixture with isolated HOME/XDG/data, scrubbed workspace/module environment, hostile foreign content cwd containing bunfig/global config, `.env`, Bun/Node preloads, and write sentinels, deleted source trees, and a fresh process; prove the bounded launcher permits zero ambient startup execution before composing official commands with missing/colliding/throwing-extension recovery (B02, B03, B32).

## 3. Explicit Controller Product

- [x] 3.1 Create pure `packages/controller-release/**` for branded release-relative paths/digests, strict `<digest>\n` selection values, digest-free payload manifest, canonical serialization, release envelope, complete official-set identity, exhaustive verification, and converged/replace selection classification; enforce its no-effect/import boundary (B01, B32).
- [x] 3.2 Add the schema-validated command-package classification and permanent completeness guard in Template controller source plus `scripts/architecture/**`; classify `hello` only as an external fixture and every supported official module exactly once (B01).
- [x] 3.3 Implement the manifest-driven release builder using the explicit member roots plus the Nx transitive runtime graph, frozen lock, bundled pinned Bun binary/license, fixed `runtime/bun` and `app/rawr.mjs` layout, staged build/install, and a complete runtime file/link/mode/digest inventory; copy or copy-on-write reflink regular files, reject link counts greater than one, forbid shared dependency stores/inodes, and final-move only a verified envelope/payload (B01, B32).
- [x] 3.4 Add pure/contract tests for non-circular canonical identity, strict selection value, classification uniqueness, graph-root closure, protected/unrelated exclusion, dependency/mode tampering, sibling/shared-store symlink aliases, and hardlink/shared-inode rejection (B01, B32).

## 4. Stable Activation And Launcher

- [x] 4.1 Implement one bounded stable POSIX launcher plus filesystem build/activation adapters under `scripts/controller/**`: atomically own `controller/current`, read its strict digest once, derive one release, scrub ambient Bun/Node startup injection, use explicit null config/HOME/XDG with no-env/no-install, exec that release's bundled Bun and app entry, never reread `current` in application code, and cover idempotent selection plus exact precommit prior-state retention (B32).
- [x] 4.2 Replace `apps/cli/bin/run.js` checkout adjacency with verified release-context startup and `CONTROLLER_RELEASE_REQUIRED` refusal outside a materialized controller; update CLI tests to invoke an explicit controller fixture instead of source identity (B02).
- [x] 4.3 Replace `scripts/dev/install-global-rawr.sh` and `activate-global-rawr.sh` with build/verify/select behavior whose stable global path targets `controller/bin/rawr` and whose regular selector names one digest-qualified release; delete checkout-owner-file semantics (B02, B32).
- [x] 4.4 Remove controller authority from `auto-refresh-main.sh` and post-checkout/post-merge behavior; retain only repository-local dependency maintenance that cannot change the selected controller (B01, B02).
- [x] 4.5 Run clean-home activation, source-snapshot deletion, hostile cwd/global bunfig plus `BUN_OPTIONS`/`NODE_OPTIONS` preloads, `.env`, malformed selector, partial settlement, concurrent selection, exact full-state reactivation, and precommit-retention/postcommit-settlement fixtures with code-execution and filesystem/write-event evidence (B01, B02, B32).
- [x] 4.6 Remove universal undo expiry, HQ Ops journaling, and their imports from `apps/cli/src/index.ts`; prove version, doctor, and recovery commands have zero unrelated pre/post-dispatch writes.

## 5. Complete Official Module Closure

- [x] 5.1 Update root and CLI `packageManager` to exact Bun `1.3.14`, update manifests/lock, and make DevOps, Hyperresearch, Sessions, ChatGPT Corpus, the interim lifecycle module, Help, and the native `@oclif/plugin-plugins` external manager ship in the controller; suppress stock command discovery, expose sole Template projections, and keep Hello external-only.
- [x] 5.2 Generate and verify production command manifests from built official output; fail when a declared controller command is missing, duplicated, or supplied by user state (B01).
- [x] 5.3 Replace the old install-all acceptance with an empty-user-registry controller fixture proving every official command works after source deletion and an outside-release `hello` appears only after guarded native linking (B01-B03).

## 6. Guarded External Extension Boundary

- [x] 6.1 Under `apps/cli/src/lib/external-extensions/**`, parse native Oclif registry/package/static-command manifests without importing candidates; disable stock automatic user-plugin loading and inject only accepted entries (B03).
- [x] 6.2 Implement complete reserved package/command/topic/alias/hidden-alias/hook comparison against the selected controller manifest with malformed/missing-manifest logical quarantine and zero startup writes (B03).
- [x] 6.3 Add sole Template `plugins` projections with `delegate-native|converged|reject` dispositions and a mutation port that can invoke only the public `@oclif/plugin-plugins#commands` classes through the selected release's bundled Bun with explicit null config, no-env/no-install flags, scrubbed environment, and controller-root-only import sandbox; prove ambient config cannot run and there is no native-home writer, copied manager, deep import, duplicate command discovery, or shadow registry (B03, I08).
- [x] 6.4 Add code-load-free guarded discovery and read-only list/inspect projections over active/quarantined native entries; make uninstall/reset delegate to the native manager and remain usable with deleted paths or throwing hooks (B03).
- [x] 6.5 Add a native-manager failure fixture seeded with non-empty active/quarantined/broken entries and failpoints at candidate acquisition, validation, native install/link/update, actual-state postvalidation, and subsequent guarded discovery; assert pre-dispatch rejection has zero native writes, any native residue is quarantined, staging is cleaned, prior controller state is unchanged, and native recovery remains usable (B03).
- [x] 6.6 Parameterize the zero-write oracle over converged install, link, update, absent uninstall, and empty reset, proving the policy returns `converged` without native dispatch while trapping registry/package writes, reinstalls, hook loads, metadata churn, controller writes, and non-Oclif writes (B03).
- [x] 6.7 Add every collision class including reserved manager lifecycle hooks, malformed/missing/version-mismatched manifests, rejected nested `oclif.plugins`/`devPlugins`, install tarball binding, link mutation/postcheck, update-result quarantine, rejected `reset --reinstall`, package-script plus ESM/CommonJS dynamic-manifest import sentinels, outside-to-inside symlink/file-URL aliases, scrubbed ambient linked-user registry, manager subprocess `userPlugins:false`, init/finally hook faults, genuine Hello activation, and the composed fresh-process/source-deletion recovery acceptance (B02, B03, B32).

## 7. Remove Official Relink Authority

- [x] 7.1 Delete workspace official-module build/link commands, flags, branches, helpers, imports, and exports in `plugins cli install all`, `rawr-source-runner`, link doctor repair, and every install-reconcile path owned by sync/status/converge (B01, I01, I08).
- [x] 7.2 Instrument native Oclif mutation ports and prove every interim lifecycle command records zero install, link, update, uninstall, reset, or registry-repair calls; provenance drift remains a read-only failure (B01).
- [x] 7.3 Replace positive legacy ratchets with controller-closure, external-only-registry, and semantic-absence guards for every removed relink ID/flag/helper/import while leaving C5 broader aggregate deletion obligations active.

## 8. Provenance Diagnostics

- [x] 8.1 Replace checkout-owner/global-symlink semantics in `doctor global` with selected digest, data root, selector status, bundled Bun path/version/revision provenance, stable selector-launcher path, payload release-entry verification, member/lock verification, global resolution, and active/quarantined extension reporting (B01, B32).
- [x] 8.2 Add healthy, tampered, missing-member, wrong-realpath, broken-extension, and absent-source tests; trap activation, relink, rebuild, registry, and filesystem mutation ports for every doctor case (B01-B03, B32).

## 9. C1 Verification And Review

- [x] 9.1 Run `@rawr/controller-release` build/typecheck/lint/test, `@rawr/cli` build/typecheck/lint/test/controller-fixture, every changed official plugin's targets, and controller architecture guards with cache disabled where state matters.
- [x] 9.2a Run the graph-derived uncached working-tree `nx affected -t build,typecheck,lint,test,structural --base=<recorded-bootstrap-main>` without `--head` so uncommitted implementation state is included, plus the explicit clean-home/source-deletion controller acceptance; record commands and results in `README.md`.
- [x] 9.2b After the implementation commit, rerun the exact committed-tree graph with `--base=<recorded-bootstrap-main> --head=HEAD` before submission and record its result in `README.md`.
- [x] 9.3 Have the TypeScript standing role verify closed types, manifest/transaction boundaries, and no helper aggregate; have testing verify B01-B03/B32 falsifiers; have structural quality verify deletion of checkout/link authority and absence of personal coupling. Resolve all P1/P2 findings.
- [x] 9.4 Update only C1-owned active controller/external-extension guidance and record deferred C5 semantic deletions without preserving compatibility aliases or stale official-link instructions.

## 10. Landing And Closure

- [ ] 10.1 Commit through Graphite, submit the complete reviewed C1 stack with `--ai`, merge it to Template `main`, and rerun the required main-branch build/test/controller acceptance gates.
- [ ] 10.2 Archive the completed OpenSpec change only after source commits land, then land the archive record if required by the pinned workflow; record exact main commits and proof labels.
- [ ] 10.3 Drain every C1 Graphite branch and disposable worktree, prove Template status/main/stack cleanliness, and leave no controller identity, release, link, or state under a feature worktree.
