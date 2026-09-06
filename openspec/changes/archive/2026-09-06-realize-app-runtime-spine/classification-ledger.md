# Capability Classification Ledger

This ledger records the current disposition of source capabilities and their
destination acceptance. It is not a project-count target or an activation log.
[Tasks](tasks.md) own active delivery; [obligation disposition](obligation-disposition.md)
accounts for inherited task IDs; the [stack cut sheet](stack-cut-sheet.md)
protects held sources; [deferred capabilities](deferred-capabilities.md) preserve
D-1, D-2, D-3, and D-4 outside the qualified core runtime release.

The [intact predecessor ledger](../../../../docs/projects/habitat-runtime-realignment/quarantine/openspec-baseline/classification-ledger.md)
preserves the original source inventory, dated receipts, exact former paths, and
historical disposition evidence. Its project/file/edge totals and accumulating
authority-correction steps are not current platform law.

## Decision Rule

Behavior and invariants decide ownership:

- **Habitat** owns generic platform, runtime, authoring, repository, and
  agent-provider capability.
- **Rawr** owns downstream product domains. An accepted initial transfer does
  not establish that every later source change is duplicate.
- **Fixture** is indispensable owner-local proof without a production project,
  package, command, or app identity.
- **Retired** records an already dispositioned obsolete, duplicate, example,
  product-specific, or unreachable predecessor. This ledger is not new
  authorization to delete a branch, dirty worktree, or unclassified user work.
- **Dissolved** means named generic behavior moved to its actual owners and the
  mixed predecessor's readers and identity were retired. Absence alone is not
  evidence of behavioral preservation.
- **Held for classification** is the default for unclear ownership, uncertain
  duplication, occupied source roots, or work without an accepted destination.
  Ambiguity is not deletion authority.

`apps/habitat` is a composition destination, not another capability class.
Marketplace owns curated agent-plugin content and governed content records; no
recorded Habitat runtime project is routed there. Private implementation
organization follows cohesion and ownership rather than a frozen source census.

## Current Source And Destination Accounting

The current source baseline is Habitat `374149800a067e527342e334ff6a3022fbd38cd7`.
Names below identify actual owners or retained destination obligations, not a
promise that every future owner is already implemented. Native Nx discovery is
the current project inventory.

| Source or predecessor lineage | Current disposition / destination | Remaining acceptance |
|---|---|---|
| `@habitat-ai/cli`, `apps/habitat` | Retained sole public Oclif executable. Native plugin management is present; final app-selected loader, runtime, topics, and authoring verticals remain active work. | Installed CLI, runtime, generator, topic, telemetry, and release rows below. |
| `@habitat-ai/sdk`, formerly `packages/habitat-sdk` | Retained at `packages/core/sdk`, sole public SDK package. The old package path and mixed core project are retired. | Public/private closure, type proof, installed cold imports, accepted release. |
| `@habitat-ai/service`, `services/habitat` | Qualified as `@habitat-ai/catalog-service` at `services/catalog`. Authority resolution and checking survive. | Final Habitat self-host selection and installed command integration; owner qualification is not that proof. |
| `habitat`, `scripts/habitat` | Retained repository-policy tooling, not an app or public executable identity. | `habitat:check` and product-separation proof. |
| `workstream-plugin-pack`, `tools/workstream-plugin-pack` | Retained private tooling; selection law belongs in `.habitat/overlays/workstream-plugin-pack`. | Owner-local verification and Habitat policy. |
| `rawr-hq-template` root identity | Renamed to private `habitat-workspace`; native repository scheduling retained without colliding with `habitat`. | Structured root/package/Nx agreement, not an exact project-count ceiling. |
| `@habitat-ai/resource-source-inventory` and `provider-source-inventory-git-effect-platform-node` | Retained at `resources/source-inventory` and its nested Git provider. | Resource/provider conformance and catalog integration. |
| `@habitat-ai/resource-rule-evaluation` and `provider-rule-evaluation-grit-effect-platform-node` | Retained at `resources/rule-evaluation` and its nested Grit provider. | Native rule-evaluation conformance and catalog integration. |
| `@habitat-ai/rawr-agent-plugin-lifecycle` | Qualified as `@habitat-ai/agent-plugin-lifecycle-service` at the same `services/agent-plugin-lifecycle` root. | Real topic/profile/installed vertical, including telemetry, in task 12.1. |
| `@habitat-ai/rawr-resource-agent-plugin-package-output` | Qualified as `@habitat-ai/resource-agent-plugin-package-output`; `provider-agent-plugin-package-output-cowork-v1-effect-platform-node` retained. | App-selected package projection and destination artifact behavior. |
| `@habitat-ai/rawr-resource-content-workspace` | Qualified as `@habitat-ai/resource-content-workspace`; `provider-content-workspace-git-effect-platform-node` retained. | App-selected clean Git source/release behavior. |
| `@habitat-ai/rawr-resource-native-agent-provider` | Qualified as `@habitat-ai/resource-native-agent-provider`; `provider-native-agent-provider-claude-effect-platform-node` and `provider-native-agent-provider-codex-effect-platform-node` retained. | Disposable-home native provider behavior under the lifecycle vertical. |
| `@habitat-ai/rawr-resource-versioned-content` | Qualified as `@habitat-ai/resource-versioned-content`; `provider-versioned-content-git-effect-platform-node` retained. | App-selected vendor update and exact versioned-content behavior. |
| Mixed telemetry singleton / held native telemetry work | Qualified `@habitat-ai/resource-telemetry` and `provider-telemetry-opentelemetry-node` are present. Mixed singleton retirement is recorded. | Process, mounting, observation, Oclif, server, and async owners co-land their native behavior; task 15.1 audits receipts only. |
| `runtime-schema` | Retained private owner at `packages/core/runtime/schema`; native TypeBox Standard Schema projection reaches `@habitat-ai/sdk/service/schema`. | Native validation and ambiguous-path behavior, no second validator. |
| `runtime-definition`, `runtime-derivation`, `runtime-compiler`, `runtime-bootgraph` | Landed cold runtime owners under `packages/core/runtime`. Preserve useful source; tasks 0.1/0.2 repair accepted semantic gaps before live work resumes. | Current canonical cold contracts, not previous private-layout or hostile-object protocols. |
| Substrate, process runtime, observation, mounting, and harness owners | Retained final runtime destinations. Do not reserve empty projects or call cold-plan proof a complete application runtime. | Active tasks 7-15 and owner-specific lifecycle/host acceptance. |
| `@habitat-ai/rawr-dev`, `@habitat-ai/rawr-dev-node`, `@habitat-ai/rawr-plugin-devops` | Frozen and retired mixed predecessors. Fresh destination is `services/dev` / `@habitat-ai/dev-service` plus `plugins/cli/topics/dev` / `@habitat-ai/plugin-dev`. | Task 12.2 invocation-only scratch policy, native filesystem/path/child-process capabilities, truthful plan/apply refusals, and installed command behavior. No unused clock port or inherited mutation loop. |
| `@habitat-ai/rawr-chatgpt-corpus`, `@habitat-ai/rawr-plugin-chatgpt-corpus` | Initial Rawr adoption recorded as `@rawr/chatgpt-corpus` and `@rawr/plugin-chatgpt-corpus`, at `services/chatgpt-corpus` and `plugins/cli/topics/chatgpt-corpus`. | Later unique changes require current-destination comparison under D-3; no blanket re-import. |
| `@habitat-ai/rawr-hyperresearch-codex`, `@habitat-ai/rawr-plugin-hyperresearch` | Initial Rawr adoption recorded as `@rawr/hyperresearch-codex` and `@rawr/plugin-hyperresearch`, with genuine commands only. | Product service/topic proof; fixture commands and backend selectors remain excluded. |
| `@habitat-ai/rawr-session-intelligence`, `@habitat-ai/rawr-plugin-session-tools` | Initial Rawr adoption recorded as `@rawr/session-intelligence` and `@rawr/plugin-session-tools`. Held Session Metrics and temporal-stack session candidates remain D-3. | Compare remaining unique session/transcript/search/metrics behavior with current Rawr before adoption. |
| Semantic-ledger resource/provider source | Held D-1, final neutral resource plus nested concrete provider and independent accepted SDK integration release. | Full ledger semantics, native ancestry qualification, safety, lost-answer recovery, and real-substrate proof in D-1. |
| Temporal-inquiry resource/provider and Nx source | Held D-2, final generic inquiry owners and native opt-in CLI Nx projection. | Own qualified backend contract and independent accepted SDK integration release. |
| Workstream-frame, research-experiment, authority-freeze/toolbox source | Held D-3 Rawr destinations, with executable and non-executable material separated. | Each sink waits only for its required released capability and owner acceptance. |
| Canonical agent/OpenShell and desktop host integration | D-4 native host destinations; vendor implementations are not yet qualified. Agent/desktop authoring and executable/schema faces remain required active work. | Task 10.1 descriptor-to-process invocation proof is active; native host invoke/cancel/stop, security/policy, and integration release acceptance are independently required by D-4. |

### Retired And Dissolved Source Owners

These are recorded source dispositions, not a cleanup queue. The intact
predecessor ledger and [held-source matrix](stack-cut-sheet.md) retain the
specific source evidence.

| Predecessor | Preserved behavior or explicit non-preservation |
|---|---|
| `@rawr/resource-agent-plugin-export-destination` and `provider-agent-plugin-export-destination-effect-platform-node` | Unreachable destination-state model retired. The retained package-output resource/provider proves requested artifact rendering. |
| `runtime-realization-type-env`, `tools/runtime-realization-type-env` | Live lab retired; frozen commit `3147acbdcdd916883cee5b081c0868e3d1bf09b9`, tree `7fff3eaf6d80a4609dd0d511696212a38133753d`, subtree `d35cd11d21abf6831947a57638cbd7de8035bf0d`. No distinct derivation algorithm was admitted from it. Other behavior may be considered only with an owner-local acceptance reason. |
| `@rawr/example-todo`, `plugin-server-api-example-todo`, `@rawr/plugin-hello` | Production examples retired. Only indispensable owner-local service or harness fixtures may be re-authored. |
| `@rawr/hq-app`, `@rawr/server`, `@rawr/web` at `apps/{hq,server,web}` | Predecessor app/host implementations not preserved. Final self-host, server/async isolation, and web realization are fresh owner work. |
| `@habitat-ai/rawr-hq-ops`, `services/hq-ops` | Mixed HQ operations, Rawr config, journal/security gates, and shell/PID readers retired; no retained platform reader or current data-deletion instruction. |
| `@rawr/ui-sdk`, `packages/ui-sdk` | Unused microfrontend mount protocol retired. Final web projections are authored against current canonical contracts. |
| `@habitat-ai/rawr`, `apps/cli` | Native Oclif plugin management transferred before residual source/manifest retirement. Later agent, dev, generator, source-bundle, and runtime work is not claimed by that deletion receipt. |
| `@habitat-ai/rawr-core`, former `packages/core` project | Command/output behavior moved to `HabitatCommand`; telemetry moved to its qualified resource/provider. Mixed identity dissolved; `packages/core` is a namespace. |
| `@habitat-ai/rawr-hq-sdk`, `packages/hq-sdk` | Only admitted service metadata, middleware, and native schema adaptation survived. Host builders, live binding machinery, and predecessor service views did not. |
| `@rawr/runtime-context`, `packages/runtime-context` | Five-lane semantics retained in canonical law; predecessor implementation and workflow/support state retired. Final contexts and binding cache are authored by their actual owners. |
| `@rawr/test-utils`, `packages/test-utils` | Minimal subprocess/fixture helpers moved beside surviving test owners; no generic production utility identity retained. |
| `@habitat-ai/typebox-adapter`, `packages/typebox-adapter` | Native adaptation moved to private `runtime-schema` and the public service-schema projection. No hand-rolled URI/pointer path reconstruction survives. |
| `@rawr/bootgraph`, `packages/bootgraph` | Empty reservation retired. The current private bootgraph owner is fresh implementation, not a transplanted package. |

## Current SDK Root Export Classification

The published SDK/CLI pair `0.5.15` includes `service@1` and `service@2`
policy. The older claim that Civ7 cannot proceed until service law exists is
obsolete. Civ7 still owns its exact-version `nx migrate`, installed acceptance,
and V8 proof; availability is not evidence that migration ran.

| Root export | Disposition | Completion condition |
|---|---|---|
| `HabitatClient` | Retain the typed catalog-client export while foundational CLI/Nx readers need it. No new compatibility family. | Task 11.5 moves every reader after the final app/runtime/Oclif vertical exists, with type and installed proof. |
| `createHabitatClientForWorkspace` | Retain the current workspace-bound acquisition entry until a real owner replaces it. Its module-global acquisition is temporary debt, not the final runtime architecture. | Task 11.5 replaces every entrypoint reader and removes the global acquisition without a placeholder owner or dual authority. |

Current static SDK faces include app, Effect/execution, service/schema,
server/async/web plugins, resource/provider/profile/derivation/schema, telemetry,
and policy data. Their presence does not prove every live runtime or host.
No semantic-ledger or temporal-inquiry export is claimed before its independently
accepted integration release.

## Native-Host Dependency Ownership

| Native dependency | Enduring ownership and acceptance |
|---|---|
| Elysia | The real server harness owns conditional loading and required optional metadata; task 13.1 co-lands actual native mount/drain proof. No permanent dependency ban inherited from an earlier reservation cleanup. |
| Inngest | Native Serve/Connect belongs to the async harness with its actual conditional loading and metadata. The qualified contract uses `inngest@4.18.0`, not `effect-inngest`; version changes require native behavior requalification. |
| Oclif | Direct CLI-owned dependencies, native manifest/plugin management, native exits, and installed behavior. It is not an SDK peer. |
| oRPC / official Effect bridge | Service implementation owns native operation authoring and official extension installation; the process owns contextual execution. Preserve the accepted `@orpc/experimental-effect@2.0.0-beta.23` bridge contract until requalified. |
| Fluree | D-1/D-2 provider compatibility and deployment artifact qualification, not a root SDK vendor dependency or a core runtime release barrier. |

## Runtime Authority Input Disposition

| Immutable input | Accepted use | Exclusion |
|---|---|---|
| Magic blueprint `4e2f5d63e964f8299a25172ece4d5d38f6f18655`, tree `88f0f24e98ba057c43f5aa6e93de4c7a510c0b11` | Blueprint comparison evidence. | Not runtime behavior proof. |
| Magic implementation `c4d9aa83917c303510f9621494dd9c7e6933587a`, tree `f062e173a14d787fc43adfa9c7061f605b6074ea` | App/runtime boundary, service context, scoped resources, and direct-face intent. | Dirty worktree contents and Magic product wiring are not migration source. |
| Magic generic consumer `ec7a49c596ca50d5c8ef8ce3f8e3e40cb08c33a7`, tree `2b3c99700d5db8264b7ee42910575e8b877bda3a` | One app with separately started server/async processes, process identity/lease/resource/health/stop isolation, refusal before mount, and companion demand. | Magic routes/functions, provider acquisition, Railway wiring, copied source/tarball. |
| Habitat proposal `203c9c686b0c18644218de5583902bcb180544a8` | Provenance for immutable app-v1 plus independent app-v2, finite process catalog, process identity, isolation, and companion intent. Re-author accepted semantics. | No direct merge/cherry-pick or authority from proposal code. |
| Habitat proposal `419d5286bf83a41175a001233de244699c1b72da` / `agent-codex-record-app-v2-runtime-handoff` | Retain provenance and any separately admitted unique intent. | Rejected landing unit: deletes immutable app-v1 and adds unproved direct MCP-SDK realization. |
| Magic `vendor/mcp-openapi/mcp-openapi-1.0.0.tgz` | Demand for an independently versioned external companion artifact. | No copied artifact/source and no claim that conditional task 13.6 is a core release prerequisite. |

## Behavioral Acceptance Matrix

A target name is a retained acceptance destination, not proof that the target is
already implemented or has passed. Co-land behavior with its actual owner;
later receipt audit is not permission to delay lifecycle correctness.

| Retained capability | Named target / acceptance owner | Required observation and refusal |
|---|---|---|
| Public CLI/SDK foundation | `@habitat-ai/cli:acceptance:oclif-installed-package`, `@habitat-ai/cli:test`, `@habitat-ai/sdk:test` | Fresh isolated registry install and one native Nx add operation, exact accepted SDK/CLI pair, generated TypeBox/native-oRPC service, all admitted public cold imports, sole `HabitatCommand`, no workspace/private dependency escape. Do not freeze bootstrap-version export counts. |
| Native schema and dependency coldness | `runtime-schema:test`, `provider-telemetry-opentelemetry-node:test`, SDK/CLI tests | Native validation, including invalid surplus data and ambiguous paths, without a custom walker. Cold imports tolerate unavailable unselected native hosts; real selected hosts carry positive metadata/loading proof. |
| Selected topology and definition closure | `runtime-definition:test`, `runtime-derivation:acceptance:normalized-topology` | Task 0.1's complete cold service export, named-slot nested identity, selected-process closure before provider coverage, inert unused profile supersets, equal reuse, divergent-diamond/cycle refusal, and required config-source first-hit failure. |
| Cohesive deployment derivation | `runtime-derivation:acceptance:deployment-cold-plan`, `runtime-compiler:test` | Complete definition-owned handoff works after producer locals are gone; compiler lowers without rebuilding topology. Canonical portable identity, no trailing-surrogate acceptance, referential tables, admitted lane carriers, zero execution, and bounded layered-DAG work count. |
| Agent/desktop authoring and execution | Task 10.1 owner-local descriptor/derivation/compiler/registry/process-runtime and SDK type/installed proof | Real executable and schema faces reach process Effect invocation through admitted definition-owned carriers. No empty export or declaration-only stub; only native host integration is D-4. |
| Deterministic boot order | `runtime-bootgraph:test` | Complete ordinary-shape graph agreement, stable dependency order, missing/cyclic refusal, and coldness under task 0.2; no exhaustive hostile-object protocol. |
| Native generators/source bundles | `@habitat-ai/cli:acceptance:generators-installed-package` | Tasks 11.6/12.3: complete preflight and native publication, idempotence, no overwrite on refusal, correct topic source bundle/native manifest, generated public contracts, and thin authoring commands over native Nx generators. |
| Catalog and repository tooling | `@habitat-ai/catalog-service:test`, `habitat:check`, `workstream-plugin-pack:verify` | Authority resolution/checking and policy ownership without product default readers or a second scheduler. |
| Source inventory/rule evaluation | `nx run-many -t test -p @habitat-ai/resource-source-inventory provider-source-inventory-git-effect-platform-node @habitat-ai/resource-rule-evaluation provider-rule-evaluation-grit-effect-platform-node`, catalog tests | Disposable repository native Git/Grit behavior, exact admitted inventory, ignored-file exclusion, and one request inventory. No recursive compatibility glob. |
| Fresh generic development | `@habitat-ai/dev-service:test`, `@habitat-ai/cli:acceptance:dev-native` | Task 12.2: dry/admitted/refused operations, prefix mutation safety, native output/exit, explicit ports, and selected provider behavior. Old-source absence is not this proof. |
| Agent-plugin owner contracts | `@habitat-ai/agent-plugin-lifecycle-service:test`; resource/provider `test` targets for package-output/Cowork, content-workspace/Git, native-agent-provider/Claude/Codex, and versioned-content/Git named above | Exact contract results, refusals, packaging/source/vendor behavior, and provider conformance. Owner qualification alone selects no app profile. |
| Native plugin installation | `@habitat-ai/cli:acceptance:oclif-native-plugins` | Native list/install/link/inspect/update/reset/uninstall, isolated state, and prebuilt fixture package without a production fixture project or placeholder runtime. |
| App-selected agent-plugin lifecycle | `@habitat-ai/cli:acceptance:oclif-native-telemetry` | Task 12.1: check/package/status/sync/test/vendors-update through genuine installed commands, exact refusal/mutation/output/exit/correlation, disposable homes, omitted-member removal, same-ID refresh, and idempotence. |
| Rawr adopted product owners | `nx run-many -t test -p @rawr/chatgpt-corpus @rawr/hyperresearch-codex @rawr/session-intelligence`; `nx run-many -t manifest,test -p @rawr/plugin-chatgpt-corpus @rawr/plugin-hyperresearch @rawr/plugin-session-tools` | Genuine domain and command behavior; no production fixture backend, selector, or command. Later source deltas need their own current-destination proof. |
| Native telemetry resource/provider | `@habitat-ai/resource-telemetry:test`, `provider-telemetry-opentelemetry-node:test` | Decode config, acquire/release once, correlated spans/events/metrics; count items presented to exporter callbacks and coarse callback success/failure truthfully. Disabled export creates no localhost exporter. No hidden app selection, false delivery, or exporter failure changing product behavior. |
| Effect provisioning substrate | `runtime-substrate-effect:test` plus first mounting proof | One process-owned `effect@4.0.0-beta.101` ManagedRuntime and one `Layer.effectContext` lifecycle adapter, force context before mount, dependency-ordered acquisition and reverse release. No second root Scope/ManagedRuntime, warm definition, Layer-shaped bootgraph, domain service as Effect service, or release outside that owner. Generic proof proceeds without D-1/D-2. |
| Telemetry process lifecycle | `runtime-process-runtime:test`, `runtime-mounting:test`, `runtime-observation:test` | Correlation through access/observation/mounting, native owner-classified drain/interruption, one shared idempotent shutdown, provider release after settlement. Observation is not authority; task 15.1 only audits co-landed receipts. |
| Installed Oclif runtime and telemetry | `@habitat-ai/cli:acceptance:oclif-native-runtime`, `@habitat-ai/cli:acceptance:oclif-native-telemetry` | App/profile selects real provider and command; success, failure, cancellation, cleanup, complete output/native exit, same trace, flush, no live handles. No placeholder/CLI-owned provider or duplicate lifecycle. |
| Native server and oRPC bridge | `runtime-harnesses:acceptance:server`, `runtime-harnesses:acceptance:server-native-telemetry` | Real Elysia/oRPC success, declared failure, defect, auth, abort. Native synchronous/Promise `.handler` and implementation-owned official `.effect` through SDK; bridge owns request signal/Cause/`Effect.runPromiseExit` reconciliation, app owns context/wrap, one module realm, release after settlement. No cause leakage, custom runner, service/adapter `Effect.run*`, direct Habitat `handlerGen`, or ProcessExecutionRuntime execution of oRPC Effects. The official extension's internal mechanism remains admitted. |
| Native async and telemetry | `runtime-harnesses:acceptance:async-native-telemetry` | Real Serve/Connect, same native client for private FunctionBundle factories and selected harness, separate named WorkflowDispatcher consumer; `step.run(id, () => ProcessExecutionRuntime...)`; native retry/history/memoization, with no callback for completed memoized state and fresh callback for un-memoized work. No resumed fiber, synthetic cancellation, or interruption of an active step. Preserve truthful presented/confirmed/dropped/unknown outcomes. |
| Native async shutdown | Same async target and mounting proof | Native finite `wrapRequest` attempts and actual managed step descendants own settlement; suspended orchestration/replay-discovery Promises do not. Serve preserves already admitted requests; Connect uses `handleShutdownSignals: []` and native close once. Both retain resources until their admitted attempts and managed descendants settle. Native close/reconcile or flush alone is not callback settlement or delivery proof. |
| Same-app server/async isolation | Task 13.5 built-child Elysia and Inngest Serve acceptance | Separate immutable process identities, leases, ManagedRuntimes, resources, handles, health, and stops from one finite app catalog. Stop/restart either without its sibling; missing async resource refuses before mount while server stays live; native settlement precedes release. No sibling supervisor or process-as-another-app/kind/project. |
| External MCP companion | Conditional task 13.6 | Independently versioned `mcp-openapi@1.0.0` through public runtime harness descriptor and readiness/health, with tools/OpenAPI resource surface and process-local lifecycle. No copied Magic tarball/source, direct MCP-SDK implementation, prompts claim, MCP-specific lifecycle authority, or core release blocker while unavailable. |
| Native web | `runtime-harnesses:acceptance:web` and tasks 14.1/14.2 owner proof | Current canonical web SDK projection, required real web-local Effect face, actual selected native realization, isolation, lifecycle, and installed/built behavior. No empty exports; do not restore the retired UI protocol or call app deletion equivalent behavior. |
| Semantic ledger | D-1: `@habitat-ai/resource-semantic-ledger:test`, `provider-semantic-ledger-fluree-http:test`, SDK/installed proof, and real-substrate conformance | Neutral API, unrestricted ancestry/logical-slot merge, all F1/F2 arms, atomic guarded proposal, single-flight independent waiters/read-only recovery, strict safe decoding, redaction, and import/build coldness. Independent accepted SDK integration release; no presumed authorized fork or fixed file corpus. |
| Temporal inquiry | D-2: `@habitat-ai/resource-temporal-inquiry:test`, `provider-temporal-inquiry-fluree-http:test`, `@habitat-ai/cli:acceptance:temporal-inquiry-nx` | Generic bounded inquiry/provenance, required provider lifecycle, inert opt-in discovery, containment/input hashing, mutable targets uncached, idempotent init/remove, no invented project or transcript policy. Independent accepted integration release. |
| Later Rawr workstream | D-3: `@rawr/workstream-frame:test`, `nx run-many -t manifest,test -p @rawr/plugin-workstream` | Released neutral ledger consumption and real product behavior, no direct Fluree or Habitat-source copy. Only this required dependency waits for D-1. |
| Later Rawr research/governance | D-3: `@rawr/research-experiment:test`, `rawr:check:governance` | Released TypeBox/service/runtime provisioning as actually needed; no package-shaped runtime, host provider construction, manual structural decoding, or executable authority from references. Governance review does not inherit a ledger release gate. |
| Native agent/OpenShell and desktop hosts | D-4: separately scoped real native host and installed/built integration acceptance | Retain canonical harness inputs/handles/health, plugin-owned projection/body, bounded process access, process-runtime delegation, correlation, and reserved security/policy hooks. Qualify actual vendor/platforms and real invoke/failure/cancel/stop/allow/refuse/isolation with settlement before release. No fake vendor support, deferred authoring, or blanket core-runtime prerequisite. |
| Product separation | `habitat:acceptance:product-separation-absence` | Structured project/package/lock/TypeScript/manifest and disposable-state observations; positive fresh-owner behavior where a path is reused, plus exact retired-identity absence. No arbitrary lexical parser or deletion of real user state. |

### Deletion And Replacement Oracles

The named acceptance rows above distinguish retained behavior from retired
implementation. In particular, the command publication/consumer transition
already recorded in the predecessor ledger does not authorize a second public
command model; current final readers must use `HabitatCommand`, without
`RawrCommand`, `RawrResult`, `workspace-root`, or `findWorkspaceRoot`
compatibility readers. The native graph, project-owned TypeScript programs,
structured package/lock metadata, Oclif manifest, and real loader behavior own
those checks. No source-spelling blacklist is promoted to enduring law.

The complete finite predecessor identity/path inventory is preserved in the
[quarantined deletion oracles](../../../../docs/projects/habitat-runtime-realignment/quarantine/openspec-baseline/classification-ledger.md#deletion-and-replacement-oracles).
It is phase-aware: a later fresh owner at `services/dev`, for example, replaces
old path absence with positive owner law and exact predecessor identity/reader
absence. Existing archive/quarantine data stays evidence, not active law.

Retain these specific closure categories in the product-separation oracle:

- Retired source/project/package roots and readers from the source tables,
  including `packages/dev-node`, predecessor `packages/core` project files,
  `scripts/chatgpt-corpus-template`, and `.habitat/rawr`.
- Retired command IDs and descendants: `agent:plugins:create`, `doctor`, `hq`,
  `reflect`, `routine`, `tools:export`, `workflow:harden`, `config`,
  `journal`, `security`, `hello`, `hyperresearch:codex-slice`, and
  `hyperresearch:codex:run-fixture`.
- Active product-document roots from the frozen inventory: the old
  `rawr-final-architecture-migration` and `orpc-ingest-domain-packages`
  projects, HQ operations/usage/integration design and runbooks,
  `the-reactive-codebase.{md,html}`, and
  `SPIKE_AGENT_COORDINATION_CANVAS_V1.md`. Existing archived material retains
  its hierarchy under `docs/projects/_archive/rawr-final-architecture-migration`;
  archive/quarantine text is not relinked into active authority.
- Root `rawr.config.ts`, executable/default `semantic-source-manifest.yaml`
  readers, and the retired `rawr-core-architecture` Semantica default ontology.
  Current routers/gateways and explicit-input tests prove no active default
  resolution, without claiming arbitrary uncompiled lexical absence.
- Retired `oclif-app` and `oclif-command-plugin` blueprint trees are not reused
  as current generic law. Independent immutable successor versions remain
  governed by the current blueprint process.
- Disposable fixture state only: `$HOME/.rawr/config.json`,
  `<workspace>/rawr.config.ts`, and workspace `.rawr/{hq,journal,security,routines}`.
  Retained content-workspace release input is excluded. This authorizes no
  removal of actual user home/workspace data.
- Native archive task 15.9 alone retires canonical
  `rawr-cli-application`, `legacy-membership-retirement`, and
  `mixed-plugin-lifecycle-retirement` after preserving their full removal
  deltas and the required Purpose normalization. No global archive/prune.

## Command And Policy Inventory

| Surface | Current destination / rule |
|---|---|
| Native Oclif `plugins` | CLI-owned native plugin management, distinct from agent-plugin lifecycle commands. |
| `resolve`, `check`, `hook` | Final Habitat catalog/app/topic foundation and runtime selection, not a retained old app shell. |
| CLI command/extension authoring | Thin authoring topic over CLI-owned native Nx generators, source bundle, and exact manifest proof. |
| Agent-plugin lifecycle | Final topic over the qualified service/resources with app/profile selection and telemetry. |
| Development | Fresh service/topic implementation in task 12.2, no Rawr defaults or predecessor package alias. |
| Corpus, Hyperresearch, session, workstream, research experiment | Rawr product owners; initial accepted transfers and D-3 later transfers are distinct. |
| Exported-value JSDoc policy | `require_exported_value_declarations_have_jsdoc` under `.habitat/overlays/repository/rules`. |
| Agent-router placement policy | Repository overlay owner, not app-local or duplicated runtime law. |
| Script topology policy | Native Nx workspace structure law in `nx-workspace/structure.toml`. |
| Workstream-plugin-pack selection | Its named repository overlay, not duplicated root law. |
| Other retired `.rawr` policy | No generic owner inferred from former placement; unclassified external work remains held. No app-host, web-host, or lab-law revival. |
| Semantica | Explicit reviewed inputs and evidence-only output. It neither chooses architecture nor supplies a hidden semantic migration gate. |
