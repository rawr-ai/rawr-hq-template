# Complete Agent-Plugin Lifecycle Public Interface

## Status

`T6F_LANDING_AND_SETTLEMENT`

The user accepted the proportionality correction in [[authority-amendment]].
Template continuation through PR #410 is landed on canonical `main` at
`ec58d06ca89bc0c6d0e6866624e4991d8830ad3f`, tree
`fc6efdee5445a354e2ca9e1462a90565e2775e23`. Its installed immutable controller
digest is `dc14ccd20df37da774749908b5660494d60ce2dadb3c3cef2c5b76bca52f69de`.

Personal curated content and repository lifecycle machinery are independently landed on personal
`main` at `a4201247795d1fa18d46ecab206515e33660a171`, tree
`e71a93857b72dc4beaa5605c5e6a8366558055b2`. The reviewed current-main record is
committed on PR #182 at `9378d33bb2d3e752a51c739af94145c70ff33260`;
its local installed-controller gate is green, while the remote job is externally
blocked before step execution by the repository account's billing limit. It
remains unlanded without a bypass.

The current Template continuation is rooted directly at `ec58d06c`. Releases,
providers, governance, vendors, and packaging now derive their public oRPC
request/result types from closed TypeBox schemas. Canonical brands, ordering,
uniqueness, digest policy, and other cross-field rules remain owner-local. The
required Nx check separates production and test typing, binds deterministic
static cache inputs to their toolchains, runs noncacheable live Git behavior
only after static checks, and uses direct operational terms for release-set
verification. It adds no state owner, provider installer, repository
relationship, app/runtime surface, or protected-lane input. The public-boundary
conversion is sealed; landing and controller publication remain open.

## Repository Record

| Identity | Bound value |
| --- | --- |
| Repository | RAWR HQ-Template |
| Worktree | `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-template-c6-install-8d9` |
| Parent commit / tree | canonical Template `main` `ec58d06ca89bc0c6d0e6866624e4991d8830ad3f` / `fc6efdee5445a354e2ca9e1462a90565e2775e23` |
| Packet provenance | personal commit `cc631f60c9254802be647d66662823ae47d5e7db`; project tree `97f0a634fcd8d1d24d4a95fcb57d277e9bf75ae3` |
| Repository-separation amendment | personal commit `43a49d48ab6c6a29b4877f20576b42b533fc82ba`; blob `10bb040317d62834806b86b36a3a14f13c539fbc` |
| Proportionality amendment | [[authority-amendment]] |
| Landed predecessor | PR #389 closes the retained 43-node stack at canonical Template `main` `5b588ae624d9e7f13c7db7beddeb4996aa50cae8` |
| Release-input continuation | `codex/c6-release-input-record` / `dd6ad50f20ff9b218c645e85bfd5b98e95d0beb8` |
| Declared-tree continuation | `codex/c6-declared-plugin-tree` / `c60b0748060532b701f1f87d756eee0732714cc1` |
| Provider-binding continuation | `codex/c6-verified-provider-binding` / `500897189ed2b3c846a98e5565e42ae605556727` |
| Installed-controller continuation | `codex/c6-installed-controller-distribution` / `94190680005520bd68b981c49dc6bbc75de8ad3a` |
| Native-host continuation | `codex/c6-native-provider-host-contract` / `402049183468e7ff16eab3ce5fd14dbd7f6d73dd` |
| Service-boundary continuation | `codex/c6-canonical-service-boundary` / `abc62679023102dd8fee712fe86ba116a5b6c9e5`; tree `c2da5b8bd8110fa1df5b5ea77c245972b76b444d` |
| Landed continuation | PRs #390-#396; canonical Template `main` `2f9e303a13860e92d0011d228277c4c2149f6b78`; tree `70f9f5332252c67926d8fc5d48c0109eb32fff50` |
| Publication repair | `codex/c6-preserve-installed-asset-modes`; parent is the landed continuation above |
| Landed publication repair | PR #397; canonical Template `main` `04e37f596d03a352a9b6cdb37ee7cdff54b67c28`; tree `c41e851580aa80e32fb20c1e3616423c1b6268ff`; ratchet run `29737814922` |
| Release-input schema prerequisite | `codex/c6-typebox-release-input`; parent is the landed publication repair |
| Current TypeBox continuation | `f1156354` through `c928b233`, then `31dde416`, `940041af`, `5aeeed79`, and `ec1e72cf`; all five lifecycle modules now keep public structure/types schema-owned while domain normalization remains owner-local |
| Lifecycle Nx check ratchet | `codex/c6-nx-lifecycle-check-ratchet` / `c1bf97f5` |
| Standard release-verification terminology | `codex/c6-standard-release-verification-terms` / `80ec5100` |
| Required-ratchet correction | `codex/c6-strengthen-lifecycle-ratchet` / `41cc3d6a` |
| Evidence protocol correction | `codex/c6-rename-controller-evidence-protocol` / `d494810f` |
| Standard retention result | `codex/c6-standard-retention-result` / `65d3006c` |
| Positive topology cleanup | `codex/c6-remove-placeholder-common-layer` / `ded4b04f` |
| Release TypeBox boundary | `codex/c6-typebox-release-contracts` / `ec1e72cf` |
| Provider diagnostic boundary | `codex/c6-bound-provider-diagnostics` / `c3a171cc` |
| Lifecycle policy cache inputs | `codex/c6-hash-lifecycle-policy-roots` / `8176ce5e` |
| Habitat authority correction | `codex/c6-correct-habitat-authority` / `280ac34b` |
| Packaging diagnostic boundary | `codex/c6-bound-packaging-contracts` / `0e92b1cf` |
| Governance diagnostic boundary | `codex/c6-bound-governance-contracts` / `69358753` |
| Release diagnostic boundary | `codex/c6-bound-release-contracts` / `c199e5c1` |
| Installed controller | `dc14ccd20df37da774749908b5660494d60ce2dadb3c3cef2c5b76bca52f69de` from landed Template `ec58d06c` |
| Personal checkpoint | independent personal `main` `a4201247`; PR #182 commit `9378d33b`, remote job blocked before execution without bypass |
| Native hook-claim correction | `codex/c6-scope-native-hook-claims`; parent is canonical Template `main` `b7b6524db818d7119340f2afc572a1159c708785` |
| Opening controller | `0823cfe6...`; diagnostic only, never an active input |
| T6A branch | `codex/c6-agent-lifecycle-public-interface` / `3f3a3be2dda70dae2682f88feeb23e5e9d349575` |
| T6B Git observation | `codex/c6-staged-git-observation` / `67a0d25437d087e78dd15f67f65a1ae0a2ecb42f` |
| T6B service validation | `codex/c6-repository-check-service` / `fb123645144a04be48acaa21d282dde4a3420eb7` |
| T6B CLI projection | `codex/c6-repository-check-cli` / `c7f2ff81802512eec89e3dc33a05d8f532ce27b9` |
| T6C1a codec interface | `codex/c6-current-main-v2-codec` / `658763eec2079062c12d124eb025fed17b622c2b` |
| T6C2a provider capsule retirement | `codex/c6-provider-capsule-retirement` / `876b9187e2f0ae479e48f4f97d16ad65b5909cfb` |
| T6C2b managed-retire deletion | `codex/c6-managed-retire-deletion` / `c3d2c94b0994dff1b71b4ef6f7c7a2cb458ffc6f` |
| T6C1b private selector engine | `codex/c6-current-main-v2-selection` / `85a21fbe30df55043875b470a1bb1c14d848dc1a` |
| T6C2c private native policy | `codex/c6-canonical-convergence-policy` / `6b29837b0f0c1ac2e1b781eb6942288b230748f8` |
| T6C2c private desired state | `codex/c6-canonical-desired-state` / `9a890c6e9767289b3c507817e960023e952cecb1` |
| T6C2c private provenance observation | `codex/c6-native-provenance-observation` / `dd07596b7456db7fa4d91612c47c9b44fe44e871` |
| T6C2c private convergence executor | `codex/c6-canonical-convergence-executor` / `4f74af14c9963542cd8582c9a0b44f425fe3ee59` |
| Controller acceptance-harness retirement | `codex/c6-retire-controller-acceptance-harness` / `54359c387dcf78316477b748aef02ed7f42f7cd4` |
| T6C1b/T6C2 public cutover | `codex/c6-atomic-canonical-cutover` / `a5d34f12d3eb5e4efd1afdef9ca81f4816d0a925` |
| T6C3 minimal boundary frame | `codex/c6-minimal-export-provider-boundary` / `d2e3c144d7ffeede587d4d8718a8e8c864b48186` |
| T6C3 provider slot refusal | `codex/c6-provider-root-slot-refusal` / `379ba2ffd4cb77420849b81cda8a5d82f83a0942` |
| Retained DevOps test node | `codex/c6-retire-stale-devops-command-test` / `c9d850dcbe38552b935aa27b25322c8d07f72b60` |
| Retained CLI target node | `codex/c6-serialize-cli-test-target` / `e40068cdf4fa4a978d896a1a887bea6e0fbb41dc` |
| Deterministic manifest node | `codex/c6-deterministic-oclif-manifest` / `75d737d03c10fb6c203d97ebd026cbcd26f02b34` |
| C5 provider repository ownership | `codex/c6-route-provider-service-context` / `0e5b9d107a684a0ef32137d34bf4e750b5023f81` |
| C5 artifact-tree location port | `codex/c6-expose-artifact-tree-location` / `53f8e9ab9cf79bebfd42bde0443fa5f4497c9733` |
| C5 neutral current-main boundary | `codex/c6-neutral-current-main-boundary` / `0be6d84986db106b571e91b8388372b22282eac7` |
| C5 native provider resource location | `codex/c6-bind-native-provider-resource-location` / `8e970d010fed53c49a1c54f2ee2d0a0e077e2f76` |
| C5 provider raw context | `codex/c6-route-provider-runtime-context` / `844eec51dd8bb94b176917fa280da9d00d45ca66` |
| C5 current-main service composition | `codex/c6-own-current-main-context` / `d5e85692d864a34ecfa260b16d60946212ba84eb` |
| C5 artifact/evidence service composition | `codex/c6-own-artifact-resource-context` / `0dbd68a44ce02a059991f71ae55edaba80847c68` |
| C5 export artifact service composition | `codex/c6-own-export-artifact-context` / `b902a668386879bc6ed8c4d95395ffd81074a1cb` |
| Lifecycle test owner | `codex/c6-serialize-lifecycle-test-target` / `8b70a87fada52018f00c5fbaa267f24933d0c84e` |

Personal records remain unlanded until the installed Template interface can
enforce their first semantic checkpoint. No hook bypass, legacy mixed sync, or
global-state repair is authorized as preparation.

## Authority And Scope

Template owns controller, CLI, lifecycle service, generic schemas/tooling, and
native provider adapters. Personal owns curated content, provenance,
policy/evaluation inputs, and its reviewed channel record. The repositories
share no implementation or history.

The retained candidate changes Template-owned lifecycle controller, service,
provider/resource, test, record, and structural surfaces required for thin
convergence: Git-backed repository checks; one current-main selector with the
hosted ceremony retired; point-addressed native provider convergence; artifact
and package ownership; the deterministic controller manifest; owner-local test
configuration; and positive Habitat inventories. Managed destination export,
capsule undo, and their provider-home aggregate are retired rather than repaired.
Useful destination/export requirements transfer to the dedicated full
architecture migration. This work excludes app/web composition, provider
installer reimplementation, controller-store transport, replacement rollback
machinery, and Inngest candidate bytes.

## Semantic Stack

| Slice | State | Proof gate |
| --- | --- | --- |
| C5 context direction | complete, reviewed | export module/facades and provider aggregate retired without another host boundary |
| T6A thin record | complete | strict OpenSpec plus four standing reviews |
| T6B repository checks | complete | staged/clean exactness, index race, declared-input boundary, one procedure |
| T6C1a v2 codec/public interface | complete, reviewed | closed TypeBox model, canonical `cm2_` codec, one cold-port procedure and CLI dispatch |
| T6C1b observed-Git selector/cutover | complete, reviewed | one public observed-Git selector; v1 acceptance, hosted approval, promotion, and attest command deleted atomically |
| T6C2a provider capsule retirement | complete, reviewed | capsule-cold provider modes, forward-only retry, export-only legacy retirement |
| T6C2b managed-retire deletion | complete, reviewed | receipt-owned provider retire unreachable without alias; omission cleanup remains sync-owned |
| T6C2c canonical native path | complete, reviewed | sole governance selection, selected-owner native truth, exact-selector cleanup, verification barriers, and no canonical hidden state |
| T6C3 legacy export retirement | complete, reviewed | no export/undo command, service module, capsule runtime, public facade, or complete-home aggregate |
| T6D truthful test owners | complete, reviewed | owner-local DevOps fixture and ordinary serialized lifecycle/CLI targets |
| T6E deterministic manifest | complete, reviewed | native JSON projection, code-unit canonicalization, and full build-twice equality |
| T6F Template prerequisite implementation | source complete; landing and installed-controller refresh open | TypeBox-owned release-input wire records, controller-owned refresh, positive declared-tree closure, tested provider bindings, corrected channel path, and immutable controller distribution without repository coupling |
| T6F landing/settlement | active; disposable complete-test accepted, personal current-main PR externally blocked | independently landed repos, canonical disposable/live native convergence, read-only repeat |

## Retired Unlanded Nodes

- `4064387b` policy/request/evidence codec.
- `7e10868f` public evidence-handle expansion.
- `061e827e` through `1ff6a5c0` cross-store artifact transfer and A/B implementation.
- `70d9b50c` and `0a6c449a` second launcher and caller-binding runtime.
- The uncommitted installed controller A/B refusal expansion.

These are removed from Graphite topology. They are not accepted as hidden
follow-up work.

## Current Gate

- Land the bounded TypeBox, Nx-check, and terminology continuation rooted at
  canonical Template `ec58d06c`; publish and select the resulting immutable
  controller through [[tasks#8. T6F: Landing And Settlement|task 8.1c]].
- Retry personal PR #182 only through its unchanged required remote check. Do not
  use `--no-verify`, legacy sync, a source checkout fallback, or live-state repair
  to compensate for the external account limit.
- After the personal record lands, run canonical status, sync, repeat sync, and
  final status first against the accepted disposable Codex and Claude homes,
  then against approved native homes. The repeated sync must inspect live state
  while performing zero native or lifecycle mutation.
- Keep Inngest `HF01_PENDING`; the exact landed release input excludes its
  external candidate root without blocking unrelated landed content.

## Current Continuation Verification

| Boundary | Result |
| --- | --- |
| TypeBox boundary ownership | Releases, providers, governance, vendors, and packaging use closed schemas as their public structural/type authority. Handlers receive schema-derived inputs; canonical brands, target sorting, duplicate refusal, canonicalization, request digests, retention ordering, and aggregate-byte limits remain domain policy. |
| Provider target decoding | Stored target decoding uses the owning TypeBox schemas and then constructs the branded target digest. The prior second closed-object/provider/path validator is removed without a compatibility reader. |
| Behavior | The integrated lifecycle check passes all three locked Habitat rules, source and test type programs, lint, and 40 files / 439 tests: 38 owner-local unit files / 418 tests plus 2 live-Git files / 21 tests. The final diagnostic-boundary gate passes 6 owner-local files / 57 tests. The existing CLI retention procedure suite still passes all 7 transition cases, including unavailable and throwing readers, malformed or missing pins, deterministic collection, and successful pin expansion. |
| Required Nx check | Production and test type programs remain independently required. Cache keys include TypeScript and Habitat toolchains; the Habitat structure target hashes the lifecycle and CLI source roots it scans, the complete blueprint and RAWR lifecycle policy roots, its check/provision/release mechanics, and the Bun toolchain. Repository separation is part of the required root ratchet, while the live exact-Git target remains noncacheable because `/usr/bin/git` and observed repository state are external inputs. A warm required ratchet at source-equivalent tip `c199e5c1` restored 27/29 lint results, 41/43 type results, the Habitat consumer, and 5/8 lifecycle tasks, then passed all 21 live-Git cases in 51.51 seconds. No retry, timeout increase, or test weakening was used. |
| Habitat consumer | A remote audit on 2026-07-21 confirms `habitat-sdk-v0.1.1` is still the only immutable release. Template already pins its source `177d08eafcaf270daec31d76524065de99aeaff8`, Habitat tree `ee8c5d1b236c3de46684e06f089d859ab9a8f90e`, and Bun 1.4.0 build. Civ7's newer committed `tools/habitat` implementation is at `5cf415e5b951eea9112e07a69520cd1c40d054d7`, subtree `153688c31d0d6b819ddb7ad0b00b4bc7e7386287`, but has no immutable release. Magic Migration's uncommitted blueprint policy is peer reference material and was not copied. No source vendoring or branch pin entered this stack; see [[.habitat/AUTHORITY|the Habitat authority boundary]]. |
| Standing reviews | Architecture/authority, TypeScript/TypeBox/oRPC, behavior/testing/state-machine, and structural/Habitat reviewers report no P0-P3 for the source-equivalent continuation now ending at `c199e5c1`. The reviews confirm bounded public diagnostics, owner-local TypeBox and behavior checks, positive five-module topology, monotonic Nx inputs, and no new state owner, aggregate command surface, compatibility path, repository coupling, or app/runtime work. |
| Scope | No Personal repository, provider home, current-main channel, controller selector, app/runtime surface, destination, or protected-lane input was mutated by this continuation. |

## Legacy Export Retirement Admission

The live installed controller was inspected read-only before capsule and undo
reachability were removed. `rawr doctor global --json` reported stable data root
`/Users/mateicanavra/.local/share/rawr` and selected controller
`37e09f7a829e446404bc54f354d920ca3a338f8d00fd9a06fbc4a9d63dc39ec7`.
The derived capsule root
`/Users/mateicanavra/.local/share/rawr/agent-plugins/last-operation-v1` was absent;
its parent was a non-symlink directory. No state file existed, so no applying,
undoing, committed, or otherwise non-idle export capsule can be stranded. The
inspection performed no create, repair, clear, replay, provider, destination, or
other lifecycle mutation.

## Legacy Export Retirement Implementation Proof

| Boundary | Result |
| --- | --- |
| Service topology | The root oRPC contract, router, and client contain exactly five capability modules: releases, vendors, packaging, providers, and governance. Export host dependencies, module routers, public bindings/ports, and package exports are absent without an alias or replacement implementation. |
| CLI command surface | The exact curated command inventory is build, check, create, package, status, sync, test, and `vendors status`/`vendors update`. Export and undo fail command discovery; unrelated `rawr tools export` remains. |
| Provider state | The complete-home procedure, sidecar scan port, pathless scan adapter, and caller bridge are absent. Point-addressed identity and receipt reads/writes remain the only provider target-record state path. |
| Behavior proof | Agent-plugin lifecycle passed 39 files / 381 tests. CLI passed 40 files / 254 tests, including exact command discovery and retired nested export/undo refusal. The provider-record Effect resource passed 14 tests / 98 assertions. The one CLI case that failed only under deliberate cross-project full-suite concurrency passed 17/17 in isolated reruns, including the exact failed convergence oracle. |
| Static proof | Resource, service, and CLI lint, typecheck, and build passed. Service/CLI sync passed. Frozen install passed after importer-lock regeneration. The complete required ratchet passed all admitted lint/typecheck targets, the three locked Habitat rules, and Habitat consumer/dependency proof. Strict OpenSpec and `git diff --check` passed. |
| Reviews | Architecture/authority, TypeScript/refactor/TypeBox, behavior/testing/state-machine, and structural code quality report no remaining P0-P3 findings. Native disposable-home convergence remains the operational acceptance boundary. |
| Scope | No Personal repository, provider home, destination, channel, controller selector, protected-lane input, or app/runtime composition was mutated or expanded. Destination/export realization remains transferred to the dedicated full architecture migration. |

## Template Continuation Landing Proof

The continuation landed as one simple Graphite stack above the landed
predecessor. Each node remained an independently reviewable behavior or
boundary change; no compatibility implementation or cross-repository ancestry
entered the landing.

| Boundary | Result |
| --- | --- |
| Stack identity | `dd6ad50f` -> `c60b0748` -> `50089718` -> `94190680` -> `40204918` -> `abc62679`, rooted directly at canonical Template `main` `5b588ae6`; the composed tree is `c2da5b8bd8110fa1df5b5ea77c245972b76b444d`. |
| Behavior | The latest integrated behavior gate passed 42 lifecycle files / 381 tests and 47 CLI files / 325 tests. The native-provider resource passed 23 tests, and the controller distribution suite passed 93 tests / 1,240 assertions. The final package-only node changed no runtime behavior. |
| Static and structural | Resource, lifecycle, CLI, and controller lint/typecheck/build gates passed at their owning nodes. The composed required ratchet passed all 29 admitted lint targets, all 42 admitted typecheck targets, Habitat provisioning/consumer proof, and all three locked positive topology rules. Strict OpenSpec and `git diff --check` pass on the recorded tip. |
| Standing reviews | Architecture/oRPC, TypeScript/TypeBox, and structural/Habitat composed-tip reviews report no P0-P3. Behavior/testing reports no P0-P2 and retains one nonblocking P3: the workflow-only immutable-release transitions are not product proof until the landed-main publication runs. That ceiling is exactly task 3C.4. |
| Landing | PRs #390-#396 are merged. Canonical Template `main` is `2f9e303a13860e92d0011d228277c4c2149f6b78`, tree `70f9f5332252c67926d8fc5d48c0109eb32fff50`; exact-tip ratchet run `29735592428` passed. |
| Proof ceiling | Publication run `29736289655` failed before upload and release creation. No controller asset was published or installed, and no Personal, provider, channel, or protected-lane state was mutated. |

## T6F Personal Checkpoint Prerequisites

The first Personal lifecycle record cannot be handwritten around an absent
Template interface. The narrow prerequisite sequence is monotonic: Template
first canonicalizes one release-input record without ports; repository checks
then reject an undeclared canonical plugin child; complete-test returns the
exact successful provider binding it already verified; finally, landed
Template `main` publishes an immutable installed-controller artifact for
repository-independent CI use. None of those steps creates another state owner.

The `release-input-record` slice stays inside the existing releases
module and qualified `check` command. JSON arrives through bounded stdin because
a complete closed-world input may exceed safe argument limits. The procedure
either validates exact envelope bytes or constructs the canonical envelope from
a body, and the CLI transports those bytes without reserialization. Git,
artifact, package, export, provider, governance, and filesystem resources remain
cold.

| 3C.0 boundary | Proof |
| --- | --- |
| Schema authority | Closed readonly TypeBox schemas own the complete canonical body, envelope, and payload-manifest entry; their public wire types are `Static<>` projections. `Type.Unsafe` is confined to nominal branded string leaves whose runtime schemas still carry concrete constraints. Derived ownership indexes and completeness witnesses are absent from the wire envelope. |
| Failure ownership | The oRPC `encode-body` carrier remains `Type.Unknown()` intentionally. Bounded releases-owned parsing preserves exact typed issues for malformed candidates, then TypeBox checks the normalized postcondition; an over-limit getter regression proves validation does not traverse beyond the protocol member bound. Envelope validation performs one bounded body-schema pass. |
| Behavior | Focused body/envelope/schema proof passed 22/22. The complete lifecycle suite passed 42 files / 382 tests with canonical bytes, digest, ownership closure, aggregate ceilings, noncanonical refusal, and raw malformed-body diagnostics unchanged. |
| Static and structural | Lifecycle lint and typecheck passed. The lifecycle `check` target passed all three locked Habitat rules, including Grit dependency direction. Strict OpenSpec validation and `git diff --check` passed. |
| Reviews | Architecture/oRPC, TypeScript/TypeBox, and behavior/state-machine reviewers report no remaining P0-P3. Review findings moved deep TypeBox checks behind bounded parsing, moved the manifest schema to its payload owner, removed unnecessary component-schema package exports, reused the canonical path limit, and corrected this active record before closure. |
| Proof ceiling | This changes only structural/type authority for the existing release-input wire record. It adds no command, repository observation, writer, provider operation, compatibility path, or new lifecycle state. |

| 3C.1 boundary | Proof |
| --- | --- |
| Service ownership | One releases-owned TypeBox contract and oRPC handler accept body or envelope bytes and return the codec-owned canonical envelope. Request, result, and shared release-issue types are `Static` projections of their owner-local schemas; the oRPC contract consumes those exact schemas through the HQ SDK adapter. The request/result transport uses a refined `Uint8Array` `Type.Unsafe` leaf, while the canonical record's nominal branded string leaves are documented in 3C.0 above. The handler has no repository, filesystem, artifact, package, export, provider, governance, capsule, Oclif, app, or runtime capability. |
| CLI transport | Existing `check --mode release-input-record` accepts only nonterminal, nonempty stdin through the protocol ceiling, rejects cross-mode flags before client construction, invokes exactly one procedure, and preserves validated canonical bytes in JSON and human output without reserialization. |
| Behavior | The complete lifecycle suite passed 42 files / 365 tests and the complete CLI suite passed 47 files / 324 tests. Current-byte focused proof passed 2 lifecycle files / 8 tests and 3 CLI files / 21 tests, including exact body/envelope round trips, compile-time schema/type equality, malformed and surplus adapter rejection, malformed UTF-8/JSON and digest refusal, terminal/empty/exact-limit/over-limit stdin, cold executable bindings, one-procedure dispatch, and human byte identity. |
| Static and structural | Lifecycle and CLI lint, typecheck, and build passed without cache. All three locked Habitat rules passed: positive service topology, dependency direction, and command-channel topology. Strict OpenSpec validation and `git diff --check` passed. |
| Reviews | Architecture/authority, TypeScript/refactor, behavior/testing, and structural/Habitat reviewers report no remaining P1/P2. The structural loop moved the sole runtime release-value import back through the admitted CLI input module without relaxing the ratchet. The TypeScript loop removed two redundant whole-envelope copies. |
| Proof ceiling | This proves pure canonical authoring and transport only. It does not write a Personal record, inspect Git, build a release, mutate a provider, or satisfy [[tasks#3C. Personal Checkpoint Prerequisites|tasks 3C.2-3C.5]]. The repository resolves oRPC 1.13.5, so this is a local direct-client claim rather than the later 1.14.8 wire fixture. |

### T6F Release-Input Refresh Prerequisite

This bounded checkpoint advances [[tasks#3C. Personal Checkpoint Prerequisites|task 3C.1a]]
inside the existing releases module and qualified check command. It projects one
review candidate from staged Git; Personal remains the authority that adopts the
bytes through review and commit.

| 3C.1a boundary | Proof |
| --- | --- |
| Closed input | The closed TypeBox request requires one duplicate-free explicit member list. The CLI accepts it only as repeatable `--member` values in `release-input-refresh` mode; it does not overload targeted `--plugin` or infer membership from directories, package metadata, frontmatter, installed providers, or legacy tooling. |
| Schema authority | One dependency-contract DTO owns the closed TypeBox workspace leaves, clean policy, and source-issue schema with `Static<>` types. The staged policy and refresh request compose those exact schemas; the CLI enforces the same `MAX_RELEASE_MEMBERS` ceiling before client construction. |
| Observation and derivation | One existing Effect content-workspace observation returns the complete staged index while materializing only the exact selected roots and optional release-input path. The handler freezes a flat request snapshot before the observation await. Releases-owned policy rejects source races, noncanonical or undeclared children, and missing declared roots; every selected regular file enters its member payload, while only exact `skills/<identity>/SKILL.md` paths create inventory and skill claims. Logical entry/member/set bounds count each selected path even when paths share one Git object and refuse before payload copying/base64 construction. |
| Existing record | A valid existing canonical record contributes only surviving explicit member vendor/curation bindings, alias/provider-identity/destination claims, locks, and quality policies. Missing state contributes empty arrays. Invalid or wrong-authority bytes refuse; no ancillary state is inferred or repaired. |
| State law | `ReleaseInputCandidateReady` and `ReleaseInputReadOnlyConverged` both carry the unique canonical bytes. Every refusal stutters. The handler lexically invokes only `stagedSource.observe`; focused proof keeps writer and unrelated artifact, package, export, provider, governance, and channel ports cold. It creates no store, receipt, cache, ledger, or second state owner. |
| Proof | Before the final review fixes, the complete lifecycle suite passed 43 files / 390 tests and the complete CLI suite passed 47 files / 326 tests; both owners' lint, typecheck, build, sync, structural, locked Habitat/dependency, strict OpenSpec, and diff gates were green. The final request-snapshot and logical-byte fixes then passed the affected refresh file 9/9 plus lifecycle lint and typecheck without cache; no duplicate full suite was launched. The synthetic Personal-shaped case covers 11 exact owners, 1,610 staged files, 100 skills, and 111 derived ownership-index claims; exact repeat is byte-identical, malformed and wrong-authority prior records refuse, a noncanonical derived root refuses before Git observation, caller mutation across a deferred observation cannot rewrite authority, and 65 logical MiB sharing one 1 MiB object refuses before payload construction. |
| Proof ceiling | This proves local direct-client semantics for repository oRPC 1.13.5 plus the selected CLI projection. It does not adopt Personal bytes, prove a landed controller asset, build a complete release set, or mutate repository/channel/provider state. |

### T6F Current-Main Path Correction

This bounded checkpoint completes
[[tasks#3C. Personal Checkpoint Prerequisites|task 3C.3a]]. Governance reads the
reviewed selector only from
`.rawr/agent-plugin-lifecycle/channels/current-main.json`; it does not scan or
fall back into curated plugin content.

| 3C.3a boundary | Proof |
| --- | --- |
| Sole path | The compiled governance path is outside `plugins/agents`. Neither historical `plugins/agents/.lifecycle/current-main.json` nor `plugins/agents/.lifecycle/channels/current-main.json` is an alias. The existing closed plugin-root policy receives no exception for `.lifecycle` children. |
| Behavior | Real-Git selection accepts the canonical `.rawr` record. Each old-path-only fixture contains a valid envelope, yet returns `STALE_RECORD`; a fallback would make either fixture eligible and fail the test. |
| Static and record proof | Focused governance proof passed 2 files / 19 tests. Lifecycle lint and typecheck passed without cache; strict OpenSpec validation and `git diff --check` passed. |
| Proof ceiling | This changes only fixed repository path policy. It adds no schema, migration reader, writer, state store, repository coupling, provider access, or runtime composition. |

The Personal repository is currently private on a host plan whose ruleset and
branch-protection APIs reject required-check configuration. Repository code can
still supply an unconditional workflow and non-skippable-by-default local
feedback, but it cannot honestly prove that a direct push is impossible. That
server-side enforcement is an external operational precondition, not a reason
to add a local bypass, auto-repair path, or second lifecycle authority.

## T6F Declared Plugin Tree Prerequisite

This prepared checkpoint advances [[tasks#3C. Personal Checkpoint Prerequisites|task 3C.2]]
as one releases-owned repository-eligibility rule. It does not scan a provider,
global home, or unrelated repository path.

| Boundary | Result |
| --- | --- |
| Closed-world rule | Staged-index and clean Git-object checks derive and code-unit-sort every immediate child beneath the declared plugin root. They first refuse a noncanonical child name or root-level blob shape, including a blob named for a declared plugin, and otherwise refuse the first undeclared canonical plugin before reading its payload. Declared-member file closure remains owned by the existing release codec and payload checks. |
| Observation | The staged path consumes the one captured index observation; the clean path consumes the one anchored Git tree. Paths outside the configured plugin root are ignored, and the rule acquires no capture, apply, restore, settle, release, artifact, provider, or filesystem write authority. |
| Proof | On the integrated continuation stack, the complete lifecycle suite passed 42 files / 372 tests. Focused staged and clean cases passed 29/29 and prove deterministic first-child refusal for canonical undeclared plugins, invalid-case directories, root-level files, and a root-level blob named for a declared plugin. They also preserve unrelated-path exclusion, one release-input blob read, zero undeclared payload reads, and zero writes/evidence captures. Lifecycle lint, typecheck, build, sync, all three locked structural rules, strict OpenSpec, and `git diff --check` passed without cache. |
| Structural boundary | The policy is an owner-local pure release module. No global scanner, semantic Grit rule, package export, CLI mode, provider dependency, or Personal repository relationship is added. |
| Reviews | Final architecture/oRPC, behavior/testing/state-machine, TypeScript/refactor, and structural/Habitat reviews report no remaining P1/P2. |

## T6F Verified Provider Binding Prerequisite

This prepared checkpoint advances [[tasks#3C. Personal Checkpoint Prerequisites|task 3C.3]]
inside the existing provider module. It projects identity already established by
complete-test; it creates no receipt, evidence store, channel, or second provider
state owner.

| Boundary | Result |
| --- | --- |
| Binding authority | A successful complete-test target returns its exact provider, projection digest, renderer protocol, adapter protocol, and capability-profile digest. Blocked and failed targets expose `null`; targeted-test outcomes remain unbound. A successful complete-test without the matching tested projection fails internally rather than fabricating an identity. |
| Schema authority | `ProviderProjectionBindingSchema` is a closed, readonly TypeBox artifact and its TypeScript type is exactly `Static<typeof Schema>`. All five provider procedure result types derive from their concrete schemas; the one module-local `Parse(schema, Clone(result))` projection validates output and severs aliases. The later [[README#T6F Bounded Provider Procedure Results|bounded-result correction]] removes execution-byte leaves from the two public test results without changing that binding. |
| Native behavior | Complete-test refreshes a selected stale member while preserving an omitted installed member, returns the binding for every successful target, and then repeats through live inspection with zero mutation, receipt, sidecar, or evidence writes. Existing targeted-test preservation remains unchanged. |
| Proof | Focused provider behavior/schema proof passed 43 tests; on the integrated continuation stack, the complete lifecycle suite passed 42 files / 375 tests. Lifecycle lint, typecheck, build, sync, structural/Habitat, strict OpenSpec, and `git diff --check` passed after the TypeBox correction. |
| Reviews | Architecture/oRPC, TypeScript/TypeBox, behavior/state-machine, and structural/Habitat reviews report no remaining finding. |
| Scope | No provider home, Personal repository, controller selector, release/channel record, export destination, or protected-lane input was mutated. [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|Export task 5.2]] remains blocked and untouched. |

## T6F Native Hook-Claim Correction

The first stale-set disposable complete-test stopped before any provider-home
mutation because projection construction treated the declaration filename
`hooks.json` as a globally unique hook identity. Native providers scope hook
events to their plugin selector, so Habitat and Hyperresearch may both declare
`Stop` without sharing plugin, skill, or filesystem identity.

| Boundary | Result |
| --- | --- |
| Schema authority | One provider-model TypeBox schema and its `Static<>` type decode the canonical native `hooks/hooks.json` manifest path. Projection construction and native package readback derive the same normalized event slugs from nonempty typed handler declarations in that schema; provider-specific handler semantics remain native-owned. |
| Collision boundary | Hook events are compared only inside their owning plugin member. Global plugin, native identity, and skill collision refusal remains unchanged, and exact per-member hook visibility remains part of convergence verification. Codex observation retains selector attribution and does not bind RAWR to the provider's temporary positional hook key. |
| Proof | Provider proof passed 16 files / 200 tests under the owner-declared Bun host, and the complete lifecycle service passed 43 files / 406 tests. Coverage includes two members that both expose `Stop`, canonical/no-op/invalid manifest behavior, same-event mutation and read-only repeat convergence, unrelated standalone same-event coexistence, and retained native/skill conflicts. Lifecycle lint, typecheck, all three locked Habitat rules, strict OpenSpec, and `git diff --check` passed. |
| Mutation ceiling | The failed disposable attempt and this correction performed no Claude, Codex, Personal, channel, export, or protected-lane mutation. Native acceptance resumes only from the landed immutable replacement controller. |

## T6F Bounded Provider Procedure Results

The first cold retry after the stale disposable homes had converged returned the
correct `ReadOnlyConverged` outcome, but CLI JSON projection expanded repeated
provider payload `Uint8Array` values into a 1,826,550,408-byte document. The
provider operation was correct; its public result boundary was not bounded.
This correction follows [[specs/agent-provider-deployment/spec#Requirement: Provider procedure results keep execution bytes private]].

| Boundary | Result |
| --- | --- |
| TypeBox authority | The complete-test and targeted-test result schemas now close each public package-file observation over `path`, `mode`, and `contentDigest`. Internal projections, plans, and native mutation actions retain their required bytes. One provider-owned projector removes only those leaf bytes before the existing `Clone` plus `Parse`, so the TypeBox schema remains the sole public static/runtime authority. |
| Behavioral truth | Target-local plan steps, planned/applied/uncertain/verified/retired/skipped/blocked/failed events, issues, visible fingerprints, exact complete-test bindings, and aggregate evidence remain ordered and observable. No event-dropping CLI redactor or generic serializer is introduced. |
| Incident evidence | The abandoned cold-retry output reported mechanical evidence `me1_91e5c904c1aba73115fb361fe7cb2d08ca8e783c73a03a8c94d502af81db2f55` and file SHA-256 `7898052e9998d448268aaf7757e8a849b18fd8e4787c648eb7881004183591a4`. It was removed only as an exact file; no provider home or recursive caller path was cleaned. |
| Proof | Focused TypeBox procedure proof passed 6/6 and covers both test modes, the complete event/action and plan-step order, exact binding preservation, rejection of byte-bearing public values, absence of `Uint8Array`, and byte-length-independent serialization across one-byte and two-megabyte internal payloads. The full lifecycle suite passed 43 files / 407 tests and the serialized CLI suite passed 47 files / 326 tests. Both projects passed lint, typecheck, build, sync, and structural checks. The complete repository ratchet passed 29 lint targets, 42 typecheck targets, the three-test Habitat consumer, and all three locked topology rules; strict OpenSpec and `git diff --check` passed. Architecture/oRPC, TypeScript/TypeBox, and behavior/testing/structural reviews report no P0-P3. |
| Scope | This changes no provider state machine, native command, receipt, evidence identity, channel, Personal repository, controller selector, app/runtime surface, or protected-lane input. The already-converged stale disposable homes remain the next acceptance preimage. |

## T6F Claude Marketplace Replacement Correction

The first current-set disposable complete-test exposed a native Claude behavior
that the in-memory adapter proof had not modeled: removing the `rawr-hq`
marketplace also removed installed metadata for an omitted member before the
complete-test policy could preserve it. A separate disposable native probe
proved that adding the new source over the same marketplace identity updates
the source while preserving installed members.

| Boundary | Result |
| --- | --- |
| Native mapping | `Absent -> Present` and `Present -> Present` use Claude's native marketplace add operation after the replacement location is admitted. Only `Present -> Absent` uses native marketplace remove. RAWR still delegates marketplace and plugin state to Claude rather than implementing either store. |
| Omission law | Replacing a selected same-ID release cannot implicitly uninstall an omitted member. Complete-test remains preservation-only; later [[specs/agent-provider-deployment/spec#Requirement: Canonical replacement precedes omitted-member cleanup|canonical convergence]] owns omission retirement. |
| Proof | The focused Claude marketplace-location suite passed 11/11 cases, including absent install, present replacement without remove, preserved omitted membership, and explicit retirement. Lifecycle lint, typecheck, full behavior, and the required repository ratchet remain the enclosing gate. |
| Scope | The probe used only an explicit disposable Claude home. The correction adds no provider installer, receipt, scan, fallback, schema, channel transition, Personal mutation, or protected-lane input. |

## Pre-Landing Immutable-Release Setting Mutation

The installed-controller distribution work crossed its operational gate once.
This record preserves the exact repository preimage and outcome rather than
rewriting the setting or treating it as settlement:

| Observation | Exact evidence |
| --- | --- |
| Preimage | At `2026-07-20T04:02:24.522Z`, a read-only `GET repos/rawr-ai/rawr-hq-template/immutable-releases` returned `{"enabled":false,"enforced_by_owner":false}`. |
| Premature mutation | At `2026-07-20T04:03:51.270Z`, the active task invoked `PUT repos/rawr-ai/rawr-hq-template/immutable-releases`; it completed at `04:03:55.552Z` with an empty response body, and the postimage below confirms success. This occurred before the distribution slice was landed or [[tasks#8. T6F: Landing And Settlement|the landing and settlement gate]] opened. |
| Outcome | A read-only verification begun at `2026-07-20T04:04:02.812Z` returned `{"enabled":true,"enforced_by_owner":false}` at `04:04:06.565Z`. The enabled setting is retained; no compensating disable mutation is authorized. |
| No dispatch | Read-only follow-up at `2026-07-20T05:04:57Z` found `release_count=0`, no `workflow_dispatch` run since `04:00Z`, and only the existing `Repository Ratchet` workflow. The installed-controller workflow is not present on canonical `main`, so the setting change created no release, tag, asset, controller selection, workflow dispatch, channel transition, or provider mutation. |
| Remaining gate | The landed workflow requires a nonempty `CONTROLLER_RELEASE_ADMIN_READ_TOKEN` solely for its Administration-read setting check and exits before release creation when that secret is absent; release mutation remains on GitHub's native workflow token. The temporary credential is removed after the bounded repair/retry cycle. |

This is operational evidence, not controller installation or release proof. It
does not advance any T6F checkbox.

## T6F Installed Controller Distribution Prerequisite

This prepared checkpoint supplies [[tasks#3C. Personal Checkpoint Prerequisites|task 3C.4]]
without making a Template checkout, Personal repository, provider home, or
ambient `rawr` executable part of controller identity. Task 3C.4 remains open
until the landed workflow publishes and the exact immutable asset is verified.

| Boundary | Result |
| --- | --- |
| Asset construction | One selected, verified controller release becomes a deterministic tar containing only its stable launcher, selector, envelope, and manifest-owned payload. A closed TypeBox provenance schema is the runtime and static authority for source revision, platform, architecture, controller digest, runtime, archive identity, and versioned recipe; only the branded digest leaf uses `Type.Unsafe`. |
| Repository independence | The matrix proof extracts each asset, hides the source checkout, changes to a foreign working directory, and requires the installed controller to report the exact selected verified digest through an absolute launcher. No Personal bytes, content checkout, repository ancestry, provider state, or second controller store enters the artifact. |
| Publication | A main-only manual workflow builds the four declared Darwin/Linux and arm64/x64 tuples, checks the closed eight-file asset set, fails closed when the Administration-read secret cannot prove immutable releases are enabled, and refuses an existing release or tag before native GitHub release creation. Publication is keyed by the exact Template revision and verifies the immutable release, target commit, and asset inventory. |
| Pre-publication proof | Before the live attempt, the complete controller suite passed 93/93 tests with 1,240 assertions; uncached lint and typecheck passed. After the TypeBox authority correction, the focused asset suite passed 11/11 tests and lint, typecheck, inline schema import, and `git diff --check` passed again. |
| Reviews | Architecture/oRPC, TypeScript/TypeBox, behavior/state-machine, and structural/Habitat reviews report no remaining finding. |
| First live attempt | Workflow run `29736289655` targeted exact landed revision `2f9e303a13860e92d0011d228277c4c2149f6b78`. All four Darwin/Linux, arm64/x64 jobs built successfully, then failed the repository-independent extraction proof with `CONTROLLER_RELEASE_INVALID` mode mismatches. The release job was skipped; read-back found no `controller-2f9e303a...` release or tag. |
| Failure diagnosis | The observed failure was writer-owned: `tar@7.5.7` portable mode deliberately applies `(mode | 0o600) & ~0o22`, which changed read-only installed dependency files such as `0444 -> 0644`. A separate review probe found that ordinary `tar -xf` also applies process umask (`0664 -> 0644`); that was not established as a cause of run `29736289655`, but it independently contradicted the exact-mode proof. |
| Repair proof | The manifest check is retained. Archive construction preserves exact entry modes while omitting host-local owner/time/device/inode/link-count metadata, including through a PAX-length entry and an inode replacement between deterministic builds. Production and test extraction now use argv-safe `tar -xpf`; the complete controller suite passes 93/93 tests with 1,246 assertions and proves exact `0755`, `0444`, and `0664` extraction. All 29 admitted lint targets, all 42 admitted typecheck targets, Habitat consumer proof, and all three locked lifecycle topology rules pass. Strict OpenSpec and `git diff --check` pass; final standing review reports no P0-P3. |
| Scope | The attempt created no release, tag, asset, controller selector, channel, or provider state. The repair changes no schema, controller selection, provider adapter, Personal record, or release-set semantics. |

## Template Required Ratchet Settlement Gate

The Template repository has the required workflow but does not yet have the
server-side rule that makes it non-optional. This is a settlement precondition,
not another source-code mechanism:

| Observation | Exact evidence |
| --- | --- |
| Preimage | At `2026-07-20T09:03:01Z`, read-only GitHub API inspection returned HTTP 404 `Branch not protected` for `rawr-ai/rawr-hq-template` `main` and `[]` for repository rulesets. |
| Consequence | `.github/workflows/repository-ratchet.yml` runs `ratchet:required`, and the local pre-push hook provides ordinary feedback, but neither currently prevents an authorized direct push or `--no-verify`. The initiative cannot call lint, typecheck, and Habitat non-skippable yet. |
| Settlement order | Perform no repository-policy mutation before [[tasks#8. T6F: Landing And Settlement|task 8]]. After the continuation stack lands, configure one server-owned rule for canonical `main` requiring `Repository Ratchet / Required lint, typecheck, and topology`, then read back the exact rule and prove a failing candidate cannot merge before closure. |
| Boundary | The repository rule owns merge admission only. It does not become lifecycle state, run provider convergence, modify Personal, or create a fallback controller path. |

## Template Submission Readiness Proof

The aggregate gate found one owner-local harness issue and no product-behavior
failure. Two ordinary parallel lifecycle runs each refused a different real-Git
fixture; both cases passed immediately in isolation, and one serialized full
run passed. Commit `8b70a87fada52018f00c5fbaa267f24933d0c84e`
makes the owning lifecycle Vitest project serialize files without a wrapper,
retry, or product change.

The first remote submission also exposed three checkpoint-ordering defects,
not three product defects: the staged Git operation entered its exhaustive
vendor label map one node late, the staged-source capability entered production
and test context one node late, and the artifact-context Habitat test retained
a write-capable accepted fixture after production narrowed to reader-only.
Those exact dependencies now land with their owners at `67a0d254`,
`fb123645`, and `0dbd68a4`; the later CLI and export nodes retain only their own
activation and retirement changes.

| Boundary | Result |
| --- | --- |
| Lifecycle behavior | The final restacked ordinary `@rawr/agent-plugin-lifecycle:test` Nx run passed 41 files / 361 tests in 46.22 seconds. |
| CLI behavior | The final restacked ordinary `@rawr/cli:test` Nx target passed 46 files / 320 tests in 279.13 seconds. |
| Required ratchet | Repository lint passed across 29 projects, typecheck passed across 42 projects, and the locked positive Habitat topology, dependency-direction, and qualified-command rules passed 3/3. Lifecycle lint and typecheck also passed uncached after the owner correction. |
| Record and protected path | Strict OpenSpec and `git diff --check` passed before final review. The protected note remained unstaged and was restored byte-identically at SHA-256 `d06966389dac095f8a7f620aa4b27a50935a75762300000f987a848e45c2aadb`; no holding root remained. |
| Remote submission | All 43 retained PR nodes passed `Required lint, typecheck, and topology` independently after resubmission. `gt merge --no-interactive --dry-run` accepted the complete stack. |
| Proof ceiling | No provider or personal repository was mutated. Landing, installation, personal checkpointing, native acceptance, and settlement remain T6F work. The remote ratchet is a completed submission gate, not native or product-settlement proof. |

## T6E Deterministic Official Manifest Proof

The separately committed controller fix closes
[[tasks#7. T6E: Deterministic Official Manifest]] without adding a provider,
personal-repository, app/runtime, transfer, launcher, or selector authority.
Generated Oclif manifests first pass through native JSON projection, then emit
object keys in code-unit order while retaining semantic array order and leaving
the discovered input untouched.

| Boundary | Result |
| --- | --- |
| Focused behavior | The production-builder file passed 34/34 tests, including insertion-order independence, native `toJSON` projection, index-like key ordering, array preservation, and input immutability. |
| Controller gate | The full `@rawr/controller-build` suite passed 82/82 tests; its uncached lint and typecheck targets passed. |
| Clean build equality | Two fresh controller data roots built restacked source revision `75d737d03c10fb6c203d97ebd026cbcd26f02b34` to controller digest `87765c81d8c8bbe8738282ec2347359049b4b3d94c2904713cd683fd686e81a8`. |
| Normalized release tree | Both digest-qualified releases contained 21,117 entries with byte-, type-, mode-, and link-target-identical normalized manifests; manifest SHA-256 `3e7949acda7661ae825c1f0c8de674a92bd92818cac4b8ef7123a4e0e135b1dd`. |
| State boundary | The proof executed no provider and touched no live or global controller state. Its exact guarded `/private/tmp` roots were removed, and the protected user note was restored byte-identically at SHA-256 `d06966389dac095f8a7f620aa4b27a50935a75762300000f987a848e45c2aadb`. |
| Reviews | Testing/state-machine, architecture/authority, TypeScript/refactor, and structural/Habitat reviewers approved the final two-file implementation with no remaining finding. |
| Record gate | Strict OpenSpec validation and `git diff --check` passed. |

## T6B Proof

The three nodes deliberately separate resource observation, service-owned
policy/router behavior, and CLI projection.

| Boundary | Result |
| --- | --- |
| Service | 32 files / 292 tests passed. Repository validation owns semantic classification, closes the staged-index race, enforces checked payload bounds, and acquires no unrelated module port. |
| CLI | Two focused files / 16 tests passed, including 13 qualified-command cases; each accepted mode selected exactly one typed procedure, while mixed, retired, or surplus inputs rejected before client construction. |
| Content Git provider | 24 tests passed; staged reads used declared blobs, `GIT_NO_LAZY_FETCH=1`, and no object-authoring or worktree-changing command. |
| Closed input | The settlement contract selects landed canonical personal main and supplies no external Inngest candidate locator, member, or destination. Protected runtime mode/flags are unreachable. Operational execution remains a T6F proof. |
| Static/structural | Lint and typecheck passed in all four affected projects, builds passed in all three build-owning projects, and lifecycle check/structural plus CLI structural passed without cache. |
| Reviews | TypeScript/refactor, architecture/authority, behavior/testing, and structural quality approved the narrowed implementation with no remaining P1/P2. |

## T6C1a Proof

This checkpoint implements only the pure public half of
[[design#One current-main record is the selection authority]], under
[[authority-amendment#Corrected Frame]] and
[[tasks#3A. Pure Codec And Public Interface]]. It does not resolve Git
authority, select provider state, or make the retired v1 path unreachable.

| Boundary | Result |
| --- | --- |
| Codec/model | Closed TypeBox body/envelope, fixed `[claude,codex]` tuple, `cm2_` canonical-body digest, 2 MiB envelope bound, unique newline-terminated bytes, and stable `agent-plugin-current-main@v2` protocol passed malformed/surplus/provider-order/digest/canonicality tests. |
| Service | One governance `currentMainRecord` procedure exposes encode/validate; 34 files / 305 tests passed and the procedure's default throwing lifecycle ports remained cold. |
| CLI | Existing `check --mode current-main-record` admits exactly one inline body/envelope input, constructs no executable/resource authority, and invokes exactly one typed procedure. JSON projects codec-owned bytes as exact newline-preserving `envelopeText`; human output and encode-to-validate round trips preserve those bytes. Two focused files / 17 tests passed. |
| Static/structural | Lifecycle and CLI lint, typecheck, and build passed without cache. Both positive structural suites passed; no new Habitat rule was required because the admitted module/router topology was already closed. |
| Reviews | TypeScript/refactor, architecture/authority, behavior/testing, and structural quality approved the bounded checkpoint with no remaining P1/P2. |

## T6C1b Private Selector Proof

This is a private implementation checkpoint inside
[[tasks#3B. Observed-Git Selection And Cutover]]. It completes no public task:
the new selector has no service contract, router member, client operation, or
CLI mode. Canonical-provider activation and v1 ceremony deletion remain one
atomic authority checkpoint, so no Graphite node exposes two selectors.

| Boundary | Result |
| --- | --- |
| Private engine | One TypeBox-owned result union returns `CURRENT_ELIGIBLE` or exactly dirty, wrong, unreachable, stale, or forged refusal. The resolver accepts the existing branded Git locator and has no oRPC handler, module/router composition, public package export, or command projection in this node. The full service passed 35 files / 310 tests. |
| Observed Git | The selector reads the fixed v2 record at observed `refs/heads/main`, reads the fixed release input at the selected reachable commit/tree, verifies digest and content authority, then re-observes the identical repository/ref/commit/tree once without retry. Later unselected content remains irrelevant. |
| Real resource | An Effect Platform content-workspace fixture created a present orphan commit with otherwise valid selected bytes. Native Git reachability rejected it as `FORGED_RECORD`; no map-backed test substituted for that boundary. The full five-code stale/forged partition is exercised against both record and selected-input reads, and the real-resource file passed 2/2. |
| Unreachability | The governance contract/router/service spine and CLI operation union, flags, parser, dispatcher, and client selector remain byte-identical to the parent. Only the test fixture imports the private resolver directly. The installed controller therefore retains exactly the old selector until the later atomic cutover. |
| Static/structural | Lifecycle and CLI lint, typecheck, build, sync, and positive structural suites passed without cache. Strict OpenSpec and `git diff --check` passed. No Habitat rule changed because this node adds no reachable service/router member. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural proportionality approved the private engine after closing schema-drift, duplicate-classification, redundant-freeze, failure-partition, real-reachability, and premature-public-activation findings. No P1/P2 remains. |

## T6C2a Proof

This earlier checkpoint implements
[[tasks#4. T6C2: Thin Canonical Provider Path|tasks 4.6-4.7]] before the
separately landed managed-retire deletion. It removes provider rollback
authority before the remaining command and selector cutovers.

| Boundary | Result |
| --- | --- |
| Provider service | All provider modes are capsule-cold. Provider undo, owner/replay, restoration, and prior-projection ports are deleted. Native attempts are `not-applied`, `uncertain` with an exact bridge boundary, or `applied`; a cold retry accepts only exact same-owner prior/transition/final native states and replans the forward suffix. Full service proof passed 34 files / 303 tests. |
| CLI/runtime | Qualified undo has export-only executable authority. The exact landed idle provider-v1 capsule is decoded privately as opaque bytes: undo classifies it as non-replayable, while first export retires it under the existing lock and raw-byte CAS before export admission. The raw fixture is SHA-pinned with landed-source provenance and no retained encoder. Sixty-five focused CLI tests passed. |
| Failure law | CAS drift, post-publication uncertainty, release failure, malformed/noncanonical/undoing/wrong-owner/wrong-version and independently corrupt action/capsule/state digests block export and undo without changing legacy bytes, admitting export, or invoking provider/native ports. Cold retry re-reads the slot. Native uncertainty stops the target after its exact applied prefix; retry converges and a third pass is read-only. |
| Static/structural | Lifecycle and CLI lint, typecheck, and build passed without cache. Both project structural suites, sync checks, and all three positive Habitat rules passed. A full CLI run passed 346/347; its unrelated high-load Git eligibility case returned `GitFailure` once and passed immediately in isolation. The retained serialized CLI test-owner node remains separately upstack. |
| Reviews | Architecture/authority, TypeScript/refactor, behavior/testing, and structural quality closed stale-receipt retry, uncertainty-schema, migration-failure, inner-digest, and provenance findings. Final rereviews report no remaining P1/P2. |

## T6C2b Proof

This checkpoint completes [[tasks#4. T6C2: Thin Canonical Provider Path|task
4.5]] without reopening the retired provider capsule or adding another
retirement authority.

| Boundary | Result |
| --- | --- |
| Public surface | `rawr agent plugins retire`, `providers.managedRetire`, its request/schema/router/client projection, and the positive Habitat command member are absent. CLI refusal and tools-export tests prove there is no alias or forwarding path. |
| Provider service | `RetireMember` remains only as a canonical-sync plan step. The provider capability is named `native-plugin-retire`; it is a narrow native operation, not a request mode or lifecycle authority. Exact contract/router and capability-set tests passed. |
| State ownership | Receipt deletion and the public receipt-writer removal port are absent. Canonical sync still removes an omitted RAWR-managed member and stale same-ID native state through live inspection; qualified undo remains export-only and does not change provider state. |
| Behavior proof | The complete lifecycle suite passed 34 files / 298 tests. Focused provider mode, schema, state-machine, native adapter, target-record, service-spine, and CLI command/runtime suites passed; the controller black-box passed 80 tests after its provider-undo expectation was removed. |
| Static/structural | Lifecycle, CLI, controller-build, and HQ-plugin lint/typecheck/build gates passed as applicable. Lifecycle and CLI structural/sync checks plus all three positive Habitat rules passed. No recursive deletion was added; generated-file cleanup used guarded exact nonrecursive unlink. |
| Reviews | Architecture/authority, TypeScript/refactor, behavior/testing, and structural quality approved the deletion with no remaining P1/P2. |

## T6C2c Private Desired-State And Convergence Proof

This is a private implementation checkpoint inside
[[tasks#4. T6C2: Thin Canonical Provider Path]]. It adds no contract member,
router composition, client operation, CLI dispatch, binding, or package export.
The provider verifier consumes governance's sole `CanonicalChannelSelection`
through a type-only dependency; it defines no channel DTO, parser, or bridge.
The current-main selector remains separately governance-owned.

| Boundary | Result |
| --- | --- |
| Selection authority | One exact governance selection, including its `currentMainDigest`, survives unchanged into both provider desired states. The verifier checks the selected complete-set artifact identity and exact Claude/Codex projection bindings before returning a fixed provider-specific tuple. No provider-local selector DTO or forgeable proof brand remains. |
| Native authority | The pure planner accepts one already-verified desired state, one provider/adapter-bearing capability observation, and either observable native inventory or explicit ambiguous provenance. It reads no receipt, sidecar, evidence, capsule, filesystem, process, Effect, or port. |
| State law | Native state classifies as `INCOMPATIBLE_PROVIDER`, `BLOCKED_COLLISION`, `DRIFTED`, or `CONVERGED`; `BLOCKED_SELECTION` remains reserved for the next artifact/selection verifier. Marketplace identity plus embedded artifact provenance are jointly required. Unmanaged nonconflicting exposure is preserved. |
| Ordering | Same-ID refresh is retire, absence verification, reinstall, then selected visibility. Omitted selected-owner members retire only after selected visibility, each retirement verifies residue absence, and final verification remains an explicit executor obligation. |
| Unreachability | Production references stop at the private DTO/policy files. The service contract, router composition, client, CLI, bindings, and runtime remain byte-identical to the parent. The legacy canonical path therefore remains the sole reachable path until atomic activation. |
| Behavior proof | Fourteen desired-state cases cover artifact kind, all selected source identities, exact artifact ref, both provider bindings, and renderer/adapter/capability/projection mismatch. Fourteen convergence-policy cases cover receipt-free adoption, missing/disabled state, same-ID refresh, omitted cleanup ordering, both ownership halves, ambiguity, unmanaged preservation, capability/adapter/target mismatch, and zero-step refusals. The full lifecycle suite passed 37 files / 338 tests. |
| Static/structural | Lifecycle lint, typecheck, and build passed without cache. Sync plus all three enforced positive Habitat/dependency rules passed, strict OpenSpec passed, and `git diff --check` is clean. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural proportionality approved with no remaining P1/P2. Exact-prefix execution and `verify-final` closed-set semantics remain named next-node gates. |

## T6C2c Private Native Provenance Observation Proof

This direct-only checkpoint advances [[tasks#4. T6C2: Thin Canonical Provider
Path|tasks 4.2 and 4.4]] without completing either public task. The canonical
resource factories, typed observer, and shared native inventory inspection are
absent from package exports, service contract/router, client, CLI, and runtime
composition. Atomic selector/convergence activation remains a later node.

| Boundary | Result |
| --- | --- |
| One native read | One `NativeInventoryInspection` union retains observed state, closed provenance ambiguity, or ordinary resource failure through a single native inventory pass. The canonical observer consumes that union directly; it does not reconstruct authority from generic issue text or paths. |
| Legacy reachability | Existing targeted, complete, and v1 canonical adapters project ambiguity back to their unchanged `VISIBILITY_FAILED` surface. The new Codex/Claude canonical resource factories are direct-import-only, use the shared inventory interpretation, and expose no mutator. |
| Ownership law | Missing/invalid marketplace metadata, duplicate managed marketplace identity, mismatched marketplace owner, invalid selected-member metadata, and mismatched selected-member owner become explicit ambiguity. Absent selected marketplace remains ordinary absence; mechanical marketplace/plugin read failures remain failures. |
| Resource boundary | Provider bytes still come from the existing Effect Platform resource edge. No Node filesystem/process wrapper, receipt, sidecar, evidence, capsule, marketplace-source state, fallback scan, or new provider installer entered the observer. |
| Behavior proof | Both Codex and Claude resource paths cover observed, ambiguous, and failed outcomes. Throwing mutator stubs prove observation remains read-only, and a regression case preserves the existing public adapter failure surface. The full lifecycle suite passed 38 files / 351 tests. |
| Static/structural | Lifecycle lint, typecheck, build, sync, positive Habitat/dependency structure, strict OpenSpec, and `git diff --check` passed without cache. No new rule was needed because the canonical factories remain outside public topology. |
| Reviews | Architecture/authority, TypeScript/refactor/Effect, behavior/testing, and structural proportionality approved after closing generic issue rehydration, legacy-surface reachability, marketplace-owner validation, and provider-parity findings. No P1/P2 remains. |

## T6C2c Private Convergence Executor Proof

This direct-only checkpoint completes the private implementation prerequisite
for [[tasks#4. T6C2: Thin Canonical Provider Path|tasks 4.2 and 4.4]]. It does
not complete their public activation: refused plans remain planner/router
outcomes, while the executor accepts only an already-observed `CONVERGED` or
`DRIFTED` plan.

| Boundary | Result |
| --- | --- |
| Exact prefix | Only a native `applied` result enters the definite prefix. `not-applied` and both uncertainty boundaries stop immediately; the attempted uncertain action remains separate and no rollback, receipt, resume cursor, or compensation exists. |
| Verification | Every barrier performs exactly one fresh canonical observation and then pure policy verification. Selected visibility may precede omission cleanup; each retirement proves exact owner-qualified selector absence; final verification rejects omitted managed members and selected-owner configuration residue while preserving unrelated native state. |
| Preflight | Target, projection, retirement adjacency, and final-step shape reject before either port runs. Ordinary observation failure and provenance ambiguity preserve the already-confirmed prefix and keep the remaining tail cold. |
| Unreachability | The executor and canonical resource factories remain absent from package exports, service contract/router, client, CLI, and runtime composition. Activation and v1 ceremony deletion remain one later atomic checkpoint. |
| Behavior proof | Twelve executor cases and fourteen convergence-policy cases passed. The full lifecycle service passed 39 files / 363 tests. |
| Static/structural | Lifecycle lint, typecheck, build, sync, positive Habitat/dependency structure, strict OpenSpec, and `git diff --check` passed without cache. No structural rule changed because this node adds no reachable topology. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural proportionality approved after closing plan-shape access, empty-tuple typing, fail-closed proof, and refused-classification findings. No P1/P2 remains. |

## T6C1b And T6C2 Atomic Public Cutover Proof

This checkpoint activates the already reviewed private selector and native
convergence pieces as one public authority change. It simultaneously deletes
the v1 acceptance, hosted-approval, promotion, and canonical receipt path, so
no invocation can choose between the old and new models.

| Boundary | Result |
| --- | --- |
| Public authority | Governance exposes only the pure current-main v2 record codec and the observed-Git current-main selection. Provider canonical status/sync consume that one selection and one immutable artifact read; they receive no receipt, sidecar, evidence, hosted, promotion, channel, or undo port. |
| Native ownership | Codex and Claude are observed and mutated through their native marketplace/plugin commands. Marketplace identity plus embedded artifact provenance owns installed members. One exact selected-owner configuration slot with no installed package may be removed through its native selector; installed and foreign exposures remain preserved collisions. |
| Ordering and retry | Same-ID replacement retires and verifies the exact owner-qualified selector before install. Omitted managed members and configuration residue retire only after selected visibility. Failures report the exact applied prefix; retry re-reads live state, and a converged repeat performs no native mutation. |
| Public outcomes | Canonical status returns terminal classification and issues. Canonical sync adds only the exact applied prefix and terminal verification; neither recreates receipts, persisted inventory, or the retired event history. Selection refusal exits `2`, drift exits `1`, and convergence exits `0`. |
| Retired machinery | V1 current-main resolution, acceptance, hosted approval, promotion attestation, `attest-promotion`, canonical receipt decoding, hosted-governance resources, and provider canonical channel bindings are absent without aliases. The disproportionate installed-controller acceptance harness is retired in the preceding Graphite node; stable install/reentry tests and owner-scoped settlement remain. |
| Behavior proof | The lifecycle suite passed 35 files / 318 tests, including public selection, no-record adoption, same-ID refresh, config-only residue, omitted-member failure/retry, foreign same-ID preservation, multi-home isolation, and a live-read zero-mutation repeat. Focused CLI command/runtime proof passed with the `0/1/2` exit contract. |
| Static and structural | Lifecycle lint, typecheck, build, sync, and positive structural checks passed. CLI lint, typecheck, build, sync, and positive structural checks passed. Strict OpenSpec and `git diff --check` passed. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural/proportionality approved the public cutover with no remaining P1/P2. Optional P3 cleanup remains outside this authority checkpoint. |

## Historical T6C3 Minimal Boundary Frame (Superseded)

This section preserves the earlier pre-pivot checkpoint only as implementation
provenance. It was superseded by
[[#Legacy Export Retirement Implementation Proof]] and cannot authorize the
current controller topology. At that checkpoint, the proportionality audit
rederived a candidate boundary from two owner-local operations rather than from
the landed aggregate.

| Axis | Closed decision |
| --- | --- |
| Export ownership | One exports-owned exact two-field marker is a monotonic destination claim; payload/ledger undo preserves it. The existing destination ledger owns managed content; there is no root digest, registry, provider field, or second receipt. |
| Provider ownership | Native live state at an explicit existing home; any occupied/unreadable export-marker slot is a collision, and the provider does not parse the export codec. |
| Removed relationship | The checkpoint proposed deleting `KnownNativeHomesReader`, `completeNativeHomes`, target-identity scans, pathless aggregation, and app-runtime plumbing after both owner-local boundaries became active. Its then-current candidate still retained that transitional bridge. |
| Resource law | Export performs one point-addressed `Absent -> ExactExportOwned` claim before payload/capsule work. An absent destination becomes visible only as an exact already-marked root through one no-replace authority transition. The marker is absorbing and is never an inverse action. Provider resources never create homes and recheck marker-slot absence before native execution. |
| Decision gate | At this checkpoint, task 5.2 was blocked on selecting a narrowly scoped shared/native directory no-replace capability or a protected preclaim operation. The later pivot retired the export path instead, so this gate is closed without selecting either mechanism. |
| Proof boundary | Bounded absent/exact/wrong marker cases, competing-root preservation, marker persistence through payload undo, provider missing/marked/unmarked and recheck-transition cases, export-local destination overlap, no cross-owner reads, and read-only repeats. A selected native capability adds substrate conformance plus a bounded provider race trace; it does not claim scheduler-universal proof beyond that substrate. A preclaim proof boundary cannot be named until its fence is authorized. Alias/tamper matrices and adversarial recovery remain outside C6. |

## Historical T6C3 Provider Slot Refusal Proof (Superseded)

This historical implementation checkpoint activated only the provider-local half of
[[tasks#5. T6C3: Legacy Export And Aggregate Retirement]]. The landed aggregate remains
in place in that checkpoint. The later retirement proof removed the aggregate
and export path rather than activating export admission.

| Boundary | Result |
| --- | --- |
| Resource | Effect Platform checks only the fixed owner slot at explicit existing home acquisition and again inside the command mutex immediately before each command or Codex app-server spawn. Only `NotFound` admits; any entry, dangling symlink, or unreadable result returns typed `OwnershipConflict` with zero native calls. |
| Service | The CLI composition edge projects the typed Effect failure into one service-owned resource error. Capability and observation collisions become `BLOCKED_COLLISION`. A collision after a mutation bridge is invoked remains `uncertain` because a composite bridge may already have changed native state; the issue retains `BLOCKED_COLLISION` and the confirmed prefix stays exact. No marker codec, export ledger, registry, receipt, or provider installer entered the provider module. |
| Behavior | The native resource suite passes 16/16, the complete lifecycle suite passes 35 files / 325 tests, and the focused CLI Effect binding passes 7/7. Missing, removed-home, occupied, dangling-slot, injected unreadable, and command/app-server refusal cases stay cold at the native process edge. Pre-mutation collision blocks; bridge-invoked collision remains truthful uncertainty, including the post-mutation regression oracle. |
| Static | Resource, lifecycle, and CLI lint, typecheck, and build passed. Lifecycle and CLI sync plus enforced positive structural/Habitat suites passed; strict OpenSpec and `git diff --check` passed. |
| Reviews | Architecture/authority, behavior/testing, TypeScript/refactor/Effect, and structural quality approved with no remaining P1/P2 findings. |

## C5 Vendors Context-Direction Proof

This checkpoint advances the vendors-only portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It does not
close the cross-module tasks or activate the blocked export-root transition.

| Boundary | Result |
| --- | --- |
| Root context | The service declares the ready `contentWorkspace` and `clock` capabilities directly. The CLI constructs one content-workspace resource and passes that same capability into the lifecycle client; the service does not construct or select a provider. |
| Module and behavior | `vendors/module.ts` narrows those two root capabilities. Vendor procedure handlers own sequencing, while DTOs and pure policy remain under `model`; no `internal` bucket or module-to-service-base dependency was introduced. |
| Public surface | `VendorLifecycleRuntime`, `vendors/ports.ts`, and the `./ports/vendors` export are absent. A compile-time negative import keeps the retired package subpath unavailable. |
| Behavior proof | Vendor router and service-spine proof passed 21/21. CLI context and real content-workspace resource proof passed 5/5, including refusal, exact authoring, restoration, cleanup, and mutation-free repeat behavior. |
| Static and structural | Lifecycle and CLI lint/typecheck passed without cache; lifecycle build and sync passed. The dependency-direction fixture, full lifecycle structural suite, and CLI structural suite passed. Lifecycle structure ran against an exact staged-tree worktree snapshot; the user-owned untracked note was neither staged nor altered. Strict OpenSpec and `git diff --check` passed. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural quality approved the vendors slice with no remaining P1/P2. The optional receiver-dependent clock fixture remains non-blocking P3 hardening. |

## C5 Releases Context-Direction Proof

This checkpoint advances only the releases portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. The remaining
modules and the temporary releases binding facade keep the cross-module tasks
open. Export task 5.2 remains blocked at its recorded publication-capability
decision and is unchanged by this node.

| Boundary | Result |
| --- | --- |
| Root context | The service root declares ready content snapshots, staged observation, artifact storage, optional evidence, one atomic optional retention capability, and failpoints directly. `ReleaseLifecycleRuntime` and its nested retention/control bags are absent. |
| Domain ownership | Artifact-repository and raw content-workspace observation types sit with their root dependency contracts. Release requests, results, issues, staged policy/snapshot/classification, and other domain policy remain under `modules/releases/model`; only the build failpoint capability/event crosses into the root dependency contract. |
| Module and behavior | `releases/module.ts` narrows ready capabilities into local context. Build, check, repository-check, and retention procedure handlers preserve their existing sequencing and result unions. Partial retention wiring is unrepresentable and has a compile-time negative proof. |
| Public transition | `modules/releases/ports.ts` and `./ports/releases` are absent, with a negative package-surface import. The existing `./bindings/releases` facade remains only as an optional transition allowance for the immediately following host-materialization node; positive topology no longer requires it. No 2A task is marked complete here. |
| Behavior proof | The full lifecycle service passed 35 files / 325 tests. The production-context proof passed 3/3. The three Git-backed release files passed serialized 37/37; a full parallel CLI run passed 340/346, and all six load-sensitive Git observation failures from that run passed in the serialized rerun without a product-code change. |
| Static and structural | Lifecycle and CLI lint, typecheck, build, and sync passed without cache. The dependency-direction regression and staged Grit gate passed. Lifecycle and CLI structural suites passed against an exact staged-tree worktree snapshot that excluded the user-owned untracked note. `git diff --check` passed. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural quality approved the corrected slice with no remaining P1/P2. The review loop caught and closed partial-retention representability plus staged-domain DTO ownership before checkpointing. |

## C5 Release Source Repository Ownership Correction

The first host-materialization proposal would have moved the release source
repositories wholesale into the CLI. Standing architecture review rejected
that as a domain-authority inversion: the CLI selects the content-workspace
provider, while lifecycle eligibility and staged-observation translation remain
owned by the release module. This checkpoint corrects both placement and
construction authority without claiming that
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]] are complete.

| Boundary | Result |
| --- | --- |
| Service ownership | Clean Git eligibility, payload materialization, and staged observation live under `modules/releases/repository`. Release provider middleware derives both repository views from the one ready root `contentWorkspace` capability, then procedure context narrows those module-owned views for the handlers. |
| Transition boundary | Root context and CLI composition expose no preadapted clean or staged source. The CLI selects only the raw content-workspace provider. The temporary `./bindings/releases` facade retains artifact and mechanical-evidence projections only; compile-time negative imports keep both release-source factories absent. No release-source implementation or factory is copied into the CLI. |
| Test ownership | The exact Git-eligibility integration suite and its generated repository fixture are lifecycle-service test assets. CLI tests consume only the generated content input and the public service client; no CLI test imports a module-private repository implementation. |
| Positive topology | Closed Habitat scopes require exactly the two release-source repository files and narrow the transitional release-binding directory to artifact and mechanical-evidence projections. No `internal` directory, compatibility alias, second client, or provider implementation entered the service. |
| Proof | The lifecycle suite passed 36 files / 337 tests, including the owner-local exact Git suite at 13/13. The full CLI suite passed 51 files / 333 tests; focused build/store and retention passed 17/17 and 7/7, and production context passed 3/3. Lifecycle and CLI lint, typecheck, and build passed without cache; CLI structural, strict OpenSpec, and `git diff --check` passed. Lifecycle structural passed twice against the staged implementation tree while excluding the user-owned untracked note; both temporary worktrees and their bounded Nx residue were removed through guarded, nonrecursive cleanup. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing, and structural quality report no remaining P1/P2. The loop caught and closed the temporary CLI-to-private-repository test dependency by moving exact Git eligibility and its generated content fixture to lifecycle-service test ownership. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]] remains blocked at its recorded publication-capability choice and is untouched. |

## C5 Packaging Context-Direction Proof

This checkpoint advances only the packaging portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It removes the
preadapted packaging aggregate without changing package behavior or entering
the blocked export publication decision.

| Boundary | Result |
| --- | --- |
| Root context | The service root declares the ready raw package-output resource and the existing artifact store. The packaging module projects only the artifact read capability, so release publication is structurally unavailable in packaging context. No `PackagingLifecycleRuntime` bag or replacement alias exists. |
| Module and behavior | The packaging procedure handler owns artifact verification, deterministic Cowork request construction, native resource invocation, and translation into the closed packaging result union. Pure archive ordering, bounds, and digest helpers remain under the packaging model. |
| Provider selection | The qualified CLI composition root selects the existing Effect Platform Node package-output provider and passes its raw async port. The service imports no concrete provider, and the CLI contains no lifecycle packaging adapter or factory. |
| Public surface | `bindings/packaging`, `modules/packaging/ports.ts`, and the `./bindings/packaging` and `./ports/packaging` package subpaths are absent without aliases. Compile-time negative imports preserve both removals. |
| Behavior proof | The full lifecycle suite passed 36 files / 340 tests and the full CLI suite passed. Focused packaging, resource-adapter, and service-spine proof passed 32/32; focused CLI production-context proof passed 4/4. Missing, mismatched, wrong-ref, bounded-render, pre-mutation refusal, post-commit uncertainty, cleanup failure, unsettled output, native failpoint, deterministic output, and mutation-free repeat behavior remain covered. |
| Structural proof | The closed Habitat topology removes packaging from the binding inventory, seals its exact module/model shape, and grows the root-no-upward-import set monotonically to packaging, releases, and vendors. Lifecycle and CLI lint, typecheck, build, sync, and structural suites passed without cache; the dependency-direction regression, strict OpenSpec, and `git diff --check` passed. The user-owned untracked note was held outside the closed topology only for the lifecycle structural run, restored byte-identically, and never staged. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC/Effect, behavior/testing/state-machine, and structural/Habitat standing reviews report no remaining P1/P2. The review loop added explicit resource-to-domain failure translation, cleanup-disposition, encoder-refusal, and identity-presence proof before landing. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]] remains blocked at the no-unmarked-publication-window capability choice. This checkpoint changes no destination claim, marker, publication substrate, provider home, native command, or app/runtime composition. |

## C5 Governance Context-Direction Proof

This checkpoint advances only the governance portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It seals the
current-main selector behind module-owned Git observation without changing
provider convergence or entering the blocked export publication decision.

| Boundary | Result |
| --- | --- |
| Root and module context | The service root exposes the existing raw `contentWorkspace` capability. Governance provider middleware derives the exact Git repository view, and `governance/module.ts` narrows it to direct `context.git` for the procedure handler. No `GovernanceLifecycleRuntime` bag or root-owned release-domain DTO exists. |
| Domain ownership | Exact Git identity, race, size, blob, and ancestry translation lives under `modules/governance/repository`; governance requests, results, issues, policy, and repository protocols remain under the module model. The selector still has one implementation in `resolveCurrentMainSelection`. |
| Public transition | `modules/governance/ports.ts`, `./ports/governance`, the public exact-Git factory, the CLI governance runtime, and the redundant CLI current-main wrapper are absent. The generic provider resolver interface/factory is also absent, so no caller can synthesize current-main selection. At this checkpoint one exact transitional `./bindings/governance` factory remained; [[#C5 Current-Main Service Composition Proof|the later service-composition checkpoint]] retires it without an alias. |
| Behavior proof | The full lifecycle service passed 37 files / 341 tests and the full CLI suite passed. Focused governance and CLI projection proof passed 26/26 and 4/4. The owner-local real-Git integration preserves remote identity and forged-unreachable selection behavior. One first cross-project saturated run produced a generated-Git fixture failure; the exact file and the complete lifecycle suite passed unchanged when rerun without competing CLI load. |
| Static and structural | Lifecycle and CLI lint, typecheck, and build passed without cache. Lifecycle and CLI sync/structural checks, the positive closed Habitat topology, the dependency-direction rejection fixture, strict OpenSpec, and `git diff --check` passed. The sealed root-no-upward-import axis now includes governance, packaging, releases, and vendors. The user-owned untracked note was held outside the closed topology only during lifecycle structural proof, restored byte-identically, and never staged. |
| Reviews | Architecture/authority review caught and closed a caller-forgeable generic provider resolver plus an underconstrained transitional binding directory. TypeScript/refactor/oRPC review closed one test-only assertion. Behavior/testing/state-machine review added one public real-Git `CURRENT_ELIGIBLE` trace through the new context path. Structural/Habitat review changed the exact transitional governance facade from required to optionally admitted, so the next deletion only narrows the topology. Final rereviews report no remaining P1/P2. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]] remains blocked and untouched. Provider execution, native commands, destination claims, app/runtime composition, and repository relationships do not change in this node. |

## C5 Provider Repository Ownership Proof

This checkpoint advances only provider implementation and protocol placement
under [[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It does
not change service context, procedure behavior, CLI composition, native
commands, or the blocked export publication decision.

| Boundary | Result |
| --- | --- |
| Domain ownership | Fifteen provider repository implementations now live under `modules/providers/repository`; eight provider-facing protocols live under `modules/providers/model/repositories`, and native resource failure classification lives under `modules/providers/model/errors`. Provider requests, policy, projections, storage semantics, and native-result translation therefore have one module owner rather than an implementation home under the public binding directory. |
| Transitional surface | `bindings/providers/index.ts`, its existing type-only `resource-port.ts` host contract, and `modules/providers/ports.ts` remain exact forwarding surfaces for current callers. They contain no second implementation and preserve the existing package surface until the provider resource/context and public-surface nodes can replace the native session source with a dependency-owned artifact-tree location and delete them atomically. The temporary governance bridge now imports the provider protocol from its module owner without copying selection behavior. |
| Behavior boundary | `base.ts`, provider module construction, router sequencing, CLI composition, resource packages, package exports, and every native-provider transition are unchanged. Provider service tests now import concrete repositories and protocols from their owner paths while public-facade callers remain on the transition surface. |
| Positive topology | Closed Habitat scopes positively require the provider repository/protocol directories, their exact file inventories, and exactly the two transitional provider binding files. The provider shell remains closed around the desired module shape plus the explicit temporary `ports.ts` facade, while the retired leaf `ports/` directory cannot reappear; no `internal` directory, open blacklist, compatibility copy, or app/runtime composition entered the tree. Release requests/results/issues remain under `modules/releases/model/dto`; only `BuildFailpoint` and its event contract remain at the root dependency boundary. |
| Proof | The full lifecycle service passed 37 files / 341 tests and the full CLI suite passed 50 files / 331 tests. Lifecycle and CLI lint, typecheck, build, sync, and structural suites passed without cache; the dependency-direction rule, positive Habitat topology, CLI command-channel topology, and `git diff --check` passed. The user-owned untracked note was held outside the closed topology only during structural proof, restored byte-identically, and never staged. |
| Reviews | Architecture/authority review removed a root-to-module dependency inversion by retaining the existing native resource contract as an exact type-only transition and moving its runtime failure identity under provider model errors. TypeScript/refactor/oRPC/Effect rereview verified no runtime cycle, duplicate protocol, or public signature drift. Structural/Habitat review made both transition surfaces optional-but-exact, removed the obsolete leaf-port scope, and confirmed the next deletion narrows the admitted tree. Behavior/testing/state-machine rereview found no new transition case warranted for this placement-only node. All four final reviews report no P1/P2/P3. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]] remains blocked and untouched. The narrow `providerState -> exports.knownNativeHomesReader` bridge remains explicitly owned by task 5.3 and is not duplicated or removed early. |

## C5 Artifact-Tree Location Port Proof

This checkpoint adds only the mechanical async-port projection needed by the
next provider resource-binding node under
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. The Effect
resource already owned bounded tree admission and opaque location; this node
does not add filesystem logic, provider semantics, or a publication mechanism.

| Boundary | Result |
| --- | --- |
| Resource contract | `ArtifactRepositoryAsyncPort.locateTree` projects the existing `ArtifactRepositoryResource.locateTree` request and `ArtifactTreeLocationObservation` without changing the opaque location type, read bounds, failure channel, or artifact repository ownership. |
| Provider adapter | `makeNodeArtifactRepositoryAsyncPort` forwards to the existing Effect resource through the same `runOrThrow` boundary used by the other async methods. It neither resolves provider identities nor maps lifecycle projection semantics. |
| Behavior proof | The Effect Platform Node provider passed 20/20 tests, including admitted-location parity, stable tree/payload metadata across repeat inspection, and missing-tree observation without repository creation. The lifecycle resource-adapter suite passed 13/13 with its deliberately unavailable test-double location capability. |
| Static proof | Resource contract, Effect provider, and lifecycle service lint, typecheck, and build passed. `git diff --check` passed. No CLI, lifecycle context, native command, export destination, or app/runtime file changed. |
| Reviews | Architecture/authority confirmed the existing resource remains the sole bounded-admission owner and the port adds no provider or publication semantics. TypeScript/refactor/Effect confirmed exact request/result forwarding, the established `runOrThrow` boundary, and the intentional required-method compile-time ratchet. Behavior/testing accepted present/missing, opaque-location parity, metadata preservation, and fail-fast unsupported-double coverage as proportionate proof. Structural quality found no generated output, topology addition, filesystem duplication, or extra abstraction. All four reviews report no P1/P2/P3. |
| Scope | This is a required method on one existing generic resource port, not a generalized publication framework, new state owner, or provider installer. [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|Export task 5.2]] remains blocked and untouched. |

## C5 Neutral Current-Main Dependency Boundary Proof

This checkpoint removes the provider module's type dependency on governance as
a prerequisite to the raw provider-resource node under
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It changes no
selection, artifact, native-provider, export, or app/runtime behavior.

| Boundary | Result |
| --- | --- |
| Neutral contract | The service root owns only an unbranded explicit selector locator, the post-validation current-main observation/result types, and `CurrentMainSelectionReader`. Current-main body/envelope DTOs, TypeBox schemas, codec constants, Git translation, and selection policy remain governance-owned. Provider requests adapt their provider-domain locator to the neutral selector locator at the procedure boundary. |
| Schema authority | Bidirectional compile-time assertions keep both neutral observation types assignable exactly with the governance TypeBox schema statics. The failure result remains a fully distributed discriminated union. The provider module imports no governance DTO, repository, router, or facade. |
| Transitional composition | At this checkpoint the qualified `bindings/governance` factory still composed the raw content-workspace resource with governance's sole selector. [[#C5 Current-Main Service Composition Proof|The later service-composition checkpoint]] removes that caller-owned semantic dependency and the public subpath together. |
| Positive topology | Closed Habitat scopes require the two exact neutral root files and remove the retired provider-local current-main protocol. The enforced dependency-direction rule rejects provider-to-governance imports, re-exports, star exports, and dynamic imports while leaving the still-explicit `base.ts -> ProviderLifecycleRuntime` transition for its own atomic node. |
| Behavior proof | The focused governance/provider suite passed 5 files / 70 tests, including exact provider-locator adaptation. The complete lifecycle suite passed 37 files / 342 tests; the complete CLI target passed. Lifecycle and CLI lint, typecheck, and build passed without cache, and the transitional CLI selector fixture passed 1/1 on the neutral locator contract. The guarded three-rule Habitat gate, strict OpenSpec, and `git diff --check` passed. |
| Reviews | Architecture/authority review caught and closed a repository-to-router inversion plus schema-union drift. Behavior/testing added strict discriminator/branch/schema parity and found the stale CLI locator fixture. Structural/Habitat closed the public governance-binding bypass and aligned rule metadata. TypeScript/refactor/oRPC and all three final rereviews report no remaining P1/P2/P3. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|Export task 5.2]] remains blocked and untouched. The task-5.3 known-home bridge, native commands, provider homes, personal repository, protected lanes, and operational state are unchanged. |

## C5 Native Provider Resource Location Proof

This checkpoint replaces the caller-supplied provider session aggregate with
one raw native resource plus service-owned semantic location resolution under
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It does not yet
change `service/base.ts`, provider module context, or the remaining public
facades, so the cross-module tasks stay open.

| Boundary | Result |
| --- | --- |
| Root dependency | The service root owns the raw Codex/Claude session contract. Native marketplace installation accepts only the dependency-owned opaque `ArtifactTreeLocation`; a raw session cannot receive a repository path, projection digest, or provider marketplace source and therefore cannot select or reconstruct an artifact. |
| Service ownership | The provider module maps its semantic `ProviderMarketplaceSource` to the exact artifact-tree address, asks the existing artifact repository port for the provider-issued opaque location, and resolves it immediately before native add/remove sequencing. Publication and lookup share one provider-owned address law rather than parallel string construction. |
| CLI composition | The CLI selects one Effect Platform native-provider resource and one artifact-repository port, then supplies raw sessions plus the service-owned location resolver. Its binding only lowers Effect sessions to the raw Promise contract; it contains no lifecycle location policy, path synthesis, native-state planner, or installer replacement. |
| Failure and ordering | Missing, mismatched, foreign, and failed location observations are typed pre-mutation refusals and report `not-applied`; no native call runs. Codex resolves before add. Claude resolves before remove as well as add, so a stale same-ID release is never retired unless its replacement tree is already admitted. Other failures after a native bridge remains invoked retain truthful `uncertain` disposition. |
| Behavior proof | The real Effect Platform artifact provider supplies the opaque location in the service-owned address-law test. Nine focused service cases prove literal address selection, location/result failures, Codex and Claude ordering, and zero mutation on refusal; four focused CLI cases prove provider selection, typed resource failure, and exact opaque-location forwarding. The complete lifecycle suite passed 38 files / 351 tests, and the complete CLI suite passed 50 files / 328 tests. |
| Static and structural | Lifecycle and CLI lint, typecheck, and build passed without cache. Both project sync/structural suites, all three enforced positive Habitat/dependency rules, strict OpenSpec, and `git diff --check` passed. The user-owned untracked note was held outside the closed topology only during structural proof, restored byte-identically, and never staged. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|Export task 5.2]] remains blocked and untouched. No publication capability, destination claim, app/runtime composition, personal-repository path, protected-lane release, or global provider mutation entered this node. |

## C5 Provider Raw Context Proof

This checkpoint completes the provider-only raw-context portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. The service
still retains other transitional binding surfaces, and task 5.3 still owns the
temporary complete-identity read, so no cross-module task is marked complete.

| Boundary | Result |
| --- | --- |
| Root and service ownership | At this checkpoint the root still received the neutral current-main reader alongside raw provider-record and artifact ports, raw native resource, executable selection, projection root, and generic evidence store. [[#C5 Current-Main Service Composition Proof|The later service-composition checkpoint]] replaces that one caller-supplied reader with raw `contentWorkspace` derivation under `provided`. Provider middleware derives release, native, projection, target-record, and evidence semantics, then `module.ts` narrows those capabilities for procedure handlers. The exact raw-resource tuple memoizes one service-owned record state so process-local retained transaction authority survives separate oRPC invocations. |
| CLI composition | The CLI selects the existing Effect Platform Node resource providers once and passes their raw ports. It no longer constructs provider adapters, target readers/mutators, projection materializers, evidence publishers, or the semantic provider runtime. The artifact repository instance is shared by the provider record state and service dependency. |
| Public transition | At this checkpoint, `ProviderLifecycleRuntime`, `modules/providers/ports.ts`, `./ports/providers`, and the CLI provider-runtime/artifact/evidence adapters were absent. Raw native session/resource contracts and typed failures came directly from `@rawr/resource-native-agent-provider`; `./bindings/providers` still exposed the temporary task-5.3 complete-identity reader, and `completeNativeHomes` still existed pending the later retirement. |
| Behavior proof | Public oRPC probes cover complete and targeted test artifact refusal, canonical dirty-main refusal, and complete-home observation with exact envelopes and unrelated raw ports cold. The real provider-record resource publishes projection, marketplace, identity, and receipt state across reopen. A real failure-path probe proves retained capture authority survives middleware reconstruction and a later invocation succeeds. The serialized final lifecycle suite passed 40 files / 356 tests and the serialized final CLI suite passed 49 files / 325 tests; the final provider-context subset also passed 3 files / 12 tests. Earlier parallel attempts produced only generated-fixture contention, and each affected file passed immediately in isolation before the complete serialized proofs. |
| Structural proof | Closed topology removes the retired provider port and CLI adapter files, positively closes both provider binding and projection roots, and admits package provider bindings only at the provider composition root. Native contracts flow directly from the resource owner. The dependency-direction fixture rejects root-to-binding aliases, consumer spread, and local index/native bypasses without turning individual export names into a second structural authority. Lifecycle and CLI lint, typecheck, build, sync, and guarded structural suites passed; strict OpenSpec and `git diff --check` passed. The protected untracked note was restored byte-identically and never staged. |
| Reviews | Behavior/testing restored public procedure and real resource-reopen proof. Architecture narrowed the export bridge and provider binding. TypeScript/oRPC/Effect caught and closed per-invocation loss of retained transaction authority. Structural/Habitat closed sealed-module and local-binding alias bypasses and repaired the positive fixture. Final rereviews report no remaining P1/P2/P3. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]] remains blocked and untouched. This node adds no destination publication capability, app/runtime composition, provider installer, personal-repository relationship, protected-lane release, or live provider mutation. |

## C5 Current-Main Service Composition Proof

This checkpoint advances the current-main portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It removes the
last caller-built governance selector while preserving one governance-owned
selection implementation and the existing canonical provider behavior.

| Boundary | Result |
| --- | --- |
| Service context | Initial context receives only raw `contentWorkspace`. One closed service middleware derives the neutral `CurrentMainSelectionReader` under `context.provided`; provider module composition narrows that capability for its procedure handlers. The reader is stateless and each canonical invocation re-inspects live Git state. |
| Governance ownership | The exact selector remains in the governance router layer. The oRPC procedure handler and service composition both call that one implementation; providers import only the neutral root observation contract. The cycle-free executor imports neither `module` nor `impl`. |
| CLI and package surface | The CLI no longer constructs or carries `providerCurrentMain`. `./bindings/governance`, its two implementation files, and the bridge-only CLI test are absent without an alias. Compile-time proof rejects the whole retired subpath and proves `providerCurrentMain` is not a key of service `Deps`. |
| Behavior proof | The full lifecycle suite passed 40 files / 356 tests and the full CLI suite passed 47 files / 321 tests. One local oRPC spine proves canonical sync and status each reach the raw content-workspace Git port with the exact locator, map dirty selection to `BLOCKED_SELECTION`, keep artifact/native resources cold, and repeat the live inspection rather than memoizing it. Existing current-main success/race cases and canonical native convergence cases remain green. |
| Static and structural proof | Lifecycle and CLI lint, typecheck, and build passed without cache. The dependency-direction fixture passed its exact 57-diagnostic rejection set. The guarded three-rule Habitat gate passed with closed positive topology; the user-owned note was restored byte-identically at SHA-256 `d06966389dac095f8a7f620aa4b27a50935a75762300000f987a848e45c2aadb`, remained unstaged, and left no holding root. Strict OpenSpec validation and `git diff --check` passed. |
| Reviews | Architecture/authority, behavior/testing/state-machine, TypeScript/refactor/oRPC, and structural/Habitat final reviews report no P0-P3 findings. The review loop confirmed one selector owner, a cycle-free composition edge, repeat live observation, exact retired-subpath unreachability, and no repository/native/export scope expansion. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]] remains blocked at the explicit publication-capability choice and untouched. No provider command, destination claim, native mutation, app/runtime composition, personal-repository relationship, or protected-lane release enters this node. |

## C5 Release Host-Binding Narrowing Proof

Code checkpoint `4f53586522d21405a6eaf92b532c2843a9626f84` advances
[[tasks#2A. C5 Context-Direction Correction|task 2A.3]] without claiming the
remaining facade deletion. It makes the transitional release binding an exact
host-materialization surface while preserving the pure release owner described
in [[design#Service context flows from root dependencies into module handlers|the service-context decision]].

| Boundary | Result |
| --- | --- |
| Release authority | `./release` is the only public owner of provider-neutral release values and types. Command parsing and retention proof import that algebra directly; `./bindings/releases` exposes exactly the four artifact/evidence materializers plus their two option types, with no DTO, policy, codec, parser, ref constructor, or domain barrel. |
| Host composition | The sole production value consumer of the transitional binding is the artifact/evidence composition root. No adapter moved into the CLI, no new wrapper or resource was added, and the existing service-owned artifact/evidence semantics remain unchanged pending the later raw-context checkpoint. |
| Monotonic ratchet | Compile proof closes the binding's runtime key set exactly to the four materializers, positively retains both option types, and negatively rejects representative shared-release and module-domain types. The enforced dependency rule admits only `commands/input.ts -> ./release` and the exact composition root `-> ./bindings/releases`; direct, dynamic, named re-export, and star re-export bypass fixtures produce the exact 61-diagnostic set. Positive topology remains closed with an empty baseline. |
| Behavior and static proof | The complete lifecycle suite passed 40 files / 356 tests and the complete serialized CLI suite passed 47 files / 321 tests. Lifecycle and CLI lint, typecheck, build, sync, and guarded structural suites passed without cache. Strict OpenSpec validation and `git diff --check` passed. The protected note was restored byte-identically at SHA-256 `d06966389dac095f8a7f620aa4b27a50935a75762300000f987a848e45c2aadb`, remained unstaged, and left no holding root. |
| Reviews | Architecture/authority and structural/Habitat reviews were clean. Behavior/testing and TypeScript/refactor found the initial single-symbol value canary and missing type-barrel proof; the final exact value-key assertion, positive option-type probes, and negative shared/domain type probes closed both P2 findings. Final rereviews report no remaining P1/P2. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]], task 5.3's known-home bridge, native provider behavior, personal repository state, app/runtime composition, and every protected-lane candidate remain untouched. The release facade remains explicitly transitional and is not promoted into a permanent owner. |

## C5 Artifact And Evidence Service Composition Proof

Code checkpoint `0dbd68a44ce02a059991f71ae55edaba80847c68`
supersedes the caller-context portion of
[[#C5 Release Host-Binding Narrowing Proof|the release host-binding checkpoint]]
without claiming the remaining facade deletion in
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]]. It follows
[[design#Service context flows from root dependencies into module handlers|the
accepted context direction]] and the thin native boundary in
[[authority-amendment#Corrected Frame]].

| Boundary | Result |
| --- | --- |
| Root authority | Initial context receives one raw `ArtifactRepositoryAsyncPort` and one explicit `artifactRepositoryRoot`. The four caller semantic keys `releaseArtifacts`, `releaseEvidence`, `providerArtifactRepository`, and `providerEvidenceStore` are absent by compile-time and runtime proof. The controller composition root selects the existing Effect Platform Node resource once; provider-record state no longer selects or carries generic artifact authority. |
| Service composition | One root oRPC provider derives `artifactStore` and `mechanicalEvidenceStore` under `context.provided` from the same raw pair. Their implementations live in the closed private `service/repository` root. Releases receive publication plus read authority, packaging receives only `read`, and provider middleware derives its verified-release and evidence-publisher projections while using the raw repository only for its separate projection-record address space. The now-mandatory evidence capability removes the old unreachable optional branch. |
| Transitional surface | `./bindings/releases` remains explicit deletion debt for the next slice. Its sole admitted CLI value consumer is now the exact reader-only export composition root; CLI-local artifact/evidence writers are absent and a same-path mutation fixture is rejected. Export still receives that caller-built reader, so this checkpoint does not claim universal unique construction or enter [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|export task 5.2]]. |
| Behavior proof | The complete lifecycle suite passed 40 files / 354 tests and the complete serialized CLI suite passed 47 files / 321 tests. Final focused reruns passed the four-case service spine and 11 CLI artifact-context cases. The new full-client provider vertical reads one complete set and its two releases through the shared raw root, publishes mechanical evidence at that same root, repeats with identical output, and performs no second evidence publication. Repository-check and malformed-input paths keep every raw method cold. |
| Static and structural proof | Lifecycle and CLI lint, typecheck, build, and sync passed without cache. The final guarded lifecycle structural suite passed all three enforced rules: closed positive service topology, dependency direction, and qualified command topology. The dependency rule now rejects service-to-binding imports and admits only the exact reader-shaped CLI transition. Strict OpenSpec validation and `git diff --check` passed. The protected note remained unstaged and byte-identical at SHA-256 `d06966389dac095f8a7f620aa4b27a50935a75762300000f987a848e45c2aadb`; no holding root remains. |
| Reviews | Architecture/authority and TypeScript/refactor/oRPC reviews were clean. Behavior/testing found the missing full-client evidence path; structural/Habitat found the mutation-capable CLI exception. Both P2 findings were fixed and independently rereviewed. Final reviews report no remaining P1/P2. |
| Scope | No native provider command, personal-repository relationship, app/runtime composition, export publication mechanism, live home, or protected-lane candidate was opened. HF01 remains excluded. Tasks 2A.1-2A.4 stay open until the remaining public binding/port surface is actually absent. |

## Historical C5 Export Artifact Service Composition Proof (Superseded)

Code checkpoint `b902a668386879bc6ed8c4d95395ffd81074a1cb`
removes the transitional caller-owned artifact projection described in
[[#C5 Artifact And Evidence Service Composition Proof]] without claiming
completion of [[tasks#2A. C5 Context-Direction Correction|tasks 2A.1-2A.4]].
It follows the root-to-module flow in
[[design#Service context flows from root dependencies into module handlers]]
and the proportional boundary in [[authority-amendment#Corrected Frame]].

| Boundary | Result |
| --- | --- |
| Service authority | At this checkpoint, the CLI selected one raw artifact repository and root at the sole lifecycle-client composition root. Root oRPC middleware derived one `artifactStore`; export `module.ts` selected a frozen `{read}` view for its router handler. The later retirement deleted that export module and handler. |
| Retired surface | At this checkpoint, `./bindings/releases`, its implementation files, and the CLI `bindings/output` projection were absent, while public `./ports/exports` and `./bindings/exports` still remained as transition debt. The later retirement deleted those surfaces without an alias, dynamic route, or re-export. |
| Behavior proof | The complete lifecycle suite passed 41 files / 361 tests and the complete CLI suite passed 46 files / 320 tests. The final focused export suite passed 2 files / 17 tests, and the affected CLI context/binding slice passed 2 files / 5 tests. Missing, malformed, and throwing artifact reads refuse before destination capture and before undo preflight or admission. A settled repeat re-reads live artifacts; after immutable-member corruption it refuses with destination bytes, inode/time identities, and every undo authority counter unchanged. |
| Structural proof | Positive Habitat topology removes the retired binding/output roots and keeps export model matter closed to its declared `dto`, `helpers`, and `policy` axes. The dependency rule rejects router access to root `deps` or `provided` context and rejects artifact-provider imports anywhere under `apps/cli/src` except the exact client composition root; its fixture passed all 68 expected diagnostics. Lifecycle and CLI lint, typecheck, build, sync, and guarded structural suites passed without cache. |
| Reviews | Architecture/authority, TypeScript/refactor/oRPC, behavior/testing/state-machine, and structural code quality each closed their findings and report no remaining P0-P3. The loop removed a provider re-bag, closed runtime/type capability leakage, preserved method receiver binding, widened provider uniqueness to the whole CLI source root, and added live-result plus undo-preflight refusal proof. |
| Scope | At this historical checkpoint, export task 5.2 remained blocked and `./bindings/exports`, `./ports/exports`, and `service/base.ts -> modules/exports/ports.ts` remained later transition debt. [[#Legacy Export Retirement Implementation Proof]] supersedes that state by deleting the export topology. Personal content, app/runtime composition, live homes, and all protected-lane inputs remained outside the slice. |

## C5 Native Provider Host Contract Closure Proof

This prepared checkpoint advances the provider host portion of
[[tasks#2A. C5 Context-Direction Correction|tasks 2A.2-2A.3]] without
claiming deletion of task 5.3's temporary complete-identity bridge.

| Boundary | Result |
| --- | --- |
| Resource authority | `@rawr/resource-native-agent-provider` owns the closed TypeBox failure schema, derives the public failure type with `Static`, and validates the complete value at the host boundary. The CLI selects the existing Effect providers and lowers their Effect failure channel to Promise rejection without translating lifecycle meaning. The provider module alone maps a complete matching-provider failure into lifecycle issues. |
| State semantics | A service-owned marketplace-location refusal is one dedicated `NativeProviderPreMutationRefusal` and returns `not-applied` before a native call. Once the native bridge is entered, provider failures retain the existing `uncertain` disposition. Malformed tags, providers, operations, reasons, details, and paths cannot be reclassified as ownership collisions. |
| Transitional facade | `./bindings/providers` currently exposes the task-5.3 complete-identity reader and constructor. Its only production value consumer is the provider composition root, and a public TypeScript surface check owns that qualified contract. Native sessions, failures, and executable selection come directly from their resource owner rather than through this facade. |
| Positive ratchet | The dependency rule advances one monotonic axis: package provider bindings may enter production CLI code only at the provider composition root. Its accepted/rejected fixture closes consumer spread, root-to-binding aliases, and local index/native bypasses without enumerating individual export keys. |
| Proof | The native-provider resource passed 23 tests, the integrated lifecycle suite passed 42 files / 381 tests, and the serialized CLI suite passed 47 files / 325 tests. Resource, lifecycle, and CLI lint, typecheck, and build passed without cache. Lifecycle and CLI sync/structural suites, the three-test Habitat consumer fixture, strict OpenSpec, and `git diff --check` passed. |
| Reviews | Final architecture/oRPC, behavior/testing/state-machine, TypeScript/refactor, and structural/Habitat rereviews report no remaining finding. The loop collapsed the dead failure taxonomy, linked decoding to the resource owner, replaced caller inference with the named `Deps` boundary, and removed an exact-symbol Grit allowlist. |
| Scope | [[tasks#5. T6C3: Legacy Export And Aggregate Retirement|Export task 5.2]] remains blocked and untouched. No destination publication, app/runtime composition, Personal coupling, live provider mutation, or protected-lane release enters this checkpoint. |

## C5 Canonical Service Boundary Proof

This prepared checkpoint advances
[[tasks#2A. C5 Context-Direction Correction|task 2A.4]] without marking it
complete while the explicit export/provider transition surfaces remain.

| Boundary | Result |
| --- | --- |
| Canonical construction | The root `router.ts` remains the thin executable alias required by the canonical service shell. `createClient` passes that router to `defineServicePackage` and exposes named `Deps`, `Scope`, `Config`, and `CreateClientOptions` construction-boundary types; callers do not infer public imports through `Parameters<typeof createClient>`. |
| Public contract | `./service/contract` exposes the declarative `contract` and `Contract`; `./router` exposes only the composed router boundary. The redundant `./types` alias and service-module DTO paths are unreachable through package exports. Repositories, module internals, private schemas, middleware, and provider internals remain private. |
| Structural axis | The existing positive source-shell topology requires `client.ts`, `index.ts`, `router.ts`, and `service/`; this checkpoint removes only the redundant root `types.ts`. It adds no literal package-export map or new exception to the multi-axis dependency rule. Public-surface ratcheting proceeds by architectural class rather than duplicating each current manifest key. |
| Proof | The immediately preceding integrated behavior gate passed 42 lifecycle files / 381 tests and 47 CLI files / 325 tests. This package-only slice then passed lifecycle and CLI lint, typecheck, build, sync/structural, the three-test Habitat consumer fixture, strict OpenSpec, and `git diff --check`. CLI typecheck proves the named construction types and root router/qualified contract imports while rejecting the retired `./types` subpath. The complete required repository ratchet also passed all 29 admitted lint targets, all 42 admitted typecheck targets, Habitat provisioning/consumer proof, and all three locked lifecycle topology rules. |
| Reviews | Architecture/oRPC, behavior/testing, TypeScript/TypeBox, and structural/Habitat rereviews report no remaining finding. The correction restored the thin root router and named construction types, retained the qualified contract, and rejected a literal export-key ratchet. |
| Scope | The remaining export/provider transition subpaths are explicit later deletion debt, not permanent owners. This checkpoint changes no procedure behavior, native provider command, destination publication, app/runtime composition, Personal relationship, or protected-lane input. |

## CLI Harness Owner Correction

| Boundary | Result |
| --- | --- |
| Truthful owner | The parent-source `devops-command-surface` test is deleted. Its fixture rooted command discovery in `apps/cli` while asserting commands owned and emitted by the separately built `@rawr/plugin-devops` controller member. |
| Preserved behavior | A source-backed owner-local Oclif fixture retains projection metadata, topic discovery, strict JSON, default-plan/no-mutation behavior, and nonzero failure-stop sequencing. |
| Cleanup boundary | Recursive test cleanup admits only an immediate child of the canonical system temp root with the fixture-owned prefix. |
| Proof | `@rawr/plugin-devops` passes its owner-local tests with ignored build output absent, then passes lint, typecheck, build, and sync. Its declared lint and typecheck targets join the required pre-push/CI ratchet through Nx discovery. |

## Test Target Determinism

Together with the owner correction above, this checkpoint closes
[[tasks#6. T6D: Truthful Test Owners|T6D tasks 6.3-6.4]] against the current
thin stack. It changes test ownership and scheduling only.

| Boundary | Result |
| --- | --- |
| Positive owners | The named `cli` and lifecycle Vitest projects own `fileParallelism: false`; the `@rawr/cli` test script owns only process bootstrap through `TMPDIR=/tmp`. No ad hoc scheduling flag, wrapper, retry, or fallback remains. |
| Product boundary | The change affects only test scheduling and scratch-parent selection. It changes no lifecycle procedure, resource/provider, command, controller payload, repository identity, or app/runtime surface. |
| Ordinary proof | The owner-local DevOps suite passed 1 file / 4 tests with ignored build output absent. The ordinary `@rawr/cli:test` Nx target passed 48 files / 322 tests at its checkpoint. After two distinct real-Git fixtures flaked under lifecycle file concurrency and passed in isolation, two consecutive ordinary lifecycle Nx runs passed 41 files / 361 tests under owner serialization. |
| Static proof | DevOps lint, typecheck, build, and sync passed. CLI lint, test-inclusive typecheck, and build passed. Lifecycle lint and typecheck passed after its owner correction. Strict OpenSpec validation, `git diff --check`, and the complete required repository ratchet passed with the protected untracked note held outside the closed structural scan and restored byte-identically. |
| Reviews | Architecture/authority, behavior/testing, TypeScript/refactor, and structural/Habitat reviewers report no remaining P1/P2/P3. The loop added the missing DevOps lint target to the dynamic required ratchet and removed an unneeded `rootDirs` overlay before closure. |

## Repository Check Performance Stabilization

This bounded controller checkpoint supports
[[tasks#3C. Installed Distribution And Personal Prerequisite|task 3C.5]] without
changing the thin authority in [[authority-amendment#Corrected Frame]]. It
removes process and filesystem fan-out from the existing repository checks; it
does not cache repository truth, weaken revalidation, or add another lifecycle
owner.

| Boundary | Result |
| --- | --- |
| Root cause | One 1,561-file Personal release caused about 9,468 scalar Git subprocesses, followed by sequential per-file worktree reads. The full clean wrapper measured 326.57 seconds; after blob batching alone, the equivalent in-process inspect plus revalidate was still running at 135.36 seconds and was stopped. |
| Native mechanics | Declared Git blobs use one bounded, ordered `cat-file --batch`; staged materialization reuses the same helper. Worktree identities use metadata-only pre/post checks around one non-writing `hash-object --no-filters --stdin-paths` invocation. No provider installer, cache, session, daemon, or hidden repository state was added. |
| Bounds | Blob count, member bytes, aggregate bytes, output framing, worktree path count, per-file bytes, aggregate worktree bytes, and each Git evidence output remain independent positive bounds. Releases select exactly the 96 MiB release-input plus 64 MiB payload ceiling. Control characters are excluded from generic relative paths, making the native line protocol total. |
| Behavior | Exact object order, object type, missing/reordered/malformed/truncated/trailing output, file type, canonical path, device/inode/size continuity, opening/closing Git anchors, flags, status, and final eligibility binding remain fail-closed. Early tree-closure refusal proves the batch payload reader stays cold. |
| Measured proof | Against the same 11-member Personal worktree, final clean inspect plus revalidate completed in 6.174 seconds; the four native staged observations used by the two-pass staged check completed in 2.152 seconds. The work-count oracles assert one native batch rather than O(files) Git commands. |
| Scope | No Personal file, provider home, release/channel record, controller selector, app/runtime surface, or protected-lane input was mutated. The later Nx/Habitat ratchet composition remains a repository-tooling checkpoint, not part of this resource mechanic. |

## Standing Reviews

| Role | Pivot focus |
| --- | --- |
| TypeScript/refactor | one closed v2 record, exhaustive unions, no compatibility ladders |
| Architecture/authority | direct Git selection, native provider truth, no second owner |
| Behavior/testing | risk-proportional oracles, real native convergence, mutation-free repeat |
| Structural quality | deleted concepts stay deleted; no transfer/issuer/launcher residue |

T6A closed its record reviews with no remaining P1/P2. Later standing reviews
independently closed provider capsule retirement, native convergence, task
5.1's provider refusal, the deterministic manifest, each retained C5 context
checkpoint, and the final five-module TypeBox/diagnostic continuation at exact
tip `c199e5c1`. The source continuation is sealed with no remaining P0-P3.
Landing, immutable controller publication, Personal checkpointing, and native
settlement still require their own operational verification.

## Closure Oracle

```text
land personal content
  -> build one complete set in one durable controller root
  -> complete-test real Codex and Claude in disposable homes, preserving omissions
  -> review and land one current-main record
  -> canonically converge disposable homes and repeat read-only
  -> converge approved native homes
  -> repeat with identical managed inventory and every lifecycle-owned write
     plus native mutating-call counter at zero
```

Closure additionally requires Template and personal canonical `main` clean and
green, Graphite stacks/PRs/worktrees drained, one installed controller selected,
no mixed command path, and no lifecycle override.

## Related

- Corrected frame: [[authority-amendment]].
- Decisions: [[design]].
- Tasks: [[tasks]].
- Proposal: [[proposal]].
- Landed C5 topology:
  [[openspec/changes/archive/2026-07-18-retire-mixed-plugin-lifecycle/SERVICE_TOPOLOGY]].
