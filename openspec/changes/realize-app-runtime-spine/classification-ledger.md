# Capability Classification Ledger

This ledger closes the current-source side of [[tasks#1-seal-authority-and-migration-input|task 1.2]] and [[tasks#define-generic-law-without-a-red-landing|task 2.6]]. The separate [[stack-cut-sheet]] classifies the complete Graphite board.

## Decision Rule

Behavior and invariants decide ownership:

- **Habitat** owns generic platform, runtime, authoring, repository, and agent-provider capabilities.
- **Rawr** owns downstream product domains whose meaning survives removal of the Habitat name.
- **Fixture** is owner-local proof with no production project, package, command, or app identity.
- **Delete** removes unclear, obsolete, duplicate, example, product-specific, or unreachable machinery.
- **Dissolve** moves only named generic behavior to an exact final owner, moves
  every reader in the same cut, and then deletes the mixed predecessor. The one
  enumerated exception is the task 2.8 command publication barrier: a prior
  semantic sieve deletes condemned closures requiring no retained-capability
  transfer; Gate A lands the producer while surviving readers remain unchanged;
  Gate B records its registry receipt; and Gate C moves those readers and
  deletes the predecessor without retaining compatibility authority.

`apps/habitat` is a composition destination for admitted platform capability,
not another classification. Marketplace owns curated agent-plugin content and
governed content records only; no current Habitat Nx project moves there.

## Exact Nx Project Inventory

The table enumerates all 47 projects returned by native Nx at Habitat `main`
`7457505fc5dc068c1ff80a06ca78f713ebe3a954` exactly once.

| Current Nx project | Current root | Class | Exact disposition | Acceptance owner |
|---|---|---|---|---|
| `@habitat-ai/cli` | `apps/habitat` | Habitat | Retain as the sole public Oclif executable. Task 2.10a first receives only native `@oclif/plugin-plugins` ownership and its installed roundtrip; task 11.4 later authors the runtime loader/harness, private source-bundle contract, and final generic Oclif laws. | Task 2.10a native-plugin receipt; task 11.4 Oclif runtime/installed acceptance |
| `@habitat-ai/sdk` | `packages/habitat-sdk` | Habitat | Move atomically to `packages/core/sdk`; retain the sole public SDK identity. | SDK build, exports, installed-package acceptance, and final package closure |
| `@habitat-ai/service` | `services/habitat` | Habitat | Rename to the catalog service at `services/catalog`; retain Habitat authority resolution and checking. This owner qualification does not claim app selection or an installed command vertical. | Owner-local catalog behavior and service law; task 11.1 self-host integration |
| `habitat` | `scripts/habitat` | Habitat | Retain as repository-policy tooling; it is not an app or public CLI identity. | Habitat policy tests and repository ratchet |
| `workstream-plugin-pack` | `tools/workstream-plugin-pack` | Habitat | Retain as non-public platform tooling and move its repository selection law to `.habitat/overlays/workstream-plugin-pack`. | Owner-local tool tests and Habitat policy |
| `rawr-hq-template` | `.` | Habitat | Rename the root package and Nx project exactly to the private `habitat-workspace`; retain repository scheduling and ratchet metadata without colliding with the `habitat` policy-tool project. | Exact-main Nx graph, root package identity, and repository ratchet |
| `@habitat-ai/resource-source-inventory` | `resources/source-inventory` | Habitat | Retain the provider-neutral resource contract. | Resource contract/conformance tests and catalog integration |
| `provider-source-inventory-git-effect-platform-node` | `resources/source-inventory/providers/git-effect-platform-node` | Habitat | Retain the local Git provider without product policy. | Provider conformance and catalog integration |
| `@habitat-ai/resource-rule-evaluation` | `resources/rule-evaluation` | Habitat | Retain the provider-neutral evaluation resource. | Resource contract/conformance tests and catalog integration |
| `provider-rule-evaluation-grit-effect-platform-node` | `resources/rule-evaluation/providers/grit-effect-platform-node` | Habitat | Retain the Grit provider. | Provider conformance and catalog integration |
| `@habitat-ai/rawr-agent-plugin-lifecycle` | `services/agent-plugin-lifecycle` | Habitat | Retain at the same root as `@habitat-ai/agent-plugin-lifecycle-service` and advance its exact selection to the semantic-equivalent `service@2` acquisition successor; qualify its public-client readers and tests without creating the final topic, overlay, profile, or installed vertical. | Task 2.10 owner-local service behavior; task 2.10b exact successor selection; task 12.1 installed agent-plugin vertical |
| `@habitat-ai/rawr-resource-agent-plugin-package-output` | `resources/agent-plugin-package-output` | Habitat | Retain at the same root as the provider-neutral `@habitat-ai/resource-agent-plugin-package-output`; owner qualification selects no app provider. | Task 2.10 resource conformance; task 12.1 selected lifecycle integration |
| `provider-agent-plugin-package-output-cowork-v1-effect-platform-node` | `resources/agent-plugin-package-output/providers/cowork-v1-effect-platform-node` | Habitat | Retain the Cowork package projection provider without selecting it in an app during qualification. | Task 2.10 provider conformance; task 12.1 selected lifecycle packaging acceptance |
| `@habitat-ai/rawr-resource-content-workspace` | `resources/content-workspace` | Habitat | Retain at the same root as the clean Git `@habitat-ai/resource-content-workspace`; owner qualification selects no app provider. | Task 2.10 resource conformance; task 12.1 selected lifecycle source acceptance |
| `provider-content-workspace-git-effect-platform-node` | `resources/content-workspace/providers/git-effect-platform-node` | Habitat | Retain the Git provider without selecting it in an app during qualification. | Task 2.10 provider conformance; task 12.1 selected lifecycle source acceptance |
| `@habitat-ai/rawr-resource-native-agent-provider` | `resources/native-agent-provider` | Habitat | Retain at the same root as the provider-neutral `@habitat-ai/resource-native-agent-provider`; owner qualification selects no app provider. | Task 2.10 resource/provider conformance; task 12.1 app-selected native acceptance |
| `provider-native-agent-provider-claude-effect-platform-node` | `resources/native-agent-provider/providers/claude-effect-platform-node` | Habitat | Retain the Claude native provider without selecting it in an app during qualification. | Task 2.10 provider conformance; task 12.1 Claude disposable-home behavior |
| `provider-native-agent-provider-codex-effect-platform-node` | `resources/native-agent-provider/providers/codex-effect-platform-node` | Habitat | Retain the Codex native provider without selecting it in an app during qualification. | Task 2.10 provider conformance; task 12.1 Codex disposable-home behavior |
| `@habitat-ai/rawr-resource-versioned-content` | `resources/versioned-content` | Habitat | Retain at the same root as `@habitat-ai/resource-versioned-content`; owner qualification selects no app provider. | Task 2.10 resource/provider conformance; task 12.1 selected lifecycle vendor acceptance |
| `provider-versioned-content-git-effect-platform-node` | `resources/versioned-content/providers/git-effect-platform-node` | Habitat | Retain the Git provider without selecting it in an app during qualification. | Task 2.10 provider conformance; task 12.1 selected lifecycle vendor acceptance |
| `@habitat-ai/rawr-dev` | `services/dev` | Delete | Freeze and delete the mixed predecessor in task 2.11; task 2.10 does not qualify or realize it. Task 12.2 authors the final `services/dev` / `@habitat-ai/dev-service` owner from accepted contracts and frozen evidence without carrying Rawr defaults forward. | Task 2.11 predecessor absence; task 12.2 fresh service behavior, plan/apply refusal, and installed CLI acceptance |
| `@habitat-ai/rawr-dev-node` | `packages/dev-node` | Delete | Freeze the predecessor with the task 2.11 source tree and delete it during separation. Task 12.2 authors scratch policy and explicit filesystem, path, process, and clock ports at their final owners rather than transferring this package. | Task 2.11 package/reader absence; task 12.2 fresh-owner behavior |
| `@habitat-ai/rawr-plugin-devops` | `plugins/cli/commands/devops` | Delete | Delete the predecessor command-plugin root in task 2.11. Task 12.2 authors `plugins/cli/topics/dev` as `@habitat-ai/plugin-dev` fresh against the final contract. | Task 2.11 predecessor absence; task 12.2 topic/installed development acceptance |
| `@habitat-ai/rawr-chatgpt-corpus` | `services/chatgpt-corpus` | Rawr | Import to Rawr as `@rawr/chatgpt-corpus`. | Rawr owner-local OpenSpec, Nx graph, and service behavior |
| `@habitat-ai/rawr-plugin-chatgpt-corpus` | `plugins/cli/commands/chatgpt-corpus` | Rawr | Import to `plugins/cli/topics/chatgpt-corpus` as `@rawr/plugin-chatgpt-corpus`. | Rawr topic manifest, service edge, and command behavior |
| `@habitat-ai/rawr-hyperresearch-codex` | `services/hyperresearch-codex` | Rawr | Import to Rawr as `@rawr/hyperresearch-codex`. | Rawr owner-local OpenSpec, Nx graph, and service behavior |
| `@habitat-ai/rawr-plugin-hyperresearch` | `plugins/cli/commands/hyperresearch` | Rawr | Import genuine commands to `plugins/cli/topics/hyperresearch`; delete production fixture commands. | Rawr topic manifest and product behavior without fixture membership |
| `@habitat-ai/rawr-session-intelligence` | `services/session-intelligence` | Rawr | Restack Session Metrics into the service, then import as `@rawr/session-intelligence`. | Rawr session, transcript, search, and metrics behavior |
| `@habitat-ai/rawr-plugin-session-tools` | `plugins/cli/commands/session-tools` | Rawr | Import to `plugins/cli/topics/session-tools` with the session service. | Rawr topic manifest and command behavior |
| `@rawr/resource-agent-plugin-export-destination` | `resources/agent-plugin-export-destination` | Delete | Delete the unreachable predecessor; package-output remains the supported export capability. | Project/node/source absence and retained package-output behavior |
| `provider-agent-plugin-export-destination-effect-platform-node` | `resources/agent-plugin-export-destination/providers/effect-platform-node` | Delete | Delete with its unowned resource. | Project/node/source absence |
| `runtime-realization-type-env` | `tools/runtime-realization-type-env` | Delete | Delete the live lab project; retain its frozen Git commit as provenance and adopt selected tests only beside final owners. | Project absence and owner-local proof for every adopted behavior |
| `@rawr/example-todo` | `services/example-todo` | Delete | Delete the production example; retain only indispensable owner-local service fixtures. | Production project absence and qualified fixture proof |
| `plugin-server-api-example-todo` | `plugins/server/api/example-todo` | Delete | Delete the production example API plugin; retain only indispensable harness fixtures. | Production project absence and qualified harness proof |
| `@rawr/plugin-hello` | `plugins/cli/commands/hello` | Delete | Delete the production example plugin. | Project and Oclif manifest absence |
| `@rawr/hq-app` | `apps/hq` | Delete | Delete the predecessor composition app after admitted declarations move to final Habitat owners. | App/project absence and Habitat self-host equivalence |
| `@rawr/server` | `apps/server` | Delete | Delete the flattened server process app; later server harness proof is owner-local. | App/project absence and qualified server harness acceptance |
| `@rawr/web` | `apps/web` | Delete | Delete the flattened web process app; author canonical web SDK/harness contracts fresh. | App/project absence and qualified web harness acceptance |
| `@habitat-ai/rawr-hq-ops` | `services/hq-ops` | Delete | Delete the mixed service, Rawr config paths, dead journal, security state/gates, and shell/PID readers. | Service/command/state absence; no retained platform reader |
| `@rawr/ui-sdk` | `packages/ui-sdk` | Delete | Delete the unused microfrontend mount protocol; author canonical web projection contracts fresh. | Package/reader absence and later web contract acceptance |
| `@habitat-ai/rawr` | `apps/cli` | Delete | After Gate C and the Rawr transfer, this app is deletion substrate. Task 2.10a first transfers only native `@oclif/plugin-plugins` ownership and records its installed receipt; task 2.11 freezes the exact source commit/tree and deletes the remaining app, manifest, and source. Later agent, development, generator, runtime, source-bundle, and generic-law work is fresh realization, not a retained app transfer. | Task 2.10a native-plugin receipt plus task 2.11 app/manifest/source absence; later owner-local acceptance is not deletion proof |
| `@habitat-ai/rawr-core` | `packages/core` | Dissolve | Move command/output production through task 2.8 Gate A, cut readers over and delete the predecessor command source in Gate C, move telemetry through the qualified resource/provider, then delete the mixed package identity. | Gate C leaves every retained reader at its final owner; the later mixed-project deletion proves the project absent |
| `@habitat-ai/rawr-hq-sdk` | `packages/hq-sdk` | Dissolve | Move only the admitted service metadata, middleware contracts, and schema adaptation required by current readers; delete the remaining host/product builders, embedded adapters, and live binding mechanics. Canonical plugin and runtime faces are authored fresh later. | Final SDK prerequisite exports and package/reader absence |
| `@rawr/runtime-context` | `packages/runtime-context` | Delete | Preserve the five-lane semantics in the canonical specifications, then delete the unused predecessor package and workflow/support state. Author the canonical SDK lanes fresh with their runtime owner. | Package/reader absence and later owner-local context tests |
| `@rawr/test-utils` | `packages/test-utils` | Dissolve | Move minimal subprocess/fixture helpers beside each surviving test owner, then delete the generic package. | Owner-local tests and package/reader absence |
| `@habitat-ai/typebox-adapter` | `packages/typebox-adapter` | Dissolve | Move the one native TypeBox Standard Schema adaptation into the private `runtime-schema` owner and expose it through `@habitat-ai/sdk/service/schema` without duplicate validation. | Ambiguous-path behavior tests, SDK export acceptance, and package absence |
| `@rawr/bootgraph` | `packages/bootgraph` | Delete | Delete the empty reservation shell during separation. The private package-less `runtime-bootgraph` owner is authored fresh later. | Predecessor project absence and later runtime-bootgraph behavior |

Task 2.10b advances exactly the retained `services/catalog` and
`services/agent-plugin-lifecycle` selections to `service@2`, and exactly the
retained `resources/{source-inventory,rule-evaluation,agent-plugin-package-output,content-workspace,native-agent-provider,versioned-content}`
selections to `resource@2`. This is an acquisition-only authority update:
provider projects remain `provider@1`; app/profile provider selection remains
later-owned; and `services/{dev,chatgpt-corpus,hyperresearch-codex,session-intelligence}`
plus `resources/agent-plugin-export-destination` remain at version 1 until task
2.11 deletes the already-dispositioned Habitat-side substrate.

## Behavioral Acceptance Matrix

The inventory names each owner. This matrix names the executable local oracle
that closes each retained, moved, or adopted capability class. A target passes
only when it produces the stated observation from the stated input; a project
graph, manifest, source-shape check, or successful process exit alone cannot
substitute for that observation. Targets marked **co-land** are created by the
same semantic node that introduces the destination capability.

Task 2.10 closes only existing owner identities, public-client readers, and
owner-local behavior/conformance. Installed command, app-profile selection,
runtime, telemetry, topic, overlay, and generator rows below are later
realization oracles and MUST NOT be cited as task-2.10 receipts or as proof that
task 2.11 deletion preserved those verticals.

| Capability class | Named local Nx oracle | Input and observable result | Failure condition |
|---|---|---|---|
| Public Habitat SDK and Oclif CLI | `nx run @habitat-ai/cli:acceptance:oclif-installed-package` | At Gate A, retain root registry `@habitat-ai/cli@0.5.2` as the Nx bootstrap, keep `apps/habitat` outside the Bun workspaces, and preserve the Bun 1.3.14 frozen lock. Build and locally pack both candidate products without a `file:`, `link:`, or duplicate workspace identity; publish both exact candidates only to an isolated local registry; and inspect `dist/blueprints/service` for only the positive closed `service@1` kind and zero product/legacy rule vocabulary. Start a disposable Bun/Nx consumer with neither Habitat product installed and invoke native `nx add @habitat-ai/cli@<candidate-version>` once; observe the exact paired SDK dependency, complete repository foundation, generated service with TypeBox schemas, router, in-process client, and one ordinary operation using native `.handler`, Nx admission of its public client and rejection of a relative cross-project private-service import, the pinned Effect 4 substrate without premature manual Effect execution, every public cold subpath, the installed `habitat` binary, its Oclif manifest, its initializer/plugin path, and exactly one public/candidate command model: `HabitatCommand`. Effect-oRPC execution is proved later by the server harness that owns the needed Effect context. Condemned closures are already absent; the remaining private predecessor source and readers stay outside the packed pair unchanged, and Gate A neither revives them nor claims their absence. | A second setup operation, preinstalled SDK, source link, duplicate workspace package identity, invalid frozen lock, workspace import, unpublished dependency, missing service face, private cross-project reach-in, Rawr command export, second public/candidate command model, manual/custom Effect runner, service-authored direct `Effect.run*`, `ProcessExecutionRuntime` for an oRPC service Effect, compatibility substrate, product term, legacy v2 or `forbids` packet, manifest drift, source/installed divergence, or nonzero installed command result fails before release. |
| Habitat command and extension generators | At task 11.6, **co-land** native Nx generator acceptance; at task 12.3, **extend** `nx run @habitat-ai/cli:acceptance:generators-installed-package` through the selected command surface | From the same fresh consumer installed through the isolated-registry `nx add` flow, run both native `nx generate` entrypoints into empty destinations and against exact-existing/divergent-path fixtures; then select `plugins/cli/topics/authoring` / private `@habitat-ai/plugin-authoring` and invoke the two installed `habitat cli ... create` projections. Observe compilable Habitat/public-extension projects, exact Nx/source-bundle/manifest registration, complete atomic writes, and no change on refusal. The task 2.11 frozen source is evidence only. | Rawr vocabulary, predecessor templates or command bases, a command body outside `@habitat-ai/plugin-authoring`, partial output, overwrite, project/manifest drift, a workspace-source import, or a claim that deletion already accepted the generator fails. |
| Service, schema, middleware, and command prerequisite | **co-land** `nx run runtime-schema:test`, `nx run @habitat-ai/sdk:test`, and `nx run @habitat-ai/cli:test` | Feed TypeBox values whose keys contain `%`, `%2F`, `/`, `~`, and nested arrays through native `Check`/`Errors`; observe message-only issues when an exact path is ambiguous. Propagate procedure metadata and curated context through the service middleware lineage, and exercise `HabitatCommand` as the one public/candidate result/error/output contract. Gate A deliberately does not assert predecessor-source or reader absence. | URI decoding, invented issue paths, manual structural decoding, metadata/context loss, context overwrite, a second public/candidate command result model, or divergent source/installed command semantics fails. |
| Catalog owner qualification | At task 2.10, `nx run @habitat-ai/catalog-service:test` | Resolve a real repository-local Habitat instance through the owner-qualified catalog and prove the predecessor service identity/readers are absent without selecting an app profile. | A second catalog identity, predecessor reader, or claim of self-host/installed realization fails qualification. |
| Habitat policy and workstream tooling integration | `nx run habitat:check` and `nx run workstream-plugin-pack:verify`; task 11.1 owns catalog self-host binding | Evaluate the selected closed blueprint law, verify the tool pack from its qualified owner, and later bind the qualified catalog through the self-host. | An unselected rule, open production blueprint, tool-owned Rawr policy, or direct provider acquisition by the command fails its owner target. |
| Source inventory and rule evaluation owners | `nx run-many -t test -p @habitat-ai/resource-source-inventory provider-source-inventory-git-effect-platform-node @habitat-ai/resource-rule-evaluation provider-rule-evaluation-grit-effect-platform-node` | Given a disposable repository, observe the exact source inventory and native Grit result from the qualified resources/providers without claiming the later development topic. | Provider disagreement, hidden mutation, ambiguous repository identity, or an unqualified Rawr default fails the corresponding owner target. |
| Development operations vertical | At task 12.2, **co-land** `nx run @habitat-ai/dev-service:test` and `nx run @habitat-ai/cli:acceptance:dev-native` | Author the final service/ports/topic, then invoke installed `habitat dev repo`, `habitat dev stack`, and `habitat dev worktree` through dry, admitted, and refused cases; observe each exact result, mutation prefix, output, and exit classification. | A reintroduced generic Node-mechanics package, predecessor source transfer, unexpected mutation, wrong native exit, or missing final topic fails. |
| Agent-plugin service/resource/provider qualification | At task 2.10, `nx run @habitat-ai/agent-plugin-lifecycle-service:test` and `nx run-many -t test -p @habitat-ai/resource-agent-plugin-package-output provider-agent-plugin-package-output-cowork-v1-effect-platform-node @habitat-ai/resource-content-workspace provider-content-workspace-git-effect-platform-node @habitat-ai/resource-native-agent-provider provider-native-agent-provider-claude-effect-platform-node provider-native-agent-provider-codex-effect-platform-node @habitat-ai/resource-versioned-content provider-versioned-content-git-effect-platform-node` | Build one closed release set through the existing service and resource/provider owners, prove their public-client and conformance behavior, and remove predecessor owner identities/readers. Select no app profile and invoke no installed command. | Dirty or mismatched Git input, duplicate skill ownership, invalid provider behavior, predecessor owner/reader residue, or an installed-vertical claim fails qualification. Package-output remains the sole supported export capability. |
| Native Oclif plugin-management transfer | At task 2.10a, **co-land** `nx run @habitat-ai/cli:acceptance:oclif-native-plugins` | Pack and install `@habitat-ai/cli`, then use one owner-local prebuilt package fixture and disposable state to roundtrip the native root `plugins` listing operation plus `plugins install`, `link`, `inspect`, `update`, `reset`, and `uninstall` through the transferred `@oclif/plugin-plugins` dependency/configuration. | An `apps/cli` dependency/config reader, missing native operation, source-only fixture, fixture Nx project/workspace/source owner/release membership, agent topic/profile, runtime placeholder, or final-law claim fails the transfer. |
| Installed agent-plugin vertical | At task 12.1, **co-land** `nx run @habitat-ai/cli:acceptance:agent-plugin-native` and require the accepted `nx run @habitat-ai/cli:acceptance:oclif-native-telemetry` receipt | Create `@habitat-ai/plugin-agent-plugins`, its overlay and Habitat app/profile selections, then invoke installed `habitat agent plugins check`, `package`, `status`, `sync`, `test`, and `vendors update`. Assert every command's exact result, refusal, mutation prefix, output, exit classification, correlated telemetry receipt, disposable Codex/Claude home behavior, omitted-member removal, same-ID refresh, and zero-mutation convergence. | Missing final topic/overlay/profile, placeholder provider/backend/bundle, dirty or mismatched Git input, unmanaged collision, stale same-ID visibility, omitted-member residue, mutation outside the explicit home, wrong native exit, missing telemetry receipt, or any second-run mutation fails. |
| Initial Rawr product closure | In Rawr, `nx run-many -t test -p @rawr/chatgpt-corpus @rawr/hyperresearch-codex @rawr/session-intelligence` and `nx run-many -t manifest,test -p @rawr/plugin-chatgpt-corpus @rawr/plugin-hyperresearch @rawr/plugin-session-tools` | Import the six admitted projects, then prove corpus ingestion/query, Hyperresearch's genuine command set without production fixtures, and Codex/Claude session discovery, indexing, search, metrics, and topic-to-service calls from the destination repository. | A Habitat workspace import, fixture command membership, missing transcript/metric result, wrong service edge, or topic manifest drift fails Rawr acceptance. |
| Temporal inquiry | **co-land after the runtime provider-plan checkpoint** `nx run @habitat-ai/resource-temporal-inquiry:test`, `nx run provider-temporal-inquiry-fluree-http:test`, and `nx run @habitat-ai/cli:acceptance:temporal-inquiry-nx` | Re-author a `RuntimeResource` with `HabitatEffect` operations and an app-selected cold Fluree provider plan; decode provider-owned config, construct the cold plan, acquire/release once with failure cleanup, and pass provider conformance. In a disposable consumer, native init twice produces the exact first mutation and zero second mutation; native remove twice does the same. An opt-in manifest attaches inferred immutable and mutable inquiry targets to the declared existing Nx project and root; snapshot results retain time and provenance, and absence of the manifest produces no inferred target. | Promise/session execution in the resource contract, resource-owned provider config/signals/acquisition, leaked acquisition after failure, a public `apps/habitat` reexport, Codex/Claude transcript or `post-it.md` policy in the generic owner, an invented project, direct consumer script execution, caching a mutable target, lost provenance, repeated init/remove mutation, or activation without the manifest fails. |
| Native telemetry resource and provider | At task 3.1, **co-land** `nx run @habitat-ai/resource-telemetry:test` and `nx run provider-telemetry-opentelemetry-node:test` | Through owner-local conformance, decode provider-owned config, build/acquire/release once, emit correlated spans/events/metrics, account for delivered and dropped observations, disable export without constructing a localhost exporter, and retire the mixed singleton. Select no Habitat app profile here. | Per-entrypoint acquisition, hidden app/profile selection, export while disabled, context loss, false delivery, duplicate provider, or exporter failure changing product behavior fails. |
| Telemetry process lifecycle | **co-land at the exact runtime owners** `nx run runtime-process-runtime:test`, `nx run runtime-mounting:test`, and `nx run runtime-observation:test`; task 15.1 audits receipts only | Carry one correlation identity through process access, observation, mounting, owner-classified drain/interruption, and one shared idempotent shutdown while provider release follows native settlement. | Duplicate acquisition/shutdown, early release, false drain completion, lost correlation, observation becoming authority, or delayed task-15.1 implementation fails. |
| App-selected Oclif telemetry | No later than task 12.1, **co-land or consume an existing accepted** `nx run @habitat-ai/cli:acceptance:oclif-native-telemetry` receipt | Select the qualified task-3.1 provider through the real Habitat app/profile and run a real installed command through success, declared failure, cancellation, and cleanup; observe the same trace identity, complete output, native exit semantics, flush, and no surviving handle. | A CLI-owned or placeholder provider, changed exit result, missing output/event, duplicate flush, surviving handle, or deferral to task 15.1 fails. |
| oRPC service execution and server telemetry | **co-land with the server harness** `nx run runtime-harnesses:acceptance:server-native-telemetry` | Send real success, declared failure, defect, auth, and aborted requests through native Elysia/oRPC. Exercise an inline native `.handler` for a non-Effect operation and the official `.effect` extension, installed once in the service implementation, for an Effect-backed operation; prove bridge-owned request signal/Cause/`Effect.runPromiseExit`/Promise reconciliation, app/process-owned `effect/context` plus `effect/wrap`, one correlated lifecycle, release after native settlement, and one oRPC/bridge/Effect module realm without exposing private causes on the wire. | Trace discontinuity, cause leakage, wrong native response, exporter interference, early or duplicate release, duplicate module realm, a manual/custom runner, service- or adapter-authored direct `Effect.run*`, `ProcessExecutionRuntime` executing an oRPC service Effect, or request cancellation that leaves work running fails. |
| Inngest/async telemetry | **co-land with the async harness** `nx run runtime-harnesses:acceptance:inngest-native-telemetry` | Execute a real Inngest function and `step.run`, observe attempt/step correlation, retry versus `NonRetriableError`, cancellation, drain, delivery/drop accounting, and native Connect shutdown. | History loss, retry reclassification, duplicate listeners/close, false drain, or telemetry changing the Inngest outcome fails. |
| Semantic ledger and later Rawr workstream | **co-land** `nx run @habitat-ai/resource-semantic-ledger:test`, `nx run provider-semantic-ledger-fluree-http:test`; later in Rawr, `nx run @rawr/workstream-frame:test` and `nx run-many -t manifest,test -p @rawr/plugin-workstream` | Prove provider-neutral ledger reads/writes and Fluree conformance, including guarded proposal and concurrency behavior; then prove the Rawr workstream service consumes only the released public ledger face. | Direct Fluree coupling in Rawr, stale head acceptance, lost proposal guard, or a copied Habitat implementation fails. |
| Later Rawr research and governance references | In Rawr, **co-land** `nx run @rawr/research-experiment:test` and `nx run rawr:check:governance` | Re-author the accepted service design through released `service@1`, TypeBox, and runtime provisioning, while the unique authority-freeze/toolbox references remain non-executable owner-local guidance. | Package-shaped runtime, manual structural decoding, copied Habitat law, provider construction by a host, or executable authority granted to a reference fails. |

Task 2.9 landed in Rawr through PR #57 and PR #59 at canonical
`main@a1a4fe7ed051ff405605c82c09ccd73332595383`, consuming the exact
`@habitat-ai/cli` / `@habitat-ai/sdk` `0.5.10` pair. The destination proof
passed 46 genuine Hyperresearch service tests, 3 Hyperresearch topic tests,
the exact four-command manifest, and the selected service/topic typecheck,
boundary, and Habitat-policy targets with no production fixture backend,
selector, or command remaining.

### Deletion And Replacement Oracles

Every deletion closes in the same node as its last reader and writer. The
following mapping distinguishes preserved behavior from pure deletion; no
absence-only gate may claim a behavior survived.

| Deleted or dissolved owner | Replacement oracle | Preserved observation or explicit non-preservation |
|---|---|---|
| Export-destination resource/provider | Agent-plugin resource and native targets above | Package-output renders the requested destination artifact; no destination-state owner survives. |
| `apps/cli` command base and mixed core command identity | Gate A installed-package and owner-local command targets; Gate B registry receipt; Gate C exact-registry root bootstrap plus command source/export/reader absence; task 2.10a installed native-plugin receipt; task 2.11 exact pre-deletion commit/tree plus `habitat:acceptance:product-separation-absence` | `HabitatCommand` producer mechanics pass before publication; only after registry receipt does the root consume that exact CLI and delete `RawrCommand`, `RawrResult`, their exports, source, and readers. Task 2.10a preserves only native Oclif plugin management at `@habitat-ai/cli`. Task 2.11 freezes and deletes the residual app; it does not preserve or prove the later runtime, source-bundle, generic-law, agent, development, or generator verticals. No shim, alias, fallback, or dual public authority survives. |
| Standalone TypeBox adapter | `runtime-schema:test` | Native TypeBox validation preserves messages and omits unreconstructable paths; no URI/pointer decoder survives. |
| Runtime-context and admitted hq-sdk service metadata/middleware | `nx run @habitat-ai/sdk:test` for the named behavior that co-lands; later `runtime-process-runtime:test` is fresh-owner acceptance | Only admitted metadata and middleware behavior co-lands. The predecessor runtime-context implementation, live binding bridge, and host assembly are explicitly not preserved; canonical context lanes and live bindings are authored fresh by their final owners. |
| Empty bootgraph predecessor | **co-land** `nx run runtime-bootgraph:test` | The fresh owner emits deterministic dependency order and refuses missing/cyclic closure; the reservation shell preserves no implementation. |
| HQ/server/web app roots and UI mount protocol | Later `@habitat-ai/cli:acceptance:oclif-native-runtime`, `runtime-harnesses:acceptance:server`, and `runtime-harnesses:acceptance:web` are fresh-owner acceptance | The predecessor apps and UI protocol are explicitly not preserved. Habitat self-host and owner-local harness behavior is authored fresh without claiming deletion-time equivalence. |
| `packages/dev-node` | Task 2.11 exact source freeze plus package/reader absence; task 12.2 `nx run @habitat-ai/dev-service:test` and `nx run @habitat-ai/cli:acceptance:dev-native` are fresh-owner acceptance | The predecessor package is not transferred. Task 12.2 authors scratch policy in the development service and explicit filesystem, path, process, and clock ports at their final owners, then proves the app-selected Effect Platform Node provider across dry, admitted, and refused operations. Deletion is not behavioral equivalence. |
| Example-todo, hello, hq-ops, config, journal, security, removed root commands, generic test-utils, and lab identities | `nx run habitat:acceptance:product-separation-absence` | The finite absence inventory below contains every deleted project identity, command, export/import identity, reader, and condemned state path. These implementations preserve no product capability. |

`habitat:acceptance:product-separation-absence` uses selected closed Habitat law
for surviving topology and one repository-separation Grit overlay for
source-spelled, unescaped static ES-style import and re-export specifiers that
directly name predecessor package identities. The full repository check owns
project TypeScript programs, including cooked or escaped module resolution and
TypeScript import-equals. The acceptance target then composes native Nx project,
package-export, Oclif-manifest, and filesystem-fixture observations against the
checkpoint's exact inventory below. The inventory is cumulative but
phase-aware: a deletion enters when its owning task lands, and a later fresh
owner at the same path replaces path absence with positive owner law plus exact
predecessor-identity/signature absence. No checkpoint applies a future deletion
early. The target introduces no custom topology/source runner, policy engine,
or compatibility reader:

- Predecessor project identities: `@habitat-ai/service`, `rawr-hq-template`,
  `@habitat-ai/rawr-agent-plugin-lifecycle`,
  `@habitat-ai/rawr-resource-agent-plugin-package-output`,
  `@habitat-ai/rawr-resource-content-workspace`,
  `@habitat-ai/rawr-resource-native-agent-provider`,
  `@habitat-ai/rawr-resource-versioned-content`, `@habitat-ai/rawr-dev`,
  `@habitat-ai/rawr-dev-node`, `@habitat-ai/rawr-plugin-devops`,
  `@habitat-ai/rawr-chatgpt-corpus`,
  `@habitat-ai/rawr-plugin-chatgpt-corpus`,
  `@habitat-ai/rawr-hyperresearch-codex`,
  `@habitat-ai/rawr-plugin-hyperresearch`,
  `@habitat-ai/rawr-session-intelligence`,
  `@habitat-ai/rawr-plugin-session-tools`,
  `@rawr/resource-agent-plugin-export-destination`,
  `provider-agent-plugin-export-destination-effect-platform-node`,
  `runtime-realization-type-env`, `@rawr/example-todo`,
  `plugin-server-api-example-todo`, `@rawr/plugin-hello`, `@rawr/hq-app`,
  `@rawr/server`, `@rawr/web`, `@habitat-ai/rawr-hq-ops`, `@rawr/ui-sdk`,
  `@habitat-ai/rawr`, `@habitat-ai/rawr-hq-sdk`,
  `@rawr/runtime-context`, `@rawr/test-utils`,
  `@habitat-ai/typebox-adapter`, and `@rawr/bootgraph`.
- Task 3.3 project-identity extension: add `@habitat-ai/rawr-core` only when
  task 3.3 deletes that mixed package/project and every reader; task 2.11 does
  not claim this future absence.
- Predecessor source roots and manifests: `apps/cli/**`, `apps/hq/**`,
  `apps/server/**`, `apps/web/**`, `services/dev/**`, `packages/dev-node/**`,
  `plugins/cli/commands/devops/**`, `plugins/cli/commands/hello/**`,
  `services/chatgpt-corpus/**`, `services/hyperresearch-codex/**`,
  `services/session-intelligence/**`, `plugins/cli/commands/chatgpt-corpus/**`,
  `plugins/cli/commands/hyperresearch/**`, `plugins/cli/commands/session-tools/**`,
  `services/hq-ops/**`, `services/example-todo/**`,
  `plugins/server/api/example-todo/**`, `packages/ui-sdk/**`,
  `packages/hq-sdk/**`, `packages/runtime-context/**`, `packages/test-utils/**`,
  `packages/bootgraph/**`, `resources/agent-plugin-export-destination/**`,
  `tools/runtime-realization-type-env/**`,
  `tools/semantica-workbench/ontologies/rawr-core-architecture/**`,
  `scripts/chatgpt-corpus-template/**`, and `.habitat/rawr/**`. The finite
  frozen-reader closure also requires `packages/core/src/workspace-root.ts` and
  `packages/core/test/workspace-root.test.ts` absent.
- Task 2.11 active product-document roots: every active file under
  `docs/projects/rawr-final-architecture-migration/**` whose path has no
  `_archive`, `archive`, or `quarantine` segment;
  `docs/projects/orpc-ingest-domain-packages/**`;
  `docs/process/{DESIGN_DATA_INTEGRATION_PLAN.md,DESIGN_INTEGRATION_GOALS.md,HQ_OPERATIONS.md,HQ_USAGE.md}`;
  `docs/process/runbooks/{COORDINATION_CANVAS_OPERATIONS.md,HQ_RUNTIME_OPERATIONS.md}`;
  `docs/product/the-reactive-codebase.{md,html}`; and
  `docs/projects/spikes/SPIKE_AGENT_COORDINATION_CANVAS_V1.md`. Existing
  archive/quarantine members nested in the migration project move, preserving
  their relative hierarchy, to
  `docs/projects/_archive/rawr-final-architecture-migration/**`; the old active
  project root is then absent. Other material already under `docs/_archive/**`,
  `docs/projects/_archive/**`, or a named `quarantine/**` root remains
  non-authorizing provenance.
- Task 2.11 document-reader closure: update the current Habitat gateways,
  routers, product/process indexes, contribution/update guidance, workstream
  references, and Semantica configuration/default readers so no active link,
  import, or executable default resolves any deleted product document or
  `semantic-source-manifest.yaml`. This includes `AGENTS.md`, `AGENTS_SPLIT.md`,
  `README.md`, `CONTRIBUTING.md`, `UPDATING.md`, the retained `docs/**` and
  kind-router indexes, the workstream-runner references, and
  `tools/semantica-workbench/**` readers; archives and quarantine receive no
  link repair. Semantica's owner-local explicit-input tests prove executable
  default removal, while final current-gateway review proves document-link
  closure. Neither claim is attributed to the JavaScript/TypeScript source
  overlay.
- Repository configuration absence at task 2.11 includes root `rawr.config.ts`.
- Blueprint-law checkpoint extensions: task 2.10 already adds
  `services/habitat/**` after the accepted catalog rename; task 2.10a adds
  `.habitat/blueprints/oclif-app/**`; task 2.11 adds
  `.habitat/blueprints/oclif-command-plugin/**`; and task 15.9 adds
  `openspec/specs/{rawr-cli-application,legacy-membership-retirement,mixed-plugin-lifecycle-retirement}/**`
  only after all three archived removal deltas have been preserved.
- Task 2.8 source-root extension: add `packages/typebox-adapter/**` with the
  already accepted runtime-schema consolidation; project-identity absence alone
  is not sufficient source closure.
- Task 12.2 same-path replacement: `services/dev/**` path absence is a task
  2.11 checkpoint only. When task 12.2 creates the final selected
  `services/dev` / `@habitat-ai/dev-service`, the final inventory replaces that
  path assertion with its positive closed service law and exact absence of
  `@habitat-ai/rawr-dev`, `@habitat-ai/rawr-dev-node`,
  `@habitat-ai/rawr-plugin-devops`, Rawr-named command/package signatures, and
  every `packages/dev-node` reader.
- Command IDs: `agent:plugins:create`, `doctor`, `hq`, `reflect`, `routine`,
  `tools:export`, `workflow:harden`, `config`, `journal`, `security`, `hello`,
  `hyperresearch:codex-slice`, and `hyperresearch:codex:run-fixture`, including
  every former descendant in the final Oclif manifest.
- Export/import and reader identities: every dependency, package export,
  manifest member, and source-spelled, unescaped static ES-style import or
  re-export specifier for the project identities above, plus the predecessor HQ
  shell/PID readers. Project-owned TypeScript checks own cooked or escaped
  module resolution and TypeScript import-equals. Gate C
  already removed `RawrCommand`, `RawrResult`, and their readers; task 2.11
  deletes the finite frozen `findWorkspaceRoot` source/export closure, including
  the `workspace-root` export identity. Nx owns project edges, and behavior owns
  runtime loader execution. Literal or computed
  runtime loaders are not falsely modeled as an enduring Grit relation, and the
  target introduces no task-local source parser to compensate.
- Condemned state paths in disposable fixtures: `$HOME/.rawr/config.json`,
  `<workspace>/rawr.config.ts`, and `<workspace>/.rawr/hq/**`,
  `.rawr/journal/**`, `.rawr/security/**`, and `.rawr/routines/**`. The retained
  content-workspace release input is outside this list.

For `RawrCommand` and `RawrResult`, this zero-model/zero-reader inventory is the
Gate C oracle. Gate A MUST refuse a second public/candidate command model but
MUST NOT claim this predecessor absence before the Gate B registry receipt.

## Command And Policy Inventory

| Current surface | Class | Disposition and acceptance owner |
|---|---|---|
| `agent plugins check/package/status/sync/test` and `agent plugins vendors update` | Habitat | Task 12.1 creates the final service-client-only projections at `plugins/cli/topics/agent-plugins` as private `@habitat-ai/plugin-agent-plugins`, re-authors the overlay, adds app/profile provider selection, and accepts the installed `habitat agent plugins` vertical. Task 2.10 qualifies only its service/resources/readers/tests, and task 2.11 deletion proves none of this final topic. |
| `agent plugins create` | Delete | Remove the predecessor authoring surface and its private helpers/tests. |
| Native Oclif root `plugins` listing plus `plugins install/link/inspect/update/reset/uninstall` | Habitat | Task 2.10a moves the exact `@oclif/plugin-plugins` dependency/configuration and complete installed roundtrip from `apps/cli` to `@habitat-ai/cli`, with one owner-local prebuilt package fixture and receipt. It creates no agent topic, profile, runtime, source-bundle contract, or final generic law. |
| `habitat resolve`, then `habitat check` and `habitat hook` | Habitat | Task 11.4 creates `plugins/cli/topics/foundation` / private `@habitat-ai/plugin-foundation`, selects it into the Habitat app/profile, and co-lands `resolve` with the final generic Oclif laws/runtime vertical. Task 11.5 adds `check` and `hook` through the same owner and seven-phase path. |
| `cli command create`, `cli extension create` | Habitat | Task 11.6 re-authors the two native `@habitat-ai/cli` Nx generator entrypoints and verified-write mechanics without a command topic. Task 12.3 creates and selects `plugins/cli/topics/authoring` / private `@habitat-ai/plugin-authoring` as the sole owner of the two thin installed command projections. Task 2.11 frozen source is provenance, not acceptance. |
| `dev repo/stack/worktree` | Habitat | Delete the predecessor command-plugin root in task 2.11, then author the final service/topic vertical fresh at task 12.2 from accepted contracts and frozen evidence without Rawr discovery/configuration. |
| Corpus, Hyperresearch, and session topics | Rawr | Transfer with their six projects and select only from the Rawr app. |
| Config, journal, security | Delete | Remove current product paths, dead writers, state, gates, commands, and tests; a later qualified owner starts fresh. |
| Root doctor, HQ, reflect, routine, tools export, workflow harden | Delete | Remove commands and private readers without aliases. |
| `.habitat/rawr/agent-plugin-lifecycle` | Habitat | Delete the Rawr namespace during separation, then re-author the final `.habitat/overlays/agent-plugin-lifecycle` only with the conforming agent-plugin topic/app vertical at task 12.1. |
| `.habitat/rawr/repository/contracts/rules/require_exported_value_declarations_have_jsdoc` | Habitat | Move the generic source law to `.habitat/overlays/repository/rules/require_exported_value_declarations_have_jsdoc`; delete the Rawr namespace copy. No kind definition or blueprint relation is added. |
| `.habitat/rawr/repository/rules/require_agent_router_placement` | Habitat | Move the durable cross-kind placement law to `.habitat/overlays/repository/rules/require_agent_router_placement`; delete the nested Rawr rule. No kind definition or blueprint relation is added. |
| `.habitat/rawr/repository/rules/require_repository_script_topology` | Habitat | Fold its positive topology into `.habitat/blueprints/nx-workspace/structure.toml`; delete the nested Rawr rule. |
| Other `.habitat/rawr/repository` rules | Delete | Remove product namespace and rules that do not have a qualified generic kind owner. |
| Complete `.habitat/blueprints/oclif-app/**` packet | Delete, then fresh-author | Task 2.10a deletes the product-bound packet and its registered applications when native extension management leaves `apps/cli`; no Oclif-app law remains active. Task 11.4 later authors one positive closed generic Oclif-app law fresh beside the conforming foundational vertical and private source-bundle contract. |
| Complete `.habitat/blueprints/oclif-command-plugin/**` packet | Delete, then fresh-author | Task 2.11 deletes the product-bound packet and its registered applications with the last predecessor command-plugin roots; no CLI-topic law remains active. Task 11.4 later authors one positive closed CLI-topic law fresh at `plugins/cli/topics/<topic>`, with individual Oclif commands below the topic's `commands/` member. Task 12.1 applies that already-landed generic law to the agent topic rather than authoring another law. |
| `.habitat/rawr/workstream-plugin-pack` | Habitat | Move to `.habitat/overlays/workstream-plugin-pack`. |
| `.habitat/rawr/app-host`, `.habitat/rawr/web-host` | Delete | Remove predecessor host law; canonical app/runtime packets co-land with conforming owners. |
| `.habitat/rawr/runtime-realization-lab` | Delete | Remove with the live lab project. |
| Semantica workbench | Habitat | Retain as repository-governance tooling; generated evidence is non-authorizing. |
| `scripts/chatgpt-corpus-template/**` | Delete | Delete the obsolete Python body, stale guidance, and inert template tree after the corpus service/topic transfer. |

Tests, fixtures, docs, and product records follow the semantic owner above.
Nothing survives as a generic support project. Every deletion gate compares the
final Nx graph, Oclif manifests, package exports, and source reachability to
this ledger; it does not infer ownership from filenames or historical package
names.
