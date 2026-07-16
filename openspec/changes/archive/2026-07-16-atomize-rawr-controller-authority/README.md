# C1 Atomic Controller Execution Record

**Status:** CLOSED

**Change:** `atomize-rawr-controller-authority`

## Authority Binding

Authority is applied in this order:

1. Repository separation amendment at personal RAWR HQ `main` commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`, file `docs/projects/agent-plugin-lifecycle-normalization/AUTHORITY_AMENDMENT.md`, blob `10bb040317d62834806b86b36a3a14f13c539fbc`.
2. C1 authority-scope correction in `AUTHORITY_SCOPE_CORRECTION.md`, which excludes hostile replacement of the installed controller/selector and recursive launcher-security machinery.
3. Accepted lifecycle packet provenance at personal RAWR HQ commit `cc631f60c9254802be647d66662823ae47d5e7db`, project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`.
4. The packet's normative proposal, C1 workstream container, B01-B03/B32 behavior rows, and I01-I02/I08/I17-I18 invariants, except repository-relationship clauses superseded by item 1 and bootstrap-threat interpretations superseded by item 2.
5. This Template-owned OpenSpec execution record.
6. Current code, tests, manifests, history, and live state as migration/proof evidence only.

The two personal Git objects are audit/design provenance. This Template change has no ancestry, merge, cherry-pick, transplant, import, workspace link, runtime selection, or executable-tree relationship with them.

## Repository Record

| Field | Value |
| --- | --- |
| Owning repository | RAWR HQ-Template |
| Bootstrap parent `main` | `4daa77b1904212d13f50bf6af0c88b4cc96a1ad7` |
| Bootstrap landed `main` | `161fb4f5de6596a6d6aa369c0a2d904165474a7e` (PR #332) |
| Bootstrap worktree/branch | `wt-template-atomize-rawr-controller-authority` / `codex/atomize-rawr-controller-authority` (merged and drained) |
| Reviewed implementation commit | `6e6f7aadc46e9ce87beb97dc3ea1ab7475bd4d28` |
| Source landed `main` | `5aad2da932e3c74c586a64a5f381a5c4a80424d2` (PR #333) |
| Reviewed archive commit | `0fbfadbdd300ff0e8d3d0a3e3f2690b1544839e5` |
| Archive landed `main` | `ce816a7b4bdb0a23b575ac5fb01e64625647b452` (PR #334) |
| Implementation worktree/branch | `wt-template-c1-atomic-controller` / `codex/c1-atomic-controller` (merged and drained) |
| Archive worktree/branch | `wt-template-c1-archive` / `codex/c1-controller-authority-archive` (merged and drained) |
| Archive path | `openspec/changes/archive/2026-07-16-atomize-rawr-controller-authority` |
| OpenSpec CLI | `@fission-ai/openspec@1.3.1` |
| Bootstrap command | `bunx @fission-ai/openspec@1.3.1 init . --tools codex --profile core` |
| Current gate | C1 closed; 41/41 tasks complete; C2 bootstrap may proceed independently from landed Template `main` |

The worktree started clean from exact Template `main`. The initial Nx first hop failed only because a new worktree had no dependencies; `bun install --frozen-lockfile` restored the workspace, after which `bunx nx show projects`, `show project @rawr/cli --json`, and `nx graph --print` succeeded.

## Director Frame

### Objective

Make one self-contained Template controller release the immutable source of every official command while leaving the native Oclif registry useful only for guarded external extensions.

### Hard core

- One selected release supplies the payload-bound `app/rawr.mjs` release entry, the platform/architecture-specific pinned Bun runtime bytes, and the complete official module closure.
- One stable bounded Template selector launcher at `controller/bin/rawr` reads one atomic selected digest, neutralizes ambient Bun startup inputs, and starts the selected release with its bundled Bun; it is outside release identity and has no command, repair, authentication, or fallback authority.
- Controller selection and bytes live under the stable Template data root, never a checkout.
- Official membership is explicit and closed; no scan, link, alias, or fallback can add a member.
- Raw external registry entries never load before reserved-surface validation.
- The native Oclif registry remains the sole external-extension state owner.
- Core recovery works without loading external code or hooks.
- No lifecycle command rewrites Oclif or next-invocation controller authority.
- Exact requested-state convergence is read-only; selector-equal launcher or alias drift is explicit auxiliary settlement and never rewrites controller authority.
- Template and personal repositories share only future versioned data/artifact interfaces, never executable source or Git ancestry.

### Exterior

Agent releases, provider deployment, export, packaging, promotion, app composition, personal curated content/records, protected skill subject matter, PKI, global uniqueness, operation history, and C5 aggregate deletion beyond the official-link authority removed here.

### Falsifiers and redesign triggers

- An official command cannot be represented without mutable user Oclif state.
- Recovery requires loading the broken candidate or maintaining a second extension registry.
- A self-contained release requires a worktree, personal path, merge relation, or full repository snapshot.
- A proposed module mutates controller selection and external registry in one transaction.
- Hook-only interception is the only way to guard a candidate after Oclif already loaded it.
- Launcher mechanics require a target-specific security protocol, recursive verifier, or defense against a writer who controls the complete installed state.

Any such finding pauses C1 before compensating machinery is added.

## Authority Ledger

| State or fact | Sole owner | C1 use | Forbidden owner/path |
| --- | --- | --- | --- |
| controller classification and release manifest | Template controller | build and verify closed official set | workspace scan, Oclif registry, personal repo |
| selected controller | Template activation script in stable data | atomic selected-digest value | supported RAWR command, checkout hook |
| external extension state | native Oclif user registry | guarded explicit lifecycle | lifecycle sync, controller builder |
| external activation policy | Template guarded adapter | validate against controller reserved surface | extension hook, second registry |
| global provenance | `doctor global` read model | report live verified state | repair or relink path |
| personal C0/amendment Git objects | personal repository | design/audit provenance | runtime or interface identity |

## Corpus And Proof Boundary

| Row | Owner and oracle | Primary evidence |
| --- | --- | --- |
| B01 / I01 | Template controller; `ControllerClosureOracle` | controller A/B substitution, empty external registry, official-link rejection, mutation traps |
| B02 / I02 / I17 | Template controller; corrected `LocatorIsolationOracle` | materialized release, hostile foreign cwd/config/env, bounded clean launch, source-local refusal, source deletion |
| B03 / I08 | external adapter over native Oclif owner; `RecoveryGuardOracle` | collision matrix, import sentinel, pre-dispatch rejection, post-native residue quarantine, recovery dispatch |
| B32 | Template controller/data-root owner; `StableAuthorityPathOracle` | XDG/`RAWR_DATA_DIR`, realpath containment, idempotent activation, selector failpoints |
| I18 | director/Graphite process | landed Template main, archived record, drained branch/worktree |

Correctness is observable state and call absence. Source-text matching is used only by permanent semantic/architecture guards where reachability or forbidden identity is itself the contract. Live personal homes and registries are never acceptance fixtures.

## Write Set

- `apps/cli/{package.json,bin/**,src/index.ts,src/commands/{plugins/**,doctor/global.ts,routine/**,tools/export.ts,workflow/**},src/lib/{controller/**,external-extensions/**,agent-config-sync-client.ts,subprocess.ts,undo-lifecycle.ts},test/**}` for release-only bootstrap, closed official composition, guarded external projections, verified nested reentry, removal of universal undo/journal startup authority, structurally valid projection binding, diagnostics, and behavior proof;
- `packages/controller-release/**` for pure payload/envelope values, canonical identity, and verification, plus `scripts/controller/**` for filesystem build/activation adapters;
- `packages/core/**` for the bootstrap-bound verified controller reentry authority used by nested official commands, with no ambient or source-derived selector;
- official command manifests under `plugins/cli/{devops,hyperresearch,session-tools,chatgpt-corpus,plugins}/**` only where controller classification/build output or official relink removal requires it, plus `plugins/cli/hello/README.md` only to bind Hello as an external fixture;
- C1-owned interim relink paths under `plugins/cli/plugins/src/commands/plugins/{cli/install,doctor/links,converge,status,sync}/**` and `src/lib/{plugin-install-service,rawr-source-runner}.ts`;
- `services/agent-config-sync/**`, `services/dev/**`, and `plugins/cli/devops/**` only to remove install-reconcile/link-healing authority and retype former convergence followups as read-only inspection;
- `services/hq-ops/**` only to delete the `plugin-install` aggregate module and its router/contract/test exposure after evidence showed that module existed solely to plan official workspace-link mutation; the remaining HQ Ops domains stay outside C1;
- `scripts/dev/{install-global-rawr.sh,activate-global-rawr.sh,auto-refresh-main.sh,test-hq-browser-lifecycle.sh}`, `scripts/githooks/**`, controller architecture guards, and legacy positive ratchets that require official links;
- `tools/workstream-plugin-pack/**`, `services/hyperresearch-codex/**`, repository `AGENTS` files, and active root/`docs/**` guidance only to remove source-controller, merge-first, tree-equivalence, or official-link instructions and bind installed-controller/repository-separation usage; archived readiness records receive explicit supersession annotations rather than new authority;
- root `package.json`, `bun.lock`, Nx/test configuration, `tools/architecture-inventory/workstream-b-devops.json`, and phase/architecture ratchets required by the controller closure;
- `tools/eslint-fixtures/project.json` and `scripts/phase-03/verify-eslint-fixtures-lint.mjs` to replace direct linting of intentional negative fixtures with an assertion gate that requires the positive fixture to be clean and each negative fixture to fail only the declared module-boundary rule;
- this OpenSpec change and generated `.codex/` OpenSpec integration.

The evidence-driven `plugin-install` module deletion is not preservation or redesign of the HQ Ops aggregate. Broader mixed-owner aggregate deletion remains C5.
The projection binding, architecture inventory, and fixture-gate repairs restore inherited mandatory checks without adding lifecycle authority.

## Protected Lanes

- oRPC/effect-oRPC paths and accepted bytes are read-only. C1 does not edit, render, package, export, or reinterpret them.
- Inngest/effect-Inngest remains `HF01_PENDING`. C1 does not read candidate bytes into a controller artifact and performs no materialization, build, package, export, sync, release, distribution, or destination write for that lane.
- The controller release builder must prove its explicit transitive closure excludes unrelated `plugins/agents/**`, `tools/*-skill-quality/**`, research-vault, and protected materialization roots.

## Team Topology

The director owns authority, integration, product judgment, Graphite, proof labels, and closure.

| Standing role | Gate return |
| --- | --- |
| TypeScript design/refactoring | illegal-state/type boundary findings, module delta, static gates, complexity traps |
| behavior-first testing | B01-B03/B32 falsifiers, state transitions, call/write oracles, residual risk |
| structural code quality | wrong-owner preservation, wrapper/aggregate resurrection, semantic leftovers, deletion opportunities |

Bounded workers may own controller product/activation and external-extension fixtures/adapters after this record lands. Reviewers remain read-only and never become shadow product authority.

## Corrected Downstream Contract

C2-C5 remain Template-only and publish immutable controller plus versioned lifecycle schema/protocol artifacts. C6 starts independently from clean personal `main`, initializes its own process records, deletes personal executable controller/lifecycle/provider/tooling copies, and invokes an installed Template-owned tool through exact interface versions and artifact digests. It does not merge Template, receive this OpenSpec root, retain executable mirrors, or run tree-equivalence checks.

The C6 steady-state oracle is `agent-content-authority:repository-separation`: Template executable roots are absent, cross-repository workspace links/imports are absent, and personal declarative content/records validate against an exact published interface. Before C6, the `plugins/agents/hq/**` collision must receive one explicit disposition: transfer genuinely curated provider-facing source to personal ownership, or keep it outside the personal release set behind a separately versioned artifact contract. A mirrored tree is not an option.

Cross-repository acceptance binds artifact handle, payload digest, schema/protocol ID and version, release-set digest, and governed record digests. Template and personal Git commits/trees may be recorded as audit provenance but never substitute for those bindings.

## Gate And Proof Log

| Gate | Status | Evidence |
| --- | --- | --- |
| C0 landed/drained | PASS | personal PR #170; commit/tree above; no local C0 Graphite branch/worktree |
| repository amendment landed/drained | PASS | personal PR #171; commit/blob above; independent amendment review PASS |
| Template parent/worktree | PASS | clean parent `4daa77b1...`; dedicated worktree; primary Template stack untouched |
| Nx first hop | PASS after dependency install | projects, resolved `@rawr/cli`, CLI plugin projects, full graph inspected |
| pinned OpenSpec init | PASS | version `1.3.1`; `.codex/` integration and this change created |
| strict validation | PASS after settlement repair | `bunx @fission-ai/openspec@1.3.1 validate atomize-rawr-controller-authority --strict --no-interactive`; full-state convergence, auxiliary settlement, and post-selector failure semantics now match implementation |
| baseline CLI tests | PASS after prescribed retry | initial suite exposed order-dependent missing DevOps build (3 failures); isolated rerun passed; full rerun passed 26 files / 79 tests, confirming the controller-closure failure class |
| pinned native manager audit | PASS | installed `@oclif/plugin-plugins@5.4.56` publicly exports its command classes/hooks only; its `Plugins` mutator is package-internal, so C1 projections delegate mutation through exported command classes and never deep-import or replace it; current upstream `5.4.84` has the same export boundary |
| external provenance review repair | PASS | guarded discovery now requires every native user entry to have a dependency and compares both sides of content-addressed local provenance; converged install performs read-only inspection before staging; update classifies each entry and rejects mixed proven-local/native input before the pinned manager's global update. Focused external-extension proof passed 9 files / 89 tests, including missing/mismatched dependency, staging write-trap, local-only convergence, native-only delegation, and mixed-set rejection falsifiers. |
| manager import-sandbox spike | PASS | Bun `1.3.14` revision `0d9b296af33f2b851fcbf4df3e9ec89751734ba4` runtime plugins intercepted and rejected both dynamic `import()` and CommonJS `require()` resolution; C1 updates the repository pin, binds the exact runtime contract in each envelope, and proves mismatch refuses native dispatch |
| pre-entry config spike | PASS with bounded use | an explicit bunfig preload executed despite no-env/no-install; `--config=/dev/null` with null HOME/XDG did not. C1 uses that bounded neutralizer for ambient startup inputs and adds no recursive verification layer |
| authority-scope correction | PASS | hostile replacement of complete installed state is excluded; native target protocol, TLV selector, hashed runtime/launcher chain, and recursive self-verifier were stopped and removed before landing implementation |
| pre-correction standing review | SUPERSEDED | the repository-separation findings remain useful, but the accepted scope correction rejects the reviewed native/TLV/self-verifier mechanism |
| scope-corrected authority review | PASS after repair | review found one P1 in a substitution scenario and two P2s in launcher naming and hardlink closure; the record now permits the release entry to perform ordinary verification before command/hook dispatch, distinguishes the stable selector launcher from the payload-bound release entry, and rejects mutable shared hardlinks |
| bootstrap landing | PASS | Template PR #332; `main` commit `161fb4f5de6596a6d6aa369c0a2d904165474a7e`; bootstrap branch and worktree drained before this fresh implementation worktree opened |
| pure controller product | PASS | `@rawr/controller-release` build/typecheck/lint/test passed, 34/34 tests; controller-build typecheck/lint passed |
| activation and cleanup transactions | PASS | controller-build tests passed 80/80, including selector failpoints, full-state zero-write convergence, auxiliary retry, selector/alias races, guarded recursive cleanup, and primary-plus-cleanup failure preservation |
| recursive-delete boundary | PASS after dedicated audit | the audit found and closed two P2s: external-artifact cleanup now proves its canonical owned temporary child is a non-symlink directory immediately before recursive removal, and the release-inspector fixture keeps staging/final siblings inside one private `mkdtemp` parent instead of pre-deleting an unowned digest sibling. Every product recursive removal now requires canonical direct-child/prefix ownership plus type/alias checks; regular-file and alias substitution fail closed, and 17/17 focused tests pass. |
| verified nested reentry | PASS | core build/typecheck/lint/test passed, 12/12 tests; CLI subprocess proof overwrites hook-mutated controller/startup values including `BUN_RUNTIME_TRANSPILER_CACHE_PATH=0`; focused reentry test passed 1/1 |
| CLI behavior | PASS | full `@rawr/cli` build/typecheck/lint/test passed after the recursive-delete repair, 37 files / 211 tests; the focused delete-boundary subset passed 17/17. |
| official lifecycle projections | PASS | `@rawr/plugin-plugins` build/typecheck/lint/test/sync/structural passed after mechanically replacing 31 same-project `#lib/*` imports with behavior-equivalent relative imports, 16/16 tests; `@rawr/plugin-devops` build/typecheck/test/sync passed, 1/1 test; every other changed official or external-fixture plugin's declared build/typecheck/test/structural targets passed in the affected graph. |
| inherited structural baselines | PASS | the CLI projection client now uses the established typed `bindService` boundary; exact Dev/Dev Node/DevOps roots, tags, and declared targets are recorded in the architecture inventory and all three sync checks pass; the ESLint fixture gate proves one positive fixture clean and three intentional negative fixtures fail only severity-2 `@nx/enforce-module-boundaries`. |
| architecture ratchets | PASS | controller classification, no-official-relink authority, and repository-separation guards passed; `git diff --check` passed |
| affected working-tree graph | PASS after delete repair | uncached `nx affected -t test,lint,typecheck,build,structural --base=161fb4f5de6596a6d6aa369c0a2d904165474a7e` intentionally omitted `--head` so Nx included uncommitted implementation state; the post-repair rerun passed all targets for 33 projects plus 17 dependent tasks. |
| affected committed-tree graph | PASS | after the implementation commit and final record amendment, the same uncached 33-project/17-dependent-task graph passed with exact `--base=161fb4f5de6596a6d6aa369c0a2d904165474a7e --head=HEAD`. |
| installed controller acceptance | PASS after delete repair | the post-repair uncached clean-home/source-deletion acceptance materialized one verified controller, removed its source checkout, executed 97 fresh processes and all 67 manifest commands, completed guarded external lifecycle recovery, and reported `ambientStartupExecuted=false`. |
| final standing review | PASS after delete-safety repair | TypeScript, behavior/transaction, delete-safety, and structural-quality reviews report no unresolved P1/P2. A dedicated delete audit found two P2s; both were repaired, independently re-audited, and included in the refreshed full proof before the final structural return. |
| source landing | PASS | Graphite submission used `--ai`; Template PR #333 merged reviewed feature commit `6e6f7aadc46e9ce87beb97dc3ea1ab7475bd4d28` as `main` commit `5aad2da932e3c74c586a64a5f381a5c4a80424d2`. |
| post-main specification and ratchets | PASS | detached exact-main proof passed pinned strict OpenSpec validation, controller classification (9 complete), no-official-relink authority, repository separation, and `git diff --check`. |
| post-main affected graph | PASS | exact merged `HEAD` passed the uncached 33-project/17-dependent-task `test,lint,typecheck,build,structural` graph from bootstrap `161fb4f5de6596a6d6aa369c0a2d904165474a7e`. |
| post-main installed acceptance | PASS | digest `7170a505a2e7e8de7ddf574fd027f2911d0ca224a2cd9ce4a79ce11e8ef07c58`; source removed; 97 fresh processes; 67 manifest commands; full external recovery; `ambientStartupExecuted=false`. |
| canonical spec sync | PASS | both all-`ADDED` deltas were copied verbatim beneath canonical Purpose/Requirements headings; exact tail comparison passed; pre-move strict validation passed the active change plus both canonical specs (3/3), and post-move strict validation passed both canonical specs (2/2) with no active changes remaining. |
| guarded archive move | PASS | the source was a non-symlink direct child of canonical `openspec/changes`, the archive directory was a non-symlink direct child on the same filesystem, the dated destination was absent including broken symlinks, and one directory `mv` completed without recursive removal. |
| archive landing | PASS | Graphite PR #334 merged archive commit `0fbfadbdd300ff0e8d3d0a3e3f2690b1544839e5` as Template `main` commit `ce816a7b4bdb0a23b575ac5fb01e64625647b452`. |
| post-archive main proof | PASS | exact merged `main` passed strict canonical-spec validation (2/2), reported no active OpenSpec changes, retained 6 external-extension and 7 controller requirements, passed all three C1 architecture ratchets, and passed `git diff --check`. |
| Graphite and worktree drain | PASS | clean C1 implementation, archive, and detached proof worktrees were removed only through `git worktree remove`; `gt sync --force --no-restack --no-interactive` pruned both merged local C1 branches; `gt ls` contains no C1 stack; the two unrelated retained worktrees are clean; `main` and `origin/main` both equal `ce816a7b4bdb0a23b575ac5fb01e64625647b452`. Merged GitHub PR heads are historical remote refs, not active local Graphite branches. |
| feature-worktree authority absence | PASS | installed acceptance already proved controller operation after source deletion, every C1 disposable worktree path is now absent, and no controller identity, release, link, registry, or runtime state was stored beneath one. |

## Closure

C1 settles only when every task is truthful, B01-B03/B32 and positive/violation probes pass at their declared layers, standing reviews have no unresolved P1/P2, the affected Nx graph and clean-home controller acceptance are green, source deletion does not break operation, Template `main` contains the reviewed implementation, the OpenSpec record is archived after landing, and all C1 Graphite branches/worktrees are drained. No personal mutation or protected-lane output is part of C1 closure.

The Template-only C2 bootstrap supplies the promised downstream closure attestation for the archive commit and drain events that could not be recorded by their own branch. All 41 C1 tasks are now complete. C1 is settled at source `main` commit `5aad2da932e3c74c586a64a5f381a5c4a80424d2` plus archive `main` commit `ce816a7b4bdb0a23b575ac5fb01e64625647b452`; no C1 implementation or archive worktree, local Graphite branch, controller identity, release, link, or runtime state remains under a feature checkout. This bookkeeping creates no lifecycle authority and does not open C2 implementation before the bootstrap itself lands.
