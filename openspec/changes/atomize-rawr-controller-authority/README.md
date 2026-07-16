# C1 Atomic Controller Execution Record

**Status:** BOOTSTRAP_READY_TO_LAND

**Change:** `atomize-rawr-controller-authority`

## Authority Binding

Authority is applied in this order:

1. Repository separation amendment at personal RAWR HQ `main` commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`, file `docs/projects/agent-plugin-lifecycle-normalization/AUTHORITY_AMENDMENT.md`, blob `10bb040317d62834806b86b36a3a14f13c539fbc`.
2. Accepted lifecycle packet provenance at personal RAWR HQ commit `cc631f60c9254802be647d66662823ae47d5e7db`, project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`.
3. The packet's normative proposal, C1 workstream container, B01-B03/B32 behavior rows, and I01-I02/I08/I17-I18 invariants, except repository-relationship clauses superseded by item 1.
4. This Template-owned OpenSpec execution record.
5. Current code, tests, manifests, history, and live state as migration/proof evidence only.

The two personal Git objects are audit/design provenance. This Template change has no ancestry, merge, cherry-pick, transplant, import, workspace link, runtime selection, or executable-tree relationship with them.

## Repository Record

| Field | Value |
| --- | --- |
| Owning repository | RAWR HQ-Template |
| Parent `main` | `4daa77b1904212d13f50bf6af0c88b4cc96a1ad7` |
| Worktree | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-atomize-rawr-controller-authority` |
| Graphite branch | `codex/atomize-rawr-controller-authority` (created by the bootstrap commit) |
| OpenSpec CLI | `@fission-ai/openspec@1.3.1` |
| Bootstrap command | `bunx @fission-ai/openspec@1.3.1 init . --tools codex --profile core` |
| Current gate | changeset-only landing and drain before implementation code |

The worktree started clean from exact Template `main`. The initial Nx first hop failed only because a new worktree had no dependencies; `bun install --frozen-lockfile` restored the workspace, after which `bunx nx show projects`, `show project @rawr/cli --json`, and `nx graph --print` succeeded.

## Director Frame

### Objective

Make one self-contained Template controller release the immutable source of every official command while leaving the native Oclif registry useful only for guarded external extensions.

### Hard core

- One selected release supplies the launcher, the platform/architecture-specific pinned Bun runtime bytes, and the complete official module closure.
- One target-specific non-shell native Template bootstrap trampoline parses one canonical selector record, verifies the contained self-verifying launcher and bundled runtime, and uses no release-controlled pre-entry config/home before JavaScript; the selector-hashed launcher is a built-in-only single-file verifier until full release acceptance, and neither layer has command or fallback authority.
- Controller selection and bytes live under the stable Template data root, never a checkout.
- Official membership is explicit and closed; no scan, link, alias, or fallback can add a member.
- Raw external registry entries never load before reserved-surface validation.
- The native Oclif registry remains the sole external-extension state owner.
- Core recovery works without loading external code or hooks.
- No lifecycle command rewrites Oclif or next-invocation controller authority.
- Template and personal repositories share only future versioned data/artifact interfaces, never executable source or Git ancestry.

### Exterior

Agent releases, provider deployment, export, packaging, promotion, app composition, personal curated content/records, protected skill subject matter, PKI, global uniqueness, operation history, and C5 aggregate deletion beyond the official-link authority removed here.

### Falsifiers and redesign triggers

- An official command cannot be represented without mutable user Oclif state.
- Recovery requires loading the broken candidate or maintaining a second extension registry.
- A self-contained release requires a worktree, personal path, merge relation, or full repository snapshot.
- A proposed module mutates controller selection and external registry in one transaction.
- Hook-only interception is the only way to guard a candidate after Oclif already loaded it.

Any such finding pauses C1 before compensating machinery is added.

## Authority Ledger

| State or fact | Sole owner | C1 use | Forbidden owner/path |
| --- | --- | --- | --- |
| controller classification and release manifest | Template controller | build and verify closed official set | workspace scan, Oclif registry, personal repo |
| selected controller | Template activation script in stable data | atomic canonical selector record | supported RAWR command, checkout hook |
| external extension state | native Oclif user registry | guarded explicit lifecycle | lifecycle sync, controller builder |
| external activation policy | Template guarded adapter | validate against controller reserved surface | extension hook, second registry |
| global provenance | `doctor global` read model | report live verified state | repair or relink path |
| personal C0/amendment Git objects | personal repository | design/audit provenance | runtime or interface identity |

## Corpus And Proof Boundary

| Row | Owner and oracle | Primary evidence |
| --- | --- | --- |
| B01 / I01 | Template controller; `ControllerClosureOracle` | controller A/B substitution, empty external registry, official-link rejection, mutation traps |
| B02 / I02 / I17 | Template controller; corrected `LocatorIsolationOracle` | materialized release, hostile foreign and selected-release config/env, platform-null bootstrap, source-local refusal, source/verifier deletion |
| B03 / I08 | external adapter over native Oclif owner; `RecoveryGuardOracle` | collision matrix, import sentinel, pre-dispatch rejection, post-native residue quarantine, recovery dispatch |
| B32 | Template controller/data-root owner; `StableAuthorityPathOracle` | XDG/`RAWR_DATA_DIR`, realpath containment, idempotent activation, selector failpoints |
| I18 | director/Graphite process | landed Template main, archived record, drained branch/worktree |

Correctness is observable state and call absence. Source-text matching is used only by permanent semantic/architecture guards where reachability or forbidden identity is itself the contract. Live personal homes and registries are never acceptance fixtures.

## Write Set

- `apps/cli/{package.json,bin/**,src/index.ts,src/commands/doctor/global.ts,src/lib/controller/**,src/lib/external-extensions/**,test/controller-fixture/**,test/agent-plugin-lifecycle/**}`
- `packages/controller-release/**` for pure payload/envelope values, canonical identity, and verification, plus `scripts/controller/**` for filesystem build/activation adapters;
- `apps/cli/src/commands/plugins/**` for the sole user-facing external-extension projections and `apps/cli/src/lib/external-extensions/**` for convergence classification, reserved-surface policy, guarded discovery, and delegation to the native `@oclif/plugin-plugins` mutation owner;
- official command manifests under `plugins/cli/{devops,hyperresearch,session-tools,chatgpt-corpus,plugins}/**` only where controller classification/build output or official relink removal requires it;
- C1-owned interim relink paths under `plugins/cli/plugins/src/commands/plugins/{cli/install,doctor/links,converge,status,sync}/**` and `src/lib/{plugin-install-service,rawr-source-runner}.ts`;
- `scripts/dev/{install-global-rawr.sh,activate-global-rawr.sh,auto-refresh-main.sh}`, relevant post-checkout/post-merge hooks, controller architecture guards, and legacy positive ratchets that require official links;
- root `package.json`, `bun.lock`, Nx/test configuration, and C1-owned active controller/external-extension guidance;
- this OpenSpec change and generated `.codex/` OpenSpec integration.

HQ Ops aggregate internals may be mined read-only but remain unchanged/unreachable in C1 unless evidence proves an official-link write cannot otherwise be removed; broader aggregate deletion remains C5.

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
| strict validation | PASS on draft | `bunx @fission-ai/openspec@1.3.1 validate atomize-rawr-controller-authority --strict --no-interactive` |
| baseline CLI tests | PASS after prescribed retry | initial suite exposed order-dependent missing DevOps build (3 failures); isolated rerun passed; full rerun passed 26 files / 79 tests, confirming the controller-closure failure class |
| pinned native manager audit | PASS | installed `@oclif/plugin-plugins@5.4.56` publicly exports its command classes/hooks only; its `Plugins` mutator is package-internal, so C1 projections delegate mutation through exported command classes and never deep-import or replace it; current upstream `5.4.84` has the same export boundary |
| manager import-sandbox spike | PASS | Bun `1.3.14` revision `0d9b296af33f2b851fcbf4df3e9ec89751734ba4` runtime plugins intercepted and rejected both dynamic `import()` and CommonJS `require()` resolution; C1 updates the repository pin, binds the exact runtime contract in each envelope, and proves mismatch refuses native dispatch |
| pre-entry config spike | PASS with design correction | an explicit hostile `--config` preload executed despite no-env/no-install; `--config=/dev/null` with null HOME/XDG did not. C1 therefore accepts no selected-release bootstrap config/home input and adds hostile-release sentinels |
| TypeScript/refactoring review | PASS | target-specific trampoline/selector types are closed; the generated single-file launcher preserves the pure verifier as sole source owner; no pre-acceptance filesystem-module edge or duplicate implementation remains |
| behavior-first testing review | PASS | platform-null bootstrap inputs, selector/runtime/launcher tampering, cross-target mismatch, and verifier-import sentinels close the observed pre-entry execution paths |
| structural authority review | PASS | one Template controller/trampoline/selector chain remains; no personal coupling, compatibility aggregate, release-controlled bootstrap input, or second state owner remains |
| bootstrap landing | PENDING | no implementation code may open first |

## Closure

C1 settles only when every task is truthful, B01-B03/B32 and positive/violation probes pass at their declared layers, standing reviews have no unresolved P1/P2, the affected Nx graph and clean-home controller acceptance are green, source deletion does not break operation, Template `main` contains the reviewed implementation, the OpenSpec record is archived after landing, and all C1 Graphite branches/worktrees are drained. No personal mutation or protected-lane output is part of C1 closure.
