# C3 Agent Plugin Native Convergence Execution Record

**Status:** CLOSED

**Change:** `establish-agent-plugin-native-convergence`

## Authority Binding

Authority is applied in this order:

1. Repository separation amendment at personal RAWR HQ `main` commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`, file `docs/projects/agent-plugin-lifecycle-normalization/AUTHORITY_AMENDMENT.md`, blob `10bb040317d62834806b86b36a3a14f13c539fbc`.
2. Accepted lifecycle packet provenance at personal RAWR HQ commit `cc631f60c9254802be647d66662823ae47d5e7db`, project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3`.
3. The packet normative proposal, C3 workstream container, B05/B12-B22/B25/B28-B29/B33 behavior rows, and applicable I01-I19 invariants, except repository-relationship clauses superseded by item 1.
4. Landed C1 controller/external-extension and C2 release/build/artifact/export/package/capsule specifications plus their closed execution records.
5. This Template-owned OpenSpec execution record and its capability deltas.
6. Current code, tests, history, provider state, and installed tooling as migration or proof evidence only.

The personal commit and project-tree OID are accepted design-packet provenance, not an implementation input. C3 starts from clean Template `main` and creates no ancestry, merge, cherry-pick, transplant, executable import, workspace link, runtime selection, standing equivalence check, or source-local controller relationship with personal RAWR HQ. Template interacts with personal content and records only through explicit versioned Git/data/artifact interfaces. A path is a locator, never controller, release, provider, receipt, or channel identity.

## Repository Record

| Field | Value |
| --- | --- |
| Owning repository | RAWR HQ-Template |
| C3 parent `main` | `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2` |
| C3 parent tree | `ba692eb5bf22b83b8389ae98c069d454ad7961c9` |
| C2 reviewed source / landed `main` | `e8bf7b31a673def65c04f1246cdc8a08a04482e3` / `dac4c6407dcc8d75adc34738f5ae9995a43a1810` (PR #336) |
| C2 reviewed archive / landed `main` | `bba27c52941ef8cb5f66e1b801c446eb7378349e` / `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2` (PR #337) |
| C2 reviewed/landed source tree | `acc62e861ee970d6567c2fb477ff2b796ea7a327` |
| C2 reviewed/landed archive tree | `ba692eb5bf22b83b8389ae98c069d454ad7961c9` |
| C3 worktree / branch | `wt-template-c3-agent-native-convergence` / `codex/c3-agent-native-convergence` |
| C3 reviewed source / landed `main` | `4d435e83ff78677200d211a2c6ffdd62af48493d` / `3f09e6a4fa1614d218317b411b60719a2603f5e3` (PR #338) |
| C3 reviewed/landed source tree | `05f8f7ee3676091411832409735db1aab1130c98` |
| C3 reviewed archive / landed `main` | `1b989493eba43595189c84b7c0a31e9a1f5658f3` / `7e208f4b87aee24c35bc8dbf015d131c9d955a93` (PR #339) |
| C3 reviewed/landed archive tree | `d37ef942724aee5113f22b9bccf3f9d568bfb329` |
| Graphite parent | `main` |
| OpenSpec CLI | `@fission-ai/openspec@1.3.1` |
| Current gate | Source and archive are landed on canonical Template `main`; exact post-main proof is green and C3 is closed |

## Director Frame

### Objective

Turn the closed C2 release product into one governed, provider-visible lifecycle: targeted and complete testing emit mechanical evidence, repository authority selects one accepted promoted `current-main` set, and each explicitly selected native provider home converges from live truth under its own receipt while one controller capsule covers the exact last applied subset.

### Hard core

- `ProviderDeploymentRequest = TargetedTest | CompleteTest | CanonicalSync` validates before all calls. Separate exact `CanonicalStatusRequest` and `ManagedRetireRequest` inputs prevent status/retire from becoming optional deployment modes. Targeted members cannot claim completeness or retire omitted state; complete tests cannot self-accept; canonical inputs cannot override governed records.
- `@rawr/agent-plugin-promotion` validates bounded request/evidence/policy/channel records from exact read-only Git objects, requires issuer `independent-agent-plugin-acceptance/v1` plus human repository-policy authority, proves release-input equivalence across rewritten landings, and never builds, renders, deploys, or writes records.
- `@rawr/agent-provider-deployment` consumes only verified immutable snapshots through its consumer-owned `VerifiedReleaseReader` over pure release types, bound at the CLI root to C2's sole production reader. It deterministically binds provider-visible bytes, renderer and adapter protocols, and semantic capability predicates into projection identity and owns native target inventory/plan/apply/verify/retire/status. It imports no build, export, packaging, promotion, or legacy service; C2 release identity remains provider-neutral.
- Targeted test, complete test, canonical sync, canonical status, and managed retire are distinct minimal-port application entrypoints. There is no umbrella lifecycle object; read-only status cannot be constructed with mutation, capsule, evidence-publisher, or state-writer capabilities.
- Codex and Claude are explicit native adapters. There is no provider scan, generic projection fallback, direct standalone-skill fallback, toolkit/composition unit, or Cowork provider.
- One explicit provider/home pair is one target and live-state owner. Every operation reads capabilities, native inventory, visible skills/hooks, and its target receipt. A receipt is proof for only its exact target and never replaces live truth.
- Marketplace registration is explicit target-global state. Targeted and complete operations register desired members plus receipt-owned omissions while preserving each claim's exact source projection. A changed same-ID member first retires against the old registration and must disappear from both native membership and native configuration before the controller switches to the transition registration and installs the new release. Canonical omitted-member cleanup then verifies the accepted replacement and preserved retiree ownership, retires those exact omissions, and registers and verifies the final desired-only catalog. Explicit managed retirement verifies and retires against the current receipt registration before narrowing or removing it. Transition and final `SetMarketplace` actions carry distinct roles and exact prior/post registration state in the controller capsule.
- Receipt scope is a closed targeted-test, complete-test, or canonical-accepted union. Only canonical accepted desired state supplies absent-member retirement authority; any exact same-target receipt scope may supply ownership proof after the accepted replacement set is fully visible. First target admission is a capsule-owned typed action that publishes one exclusion-only sidecar before native mutation. Ordinary plugin retirement retains it; exact undo of the first admitting operation may remove only its action-owned sidecar after provider and receipt restoration. This supplies a complete native-home snapshot without making a receipt or global convergence registry authoritative.
- Native same-ID release changes use typed retire-then-install rather than catalog-only overwrite. The old member and configuration residue are absent before source advancement; the new member is installed and verified visible before receipt-owned omitted-member cleanup, and a complete accepted replacement set is visible before managed absent-member retirement. Names, paths, hashes, byte equality, export ledgers, and sibling-home receipts cannot authorize native deletion.
- A target receipt advances only after final visible verification and is the target's last mutation. Partial multi-home execution preserves exact successful and failed target truth and returns non-success without synthetic rollback.
- Status only reports stale receipts. A mutating sync may normalize unsupported receipt claims after live verification, reports that receipt-only write under capsule coverage, and becomes read-only on the next identical run.
- A repeated converged operation performs required reads and no provider mutation, enablement, marketplace change, file write, cleanup, rebuild, receipt write, capsule churn, export, Oclif, or app-composition mutation.
- The provider owner contributes one closed action/observation/recovery/replay protocol to the existing controller capsule. It owns no capsule store or operation history, and replay cannot become a generic filesystem deleter.
- C3 remains unreachable from command discovery and controller manifests. C5 alone activates the complete qualified command tree while deleting the legacy aggregate.

### Exterior

Public `rawr agent plugins ...` command files and help, deletion of legacy packages/commands/flags, replacement app composition/runtime realization, personal curated-content migration, personal policy/acceptance/channel instances, vendor refresh, protected-lane content, canonical provider settlement, Oclif state, generic export, Cowork packaging, operation history, PKI, ambient home discovery, and cross-home coordination are outside C3. This initiative retires legacy mounting and persisted enablement reachability only; replacement destination/composition/runtime realization belongs to the separate `rawr-final-architecture-migration`. C5 owns semantic lifecycle activation/deletion, C6 owns personal data/records, and C7 owns approved live settlement.

### Falsifiers And Redesign Triggers

- A mode admits optional alternate authority, mixed fields, an unknown/path-shaped channel, an implicit home, or any dependency call before closed parsing.
- A worker/test/deployer/director, schema-valid external file, or ungoverned path can issue accepted evidence or select canonical state.
- Promotion rebuilds an artifact, rerenders a projection, changes accepted provenance, or treats a feature worktree as canonical desired state.
- Projection reads source/worktree bytes, accepts caller snapshots, includes a home/receipt/channel in identity, or changes accepted output without reacceptance.
- Provider sync trusts a receipt over inventory, skips live reads, falls back to direct projection, exposes a skill twice, or creates provider identity below a content checkout.
- Same-ID refresh overwrites native state without typed retire and residue verification, receipt-owned omitted-member cleanup precedes verified replacement, or retirement uses names/bytes as ownership, crosses target homes, deletes unmanaged/ambiguous state, or runs after failed visibility.
- A targeted test retires an omitted member or a complete test writes accepted/channel authority.
- A no-op invocation writes or mutates anything, including receipt or capsule metadata.
- A partial run reports aggregate success, advances an unverified receipt, hides applied actions, or loses inverse coverage for an earlier target.
- Provider code stores another capsule/history, uses generic path replay, or infers cleanup from capsule state rather than owner proof.
- Any C3 owner imports, wraps, delegates to, or renames `@rawr/agent-config-sync`, `@rawr/agent-config-sync-node`, or `@rawr/plugin-plugins`.
- A command file, manifest row, alias, compatibility path, personal executable, protected-lane byte, or repository ancestry makes C3 reachable or coupled early.

Any such finding pauses the affected unit before compensating machinery is added. A new state owner, fallback, ambient coordinator, cross-repository executable relation, or acceptance issuer outside the accepted policy is a redesign trigger. Ordinary implementation defects stay bounded to their owner and do not reopen settled product scope.

### Review Calibration

The C2 recursive-removal detour established one categorical failure to prevent: a supported-path accidental safety concern was treated as a new security authority and expanded into generalized anti-obfuscation/subprocess policing. C3 reviewers block only packet-invariant violations, supported-behavior defects, or material maintainability defects. Hypothetical hostile maintainers, arbitrary same-user source/runtime rewrites, generalized launcher hardening, and unrelated cleanup mechanisms are outside the proof boundary. Concrete destructive provider actions still require same-target ownership evidence and standing review.

## Working Vocabulary

| Bag | C3 terms |
| --- | --- |
| Identity | governed acceptance, promotion attestation, projection digest, capability profile, provider target, receipt generation |
| Transition | parse, evaluate, attest, resolve, inventory, plan, apply, verify, retire, settle, undo |
| Boundary | immutable artifact, Git record locator, renderer, native adapter, provider home, target receipt, controller capsule |
| Exactness | closed, canonical, complete, accepted, equivalent, deterministic, target-scoped, idempotent |
| State | mechanical, accepted, promoted, compatible, converged, drifted, blocked, partially applied, restored |
| Failure | self-issued, stale, incompatible, collision, foreign, unverified, partial, replay-blocked |
| Forbidden mechanism | aggregate, alias, scan, fallback, implicit rebuild, cross-home inference, service-local undo |

These are implementation terms, not replacement product authority.

## Authority Ledger

| State or fact | Sole owner | C3 use | Forbidden owner or path |
| --- | --- | --- | --- |
| curated source, evaluation policy inputs, and lifecycle records | personal RAWR HQ | exact read-only Git objects through explicit locator | Template fixture as canonical data, executable mirror, ancestry |
| source eligibility, release artifacts, and opaque evidence bytes/handles | C2 build/artifact owner | verified artifact snapshots, release-input observations, and uninterpreted digest-addressed evidence persistence/retention | provider renderer, evidence semantics, receipt, source filesystem read |
| provider projection and capability profile | C3 deployment owner | deterministic artifact-backed native intent plus digest-addressed stable materialization | release authority, personal code, provider receipt, worktree |
| canonical mechanical-evidence schema/body/result | C3 provider test application | canonical bytes supplied to the artifact owner and verified input to a governed acceptance request | artifact storage, accepted outcome, or channel authority |
| accepted outcome and policy approval | personal repository-governed lifecycle authority | exact Git-governance observation validated by Template | worker, test, deployment, director, external file |
| promotion equivalence and attestation validation | C3 promotion owner | binds accepted source to landed main without rebuild | provider adapter, build publisher, channel caller override |
| canonical desired set | fixed personal `current-main` record | resolved transitively from explicit Git locator | feature worktree, receipt, provider scan, CLI flag |
| live native state and ownership receipt | each explicit provider home | inventory, target plan, verified settlement, managed retirement | sibling home, export ledger, global registry |
| native-home exclusion identity | each admitted provider target sidecar | complete verified overlap snapshot for C2 export; no health/cleanup claim | ambient discovery, receipt inference, global convergence registry, request-local partial override |
| last applied inverse state | controller C2 capsule | provider owner protocol and exact applied subset | provider service store, operation history, receipt database |
| generic export destination | C2 export owner and destination ledger | only overlap rejection via complete native-home snapshot | provider adapter or receipt |
| external CLI extension registry | native Oclif manager | never read or mutated | provider lifecycle, status join, promotion |
| app composition source and runtime realization | dedicated `rawr-final-architecture-migration` owners | never read or mutated; this initiative only retires legacy mounting/enablement reachability | provider lifecycle, channel record, or a replacement C4 mini-runtime |

## Current-State Disposition

| Current owner | Disposition in C3 | Target |
| --- | --- | --- |
| `packages/agent-plugin-release` / `services/agent-plugin-build` | preserve provider-neutral release contracts; narrowly extend the sole build/artifact CAS with an opaque evidence namespace and publish/read/retention adapters | artifact refs/snapshots, release-input identity, and uninterpreted digest-bound evidence bytes only; no provider/promotion schema dependency |
| `services/agent-plugin-export` | preserve separate destination owner | consume complete C3 native-home snapshot; no provider imports |
| CLI controller capsule | preserve and extend closed owner registry | one provider action protocol, no second store |
| `services/agent-config-sync` | mine provider behavior and fixtures, never import or wrap | delete in C5 after qualified activation |
| `packages/agent-config-sync-node` | mine Codex/Claude native mechanics only | new C3 adapter modules; delete legacy package in C5 |
| `plugins/cli/plugins` sync/status/retire/undo surface | migration evidence only | C5 adds qualified commands and deletes old surface atomically |

## Corpus And Proof Boundary

| Rows | Owner and oracle | C3 proof |
| --- | --- | --- |
| B05 / B33 | mode parser; `AuthorityDeltaOracle`, `InputModeOracle` | legal-mode tables, pairwise invalid properties, zero-call traps, command absence |
| B12 | promotion; `GovernedAcceptanceOracle` | exact issuer/policy/path/Git binding, self-issue and unavailable-authority rejection |
| B13-B14 | promotion; `PromotionEquivalenceOracle`, `CurrentMainOracle` | squash equivalence, changed input, dirty/wrong/unreachable, stale/forged, record-only fixtures |
| B15-B16 | projection; `ProjectionDigestOracle`, `CapabilityPredicateOracle` | canonical permutations, output mutation, identical refactor, semantic capability matrix |
| B17-B18 | provider target; `LiveTruthOracle`, `NativeExposureOracle` | live inventory despite receipts, native single exposure, no fallback, collision preservation |
| B19-B20 | deployment transaction; `OwnershipProofOracle`, `MutationOrderOracle` | ownership properties plus install/visibility/cleanup/receipt failpoints |
| B21-B22 | target isolation; `ZeroMutationOracle`, `TargetIsolationOracle` | positive second-run reads/zero mutations, A-success/B-failure, copied receipt rejection |
| B25 | controller plus provider protocol; `InverseCapsuleOracle` | exact applied prefix, reverse replay, cold recovery, target/generation/substitution rejection |
| B28-B29 | status/outcomes; `StatusClassificationOracle`, `TruthfulOutcomeOracle` | explicit disjoint table, per-phase events, partial failure, Oclif traps |

Behavior tests own transitions, state, events, bytes, and call/write absence. Source-shape checks are limited to dependency direction, owner/export closure, inactive command reachability, legacy non-import, repository separation, and protected-path absence where shape is the contract.

## Write Set And Activation Boundary

- `services/agent-plugin-promotion/**` for schemas, canonical records, governed Git verification, promotion equivalence, and fixed channel resolution;
- `services/agent-provider-deployment/**` for closed modes, projections, capability predicates, target protocols, Codex/Claude adapters, receipts, native-home snapshot, state machines, status, outcomes, and provider inverse protocol;
- `services/agent-plugin-build/**` only for the opaque hash-bound mechanical-evidence namespace, no-replace publisher/reader, and transitive retention pins under the existing stable artifact root; build remains provider-neutral and imports no provider or promotion schema;
- `apps/cli/src/lib/agent-plugins/layout.ts` for stable runtime roots, `apps/cli/src/lib/agent-plugins/composition/**` for inert narrow reader/publisher/snapshot mappings and application factories, and provider capsule registration under `apps/cli/src/lib/agent-plugins/undo/**` for controller-owned protocol composition;
- new project/package metadata, root workspace/lock/test configuration, generated fixtures, `tools/architecture-inventory/agent-plugin-native-convergence.json`, and narrow architecture gates;
- this OpenSpec record and the downstream C2 closure attestation.

No file under `apps/cli/src/commands/agent/plugins/**`, no controller manifest row, no existing command call, and no compatibility alias activates C3. C5 alone creates public reachability while deleting the mixed aggregate.

## Protected Lanes

The oRPC/effect-oRPC research lane is closed and read-only evidence: V7 manifest `bfa0eac652d3200af3edcf8afffd91cc995ae096ca786dd2d919484919d2981f`, results `888f81684ce1d3d8c805298023089d8619b6e1b79d7ba3465875caa1af3d9e17`, report `64ad4e7143054e896fe9a0d271c1530e23be69427def7ceaee4caaa2de1393fe`, Codex 0.144.5 proof `81db52240d3c7fe493f0bd22b685aa0736ac443b04d09b50f5c6dee95cdae2ca`, personal landing `cb808ece6ccc8418fe141d0a180318a9572ab8a4`, `dev:orpc` tree `8688147109cf338bdd8d88845e5449269c28e6d7`, and Civ7 merge `dff1ec97474e9c1b080a9ec577f624b49ba842a9`. C3 consumes none of its candidate bytes and does not re-evaluate the lane.

Inngest remains `HF01_PENDING`. C3 does not materialize, build, package, export, synchronize, release, distribute, rewrite, or test its candidate bytes. All content/provider behavior uses generated fixtures and explicit disposable homes. The dirty primary personal checkout is never entered and legacy `rawr plugins sync` is never invoked.

## Team Topology

The director owns authority interpretation, integration, product judgment, Graphite, proof labels, and closure. Four standing roles cycle over the complete record and implementation slice:

| Role | Gate return |
| --- | --- |
| TypeScript design/refactoring | closed discriminated types, branded identities, illegal-state prevention, dependency direction, public surface, complexity traps |
| architecture and authority | sole owners, repository separation, promotion/receipt/capsule authority, activation closure, legacy deletion path |
| behavior-first testing | B05/B12-B22/B25/B28-B29/B33 transitions, failures, call/write oracles, idempotence, partial truth, residual risk |
| structural code quality | wrong-owner preservation, aggregate/wrapper resurrection, fallback/alias residue, module size and maintainability |

Bounded workers receive disjoint promotion, projection/provider, adapter, build-evidence, and capsule/CLI-composition/proof write sets after this record passes the four-role gate. Reviewers do not acquire acceptance, product, or lifecycle authority.

## Gate And Proof Log

| Gate | Status | Evidence |
| --- | --- | --- |
| C2 source/archive landing and drain | PASS | PRs #336/#337; exact commits/trees above; 82/82 C2 tasks attested; no C2 local Graphite node or disposable worktree remains |
| repository separation | PASS | exact clean Template parent; personal amendment and packet objects cited only as authority/provenance; no cross-repository implementation relation |
| Graphite isolation | PASS | `codex/c3-agent-native-convergence` is cleanly tracked with parent `main`; unrelated stacks/worktrees were not restacked or entered |
| dependency install and Nx first hop | PASS | `bun install --frozen-lockfile`; `nx show projects`, resolved project views, and printed graph inspected from the fresh worktree |
| current-state disposition | PASS | legacy service/node package/command tree mapped as mine-then-delete evidence; C1/C2 owners and target C3 packages mapped without aggregate import |
| pinned OpenSpec creation | PASS | `bunx @fission-ai/openspec@1.3.1 new change establish-agent-plugin-native-convergence`; schema `spec-driven` |
| proposal/design/specs/tasks | PASS | four required artifacts complete; six capability deltas encode closed modes, promotion, projection, deployment, the opaque artifact-store extension, and capsule boundaries |
| pinned strict OpenSpec | PASS | active change validates with `@fission-ai/openspec@1.3.1 --strict`; `git diff --check` passes |
| standing bootstrap reviews | PASS | TypeScript/refactoring approved closed unions and consumer-owned ports; architecture/authority approved owner/protocol separation and desired-state/receipt authority; behavior-first testing approved transition/failure/idempotence coverage; structural quality approved acyclic modules, minimal-port entrypoints, and the C5 deletion off-ramp; no unresolved P1/P2 |
| opaque mechanical-evidence artifact owner | PASS | build-owned `me1_` no-replace publish/read and retention adapters; 58/58 build tests plus uncached build/typecheck/lint pass; tamper, missing, publication failure/retry, exact repeat zero-write, and governed pin cases covered without provider/promotion schema imports |
| provider target-global state machine | PASS | 106/106 ordinary provider tests pass with 4 gated disposable tests skipped: explicit marketplace/receipt truth; help- and app-server-derived capability proof; typed same-ID retire/source-switch/install; native member and config-residue retirement verification; target-local preparation-failure isolation; targeted/complete omission preservation; canonical transition verification before exact omitted-member retirement; final narrowing; target isolation; truthful failpoints; second-run zero mutation; and reverse exact owner replay. |
| provider service checkpoint validation | PASS | Uncached build, typecheck, lint, and 106/106 ordinary tests pass for `@rawr/agent-provider-deployment`, with all 4 gated native-provider tests passing separately in disposable homes; the native-convergence and C2 release-product architecture gates pass; pinned strict OpenSpec and `git diff --check` pass. CLI build/typecheck/lint and 280/280 tests pass; one contention-only timeout under concurrent run-many passed both its immediate 3/3 isolated rerun and the subsequent full CLI rerun. |
| exact affected graph | PASS | From base `9d0c1797fc051f40e1c79b4ea7bab680d18f3ad2`, uncached build, typecheck, lint, and test passed for all 39 affected projects. |
| standing final reviews | PASS | TypeScript/refactoring, architecture/authority, behavior-first testing, and structural-quality reviewers approved the repaired complete slice with no unresolved P1/P2/P3. Review repairs removed the unreachable update action, made status state opening read-only, isolated per-target preparation failures, derived capabilities from supported native observations, preserved explicit blocked-acceptance truth, and added real native repeat proof without entering app composition or provider sandboxing. |
| native marketplace choreography falsifier | PASS | Real disposable Codex and Claude probes established two distinct rules. A changed same-ID enabled release must retire under the old registration, verify both native membership and configuration residue absent, switch the marketplace source, and install the new release; a fresh catalog/list observation alone cannot prove active-thread advancement. After the replacement is visible, exact receipt-owned omissions retire under the transition registration before final narrowing. Typed actions preserve the exact applied prefix and the receipt remains last. |
| Codex containment correction | PASS | an exploratory call through `~/.codex-switch/bin/codex` ignored the requested `CODEX_HOME` and briefly registered `personal-rawr-hq` plus `alpha@personal-rawr-hq` in canonical `~/.codex`; the exact plugin and marketplace were removed immediately through native commands and a residue scan found no fixture references. The replacement probe used absolute `/opt/homebrew/bin/codex` with disposable `HOME` and `CODEX_HOME`; canonical `~/.codex/config.toml` remained byte-identical at SHA-256 `3bccb76fcfdd026101d1997587c1407eb17e933307ec90410372e6760697fc4a`. Selector/alias binaries are excluded from further acceptance. |
| generated native-provider acceptance | PASS | All 4 gated tests passed through real native Codex (`/Applications/ChatGPT.app/Contents/Resources/codex`, `0.144.2`) and Claude (`2.1.206`) binaries in fresh explicit disposable homes. Both proved initial install/visibility, changed-alpha native retire with no membership/config residue, source transition, changed-alpha native reinstall/visibility, typed beta retirement with no residue, final alpha-only registration, and final visibility. A second complete-test run in each same home returned `ReadOnlyConverged`, performed live capability/inventory/visibility/evidence reads, issued zero lifecycle mutations/materialization/capsule/evidence writes, and preserved exact bytes plus mtimes for complete controller state and lifecycle-owned provider config/plugins/skills/hooks. Codex app-server operational goals/state SQLite/WAL and `tmp/arg0` churn is explicitly outside lifecycle state. Codex uses app-server `config/value/write` for the exact marketplace source key; Claude uses same-name native marketplace add. Guarded fixture cleanup ran; no canonical home or legacy sync was used. |
| personal-main first-content dependency | C6 EXTERNAL PRECONDITION | Personal commit `c7375f52c79cf4c82a49cef51c7934fb7596a763`, tree `a1f279091c4f90e80da1dfad88d2e8c0f4427208`, contains `plugins/agents/cognition/skills/state-machine-design/**` but no tracked C2 `AgentPluginReleaseInput`: `.rawr` is absent and Git-object searches find no `release-input.json` or `releaseInputDigest`. The C2 production content-workspace reader would return `MissingReleaseInput`; synthesizing an untracked input or custom snapshot would bypass the accepted Git/data authority. C6 must first land the governed closed-world release input and acceptance records, then use `cognition:state-machine-design` as the first real-content C2 build -> C3 targeted-test oracle in explicit disposable Codex/Claude homes. C3 performed no content, artifact, provider, receipt, capsule, or canonical-home mutation for this blocked attempt. |
| canonical Codex cache non-mutation | PASS | The exact inspected path was the marketplace cache subdirectory `/Users/mateicanavra/.codex/plugins/cache/personal-rawr-hq`, not the entire Codex home or config. Its canonical non-following path/type/mode/content manifest was 0 entries, 0 files, SHA-256 `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` both before and after the blocked real-content preflight. This is additive evidence and does not replace the separately recorded canonical `~/.codex/config.toml` baseline. |
| source landing and post-main rerun | PASS | PR #338 landed reviewed tree `05f8f7ee3676091411832409735db1aab1130c98` at canonical `main` commit `3f09e6a4fa1614d218317b411b60719a2603f5e3`. From the recorded C3 base, uncached build/typecheck/lint/test passed for all 39 affected projects; strict OpenSpec, C2 release-product and C3 native-convergence gates, and `git diff --check` passed. Real disposable-home acceptance passed all 110 provider tests, including all 4 gated Codex/Claude initial-convergence and read-only-repeat cases. |
| archive landing and local drain | PASS | PR #339 landed reviewed tree `d37ef942724aee5113f22b9bccf3f9d568bfb329` at canonical `main` commit `7e208f4b87aee24c35bc8dbf015d131c9d955a93`. The C3 source and archive worktrees were removed through clean `git worktree remove`; Graphite marks both branches merged. This closeout node is removed after its own landing, leaving no C3 worktree or active Graphite node. |

## Closure

C3 closes only when all tasks and six capability deltas are truthful, strict OpenSpec and permanent architecture gates pass, promotion and provider owners satisfy their B-row oracles, disposable Codex/Claude homes prove native visibility, target isolation, managed-only retirement, source independence, partial truth, and second-run zero mutation, all four standing roles report no unresolved packet-invariant/supported-behavior/material-maintainability finding, reviewed source and archive records land on canonical Template `main`, and every C3 local Graphite node and disposable worktree is drained. C3 creates no personal mutation, protected-lane output, public command activation, or canonical provider settlement.
