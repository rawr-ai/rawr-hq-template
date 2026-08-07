# Capability Classification Ledger

This ledger closes the current-source side of [[tasks#1-seal-authority-and-migration-input|task 1.2]] and [[tasks#define-generic-law-without-a-red-landing|task 2.6]]. The separate [[stack-cut-sheet]] classifies the complete Graphite board.

## Decision Rule

Behavior and invariants decide ownership:

- **Habitat** owns generic platform, runtime, authoring, repository, and agent-provider capabilities.
- **Rawr** owns downstream product domains whose meaning survives removal of the Habitat name.
- **Fixture** is owner-local proof with no production project, package, command, or app identity.
- **Delete** removes unclear, obsolete, duplicate, example, product-specific, or unreachable machinery.
- **Dissolve** moves only named generic behavior to an exact final owner, moves every reader in the same cut, and then deletes the mixed predecessor.

`apps/habitat` is a composition destination for admitted platform capability,
not another classification. Marketplace owns curated agent-plugin content and
governed content records only; no current Habitat Nx project moves there.

## Exact Nx Project Inventory

The table enumerates all 47 projects returned by native Nx at Habitat `main`
`7457505fc5dc068c1ff80a06ca78f713ebe3a954` exactly once.

| Current Nx project | Current root | Class | Exact disposition | Acceptance owner |
|---|---|---|---|---|
| `@habitat-ai/cli` | `apps/habitat` | Habitat | Retain as the sole public Oclif executable and Habitat self-host CLI projection. | Habitat CLI build, manifest, installed-package acceptance, and app-runtime vertical |
| `@habitat-ai/sdk` | `packages/habitat-sdk` | Habitat | Move atomically to `packages/core/sdk`; retain the sole public SDK identity. | SDK build, exports, installed-package acceptance, and final package closure |
| `@habitat-ai/service` | `services/habitat` | Habitat | Rename to the catalog service at `services/catalog`; retain Habitat authority resolution and checking. | Catalog behavior, service law, and self-host acceptance |
| `habitat` | `scripts/habitat` | Habitat | Retain as repository-policy tooling; it is not an app or public CLI identity. | Habitat policy tests and repository ratchet |
| `workstream-plugin-pack` | `tools/workstream-plugin-pack` | Habitat | Retain as non-public platform tooling and move its repository selection law to `.habitat/overlays/workstream-plugin-pack`. | Owner-local tool tests and Habitat policy |
| `rawr-hq-template` | `.` | Habitat | Retain repository scheduling and ratchet metadata, then rename the workspace identity to Habitat when the repository rename lands. | Exact-main Nx graph and repository ratchet |
| `@habitat-ai/resource-source-inventory` | `resources/source-inventory` | Habitat | Retain the provider-neutral resource contract. | Resource contract/conformance tests and catalog integration |
| `provider-source-inventory-git-effect-platform-node` | `resources/source-inventory/providers/git-effect-platform-node` | Habitat | Retain the local Git provider without product policy. | Provider conformance and catalog integration |
| `@habitat-ai/resource-rule-evaluation` | `resources/rule-evaluation` | Habitat | Retain the provider-neutral evaluation resource. | Resource contract/conformance tests and catalog integration |
| `provider-rule-evaluation-grit-effect-platform-node` | `resources/rule-evaluation/providers/grit-effect-platform-node` | Habitat | Retain the Grit provider. | Provider conformance and catalog integration |
| `@habitat-ai/rawr-agent-plugin-lifecycle` | `services/agent-plugin-lifecycle` | Habitat | Retain at the same root as `@habitat-ai/agent-plugin-lifecycle-service` and conform it to `service@1`. | Service behavior, native provider acceptance, and `habitat agent plugins` vertical |
| `@habitat-ai/rawr-resource-agent-plugin-package-output` | `resources/agent-plugin-package-output` | Habitat | Retain at the same root as the provider-neutral `@habitat-ai/resource-agent-plugin-package-output`. | Resource conformance and lifecycle integration |
| `provider-agent-plugin-package-output-cowork-v1-effect-platform-node` | `resources/agent-plugin-package-output/providers/cowork-v1-effect-platform-node` | Habitat | Retain the Cowork package projection provider. | Provider conformance and lifecycle packaging acceptance |
| `@habitat-ai/rawr-resource-content-workspace` | `resources/content-workspace` | Habitat | Retain at the same root as the clean Git `@habitat-ai/resource-content-workspace`. | Resource conformance and lifecycle source acceptance |
| `provider-content-workspace-git-effect-platform-node` | `resources/content-workspace/providers/git-effect-platform-node` | Habitat | Retain the Git provider. | Provider conformance and lifecycle source acceptance |
| `@habitat-ai/rawr-resource-native-agent-provider` | `resources/native-agent-provider` | Habitat | Retain at the same root as the provider-neutral `@habitat-ai/resource-native-agent-provider`. | Resource conformance and native provider acceptance |
| `provider-native-agent-provider-claude-effect-platform-node` | `resources/native-agent-provider/providers/claude-effect-platform-node` | Habitat | Retain the Claude native provider. | Claude disposable-home behavior and native inventory acceptance |
| `provider-native-agent-provider-codex-effect-platform-node` | `resources/native-agent-provider/providers/codex-effect-platform-node` | Habitat | Retain the Codex native provider. | Codex disposable-home behavior and native inventory acceptance |
| `@habitat-ai/rawr-resource-versioned-content` | `resources/versioned-content` | Habitat | Retain at the same root as `@habitat-ai/resource-versioned-content`. | Resource conformance and lifecycle vendor acceptance |
| `provider-versioned-content-git-effect-platform-node` | `resources/versioned-content/providers/git-effect-platform-node` | Habitat | Retain the Git provider. | Provider conformance and lifecycle vendor acceptance |
| `@habitat-ai/rawr-dev` | `services/dev` | Habitat | Retain at the same root as `@habitat-ai/dev-service`; remove Rawr defaults and conform it to `service@1`. | Service behavior, plan/apply refusal, and platform CLI acceptance |
| `@habitat-ai/rawr-dev-node` | `packages/dev-node` | Dissolve | Let the app-selected Effect Platform Node provider supply filesystem, path, process, and clock mechanics; keep scratch-policy decisions in the development service, move every reader, then delete this package. | Development-service behavior using app-supplied resources and package/reader absence |
| `@habitat-ai/rawr-plugin-devops` | `plugins/cli/commands/devops` | Habitat | Move to `plugins/cli/topics/dev` as `@habitat-ai/plugin-dev`. | Oclif manifest and development vertical acceptance |
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
| `@habitat-ai/rawr` | `apps/cli` | Dissolve | Move admitted Habitat commands/loader mechanics to `@habitat-ai/cli`, let Rawr topics transfer with their projects, and delete the app. | One Habitat CLI app, one Rawr app in Rawr only, and no predecessor manifest |
| `@habitat-ai/rawr-core` | `packages/core` | Dissolve | Move command/output and explicit-host behavior through task 2.8, move the telemetry implementation through the qualified telemetry resource/provider, then delete the mixed package identity. | Every retained reader uses its final owner and the mixed project is absent |
| `@habitat-ai/rawr-hq-sdk` | `packages/hq-sdk` | Dissolve | Move only the admitted service metadata, middleware contracts, and schema adaptation required by current readers; delete the remaining host/product builders, embedded adapters, and live binding mechanics. Canonical plugin and runtime faces are authored fresh later. | Final SDK prerequisite exports and package/reader absence |
| `@rawr/runtime-context` | `packages/runtime-context` | Delete | Preserve the five-lane semantics in the canonical specifications, then delete the unused predecessor package and workflow/support state. Author the canonical SDK lanes fresh with their runtime owner. | Package/reader absence and later owner-local context tests |
| `@rawr/test-utils` | `packages/test-utils` | Dissolve | Move minimal subprocess/fixture helpers beside each surviving test owner, then delete the generic package. | Owner-local tests and package/reader absence |
| `@habitat-ai/typebox-adapter` | `packages/typebox-adapter` | Dissolve | Move the one native TypeBox Standard Schema adaptation into the private `runtime-schema` owner and expose it through `@habitat-ai/sdk/service/schema` without duplicate validation. | Ambiguous-path behavior tests, SDK export acceptance, and package absence |
| `@rawr/bootgraph` | `packages/bootgraph` | Delete | Delete the empty reservation shell during separation. The private package-less `runtime-bootgraph` owner is authored fresh later. | Predecessor project absence and later runtime-bootgraph behavior |

## Behavioral Acceptance Matrix

The inventory names each owner. This matrix names the executable local oracle
that closes each retained, moved, or adopted capability class. A target passes
only when it produces the stated observation from the stated input; a project
graph, manifest, source-shape check, or successful process exit alone cannot
substitute for that observation. Targets marked **co-land** are created by the
same semantic node that introduces the destination capability.

| Capability class | Named local Nx oracle | Input and observable result | Failure condition |
|---|---|---|---|
| Public Habitat SDK and Oclif CLI | `nx run @habitat-ai/cli:acceptance:oclif-installed-package` | Build and locally pack both public products, inspect `dist/blueprints/service` for only the positive closed `service@1` kind and zero product/legacy rule vocabulary, install the tarballs into a disposable Nx consumer, construct and typecheck a generated oRPC 2/Effect 4 service, load every public cold subpath, run the installed `habitat` binary, project its Oclif manifest, and execute the installed initializer/plugin path. | A workspace import, unpublished dependency, missing service face, compatibility substrate, product term, legacy v2 or `forbids` packet, manifest drift, source/installed divergence, or nonzero installed command result fails before release. |
| Habitat command and extension generators | **co-land** `nx run @habitat-ai/cli:acceptance:generators-installed-package` | From the locally packed CLI in a disposable Nx consumer, run both generators into empty destinations and against an existing-path refusal fixture; observe compilable Habitat-only projects, exact Nx/manifest registration, complete atomic writes, and no change on refusal. | Rawr vocabulary, predecessor templates or command bases, partial output, overwrite, project/manifest drift, or a workspace-source import fails. |
| Service, schema, middleware, and command prerequisite | **co-land** `nx run runtime-schema:test`, `nx run @habitat-ai/sdk:test`, and `nx run @habitat-ai/cli:test` | Feed TypeBox values whose keys contain `%`, `%2F`, `/`, `~`, and nested arrays through native `Check`/`Errors`; observe message-only issues when an exact path is ambiguous. Propagate procedure metadata and curated context through the service middleware lineage, and exercise the one Habitat command result/error/output contract. | URI decoding, invented issue paths, manual structural decoding, metadata/context loss, context overwrite, a second command result model, or divergent source/installed command semantics fails. |
| Catalog, Habitat policy, and workstream tooling | **co-land** `nx run @habitat-ai/catalog-service:test`, `nx run habitat:check`, and `nx run workstream-plugin-pack:verify` | Resolve a real repository-local Habitat instance through the catalog, evaluate the selected closed blueprint law, and verify the tool pack from its qualified owner. | A second catalog/policy identity, unselected rule, open production blueprint, or tool-owned Rawr policy fails its owner target. |
| Source inventory, rule evaluation, and development operations | `nx run-many -t test -p @habitat-ai/resource-source-inventory provider-source-inventory-git-effect-platform-node @habitat-ai/resource-rule-evaluation provider-rule-evaluation-grit-effect-platform-node`, plus **co-land** `nx run @habitat-ai/dev-service:test` and `nx run @habitat-ai/plugin-dev:manifest` | Given a disposable repository, observe the exact source inventory, native Grit result, and repository/worktree plan; a dry or refused operation leaves Git and filesystem state unchanged, while an admitted operation reports its exact applied prefix through app-selected Effect Platform resources. | Provider disagreement, hidden mutation, ambiguous repository identity, a reintroduced generic Node-mechanics package, an unqualified Rawr default, or a missing Oclif topic fails the corresponding owner test. |
| Agent-plugin construction, export, source, vendor, and native convergence | **co-land** `nx run @habitat-ai/agent-plugin-lifecycle-service:test`; `nx run-many -t test -p @habitat-ai/resource-agent-plugin-package-output provider-agent-plugin-package-output-cowork-v1-effect-platform-node @habitat-ai/resource-content-workspace provider-content-workspace-git-effect-platform-node @habitat-ai/resource-native-agent-provider provider-native-agent-provider-claude-effect-platform-node provider-native-agent-provider-codex-effect-platform-node @habitat-ai/resource-versioned-content provider-versioned-content-git-effect-platform-node`; and `nx run @habitat-ai/cli:acceptance:agent-plugin-native` | Build one closed release set from a clean Git input, render the requested package/export output, test native Codex and Claude in explicit disposable homes, remove omitted managed members, refresh same-ID content, and repeat the converged operation with an empty mutation plan. | Dirty or mismatched Git input, duplicate skill ownership, unmanaged collision, stale same-ID visibility, omitted-member residue, mutation outside the explicit home, or any second-run mutation fails. Package-output remains the sole supported export capability. |
| Initial Rawr product closure | In Rawr, `nx run-many -t test -p @rawr/chatgpt-corpus @rawr/hyperresearch-codex @rawr/session-intelligence` and `nx run-many -t manifest,test -p @rawr/plugin-chatgpt-corpus @rawr/plugin-hyperresearch @rawr/plugin-session-tools` | Import the six admitted projects, then prove corpus ingestion/query, Hyperresearch's genuine command set without production fixtures, and Codex/Claude session discovery, indexing, search, metrics, and topic-to-service calls from the destination repository. | A Habitat workspace import, fixture command membership, missing transcript/metric result, wrong service edge, or topic manifest drift fails Rawr acceptance. |
| Temporal inquiry | **co-land after the runtime provider-plan checkpoint** `nx run @habitat-ai/resource-temporal-inquiry:test`, `nx run provider-temporal-inquiry-fluree-http:test`, and `nx run @habitat-ai/cli:acceptance:temporal-inquiry-nx` | Re-author a `RuntimeResource` with `HabitatEffect` operations and an app-selected cold Fluree provider plan; decode provider-owned config, construct the cold plan, acquire/release once with failure cleanup, and pass provider conformance. An opt-in manifest attaches inferred immutable and mutable inquiry targets to the declared existing Nx project and root; snapshot results retain time and provenance, and absence of the manifest produces no inferred target. | Promise/session execution in the resource contract, resource-owned provider config/signals/acquisition, leaked acquisition after failure, a public `apps/habitat` reexport, Codex/Claude transcript or `post-it.md` policy in the generic owner, an invented project, direct consumer script execution, caching a mutable target, lost provenance, or activation without the manifest fails. |
| Native telemetry resource and provider | **co-land** `nx run @habitat-ai/resource-telemetry:test` and `nx run provider-telemetry-opentelemetry-node:test` | Acquire the app-selected provider once, emit correlated spans/events/metrics, account for delivered and dropped observations, disable export without constructing a localhost exporter, and release after flush. | Per-entrypoint acquisition, hidden backend selection, export while disabled, context loss, false delivery, or exporter failure changing product behavior fails. |
| Telemetry process lifecycle | **co-land with the integration** `nx run runtime-process-runtime:test`, `nx run runtime-mounting:test`, and `nx run runtime-observation:test` | Carry one correlation identity through process access, observation, mounting, owner-classified drain/interruption, and one shared idempotent shutdown while provider release follows native settlement. | Duplicate acquisition/shutdown, early release, false drain completion, lost correlation, or observation becoming authority fails. |
| Oclif telemetry | **co-land with the Oclif integration** `nx run @habitat-ai/cli:acceptance:oclif-native-telemetry` | Run a real installed command through success, declared failure, cancellation, and cleanup; observe the same trace identity, complete output, native exit semantics, flush, and no surviving handle. | A CLI-owned provider, changed exit result, missing output/event, duplicate flush, or surviving handle fails. |
| oRPC/server telemetry | **co-land with the server harness** `nx run runtime-harnesses:acceptance:server-native-telemetry` | Send real success, declared failure, defect, auth, and aborted requests through the native oRPC/Elysia harness and observe one correlated lifecycle without exposing private causes on the wire. | Trace discontinuity, cause leakage, wrong native response, exporter interference, or request cancellation that leaves work running fails. |
| Inngest/async telemetry | **co-land with the async harness** `nx run runtime-harnesses:acceptance:inngest-native-telemetry` | Execute a real Inngest function and `step.run`, observe attempt/step correlation, retry versus `NonRetriableError`, cancellation, drain, delivery/drop accounting, and native Connect shutdown. | History loss, retry reclassification, duplicate listeners/close, false drain, or telemetry changing the Inngest outcome fails. |
| Semantic ledger and later Rawr workstream | **co-land** `nx run @habitat-ai/resource-semantic-ledger:test`, `nx run provider-semantic-ledger-fluree-http:test`; later in Rawr, `nx run @rawr/workstream-frame:test` and `nx run-many -t manifest,test -p @rawr/plugin-workstream` | Prove provider-neutral ledger reads/writes and Fluree conformance, including guarded proposal and concurrency behavior; then prove the Rawr workstream service consumes only the released public ledger face. | Direct Fluree coupling in Rawr, stale head acceptance, lost proposal guard, or a copied Habitat implementation fails. |
| Later Rawr research and governance references | In Rawr, **co-land** `nx run @rawr/research-experiment:test` and `nx run rawr:check:governance` | Re-author the accepted service design through released `service@1`, TypeBox, and runtime provisioning, while the unique authority-freeze/toolbox references remain non-executable owner-local guidance. | Package-shaped runtime, manual structural decoding, copied Habitat law, provider construction by a host, or executable authority granted to a reference fails. |

### Deletion And Replacement Oracles

Every deletion closes in the same node as its last reader and writer. The
following mapping distinguishes preserved behavior from pure deletion; no
absence-only gate may claim a behavior survived.

| Deleted or dissolved owner | Replacement oracle | Preserved observation or explicit non-preservation |
|---|---|---|
| Export-destination resource/provider | Agent-plugin resource and native targets above | Package-output renders the requested destination artifact; no destination-state owner survives. |
| `apps/cli` and mixed core command identity | Installed-package, command-prerequisite, and Oclif native-runtime targets | One installed Habitat Oclif app preserves the admitted command/output behavior; no Rawr executable or launcher remains. |
| Standalone TypeBox adapter | `runtime-schema:test` | Native TypeBox validation preserves messages and omits unreconstructable paths; no URI/pointer decoder survives. |
| Runtime-context and admitted hq-sdk service metadata/middleware | `nx run @habitat-ai/sdk:test` and later `nx run runtime-process-runtime:test` | The five context lanes narrow downward, metadata survives service calls, and live bindings remain process-owned without a predecessor bridge. |
| Empty bootgraph predecessor | **co-land** `nx run runtime-bootgraph:test` | The fresh owner emits deterministic dependency order and refuses missing/cyclic closure; the reservation shell preserves no implementation. |
| HQ/server/web app roots and UI mount protocol | **co-land** `nx run @habitat-ai/cli:acceptance:oclif-native-runtime`, `nx run runtime-harnesses:acceptance:server`, and `nx run runtime-harnesses:acceptance:web` | The Habitat self-host and owner-local server/web fixtures preserve generic mount, stop, cancellation, and build-handoff behavior without retaining a product app. |
| Example-todo, hello, hq-ops, config, journal, security, removed root commands, generic test-utils, and lab project identities | Exact final Nx/source/manifest absence | These implementations preserve no product capability. Any indispensable generic test case is recreated beside and passes the exact owner target above; the deleted project itself has no replacement behavior claim. |

## Command And Policy Inventory

| Current surface | Class | Disposition and acceptance owner |
|---|---|---|
| `agent plugins check/package/status/sync/test/update vendors` | Habitat | Reproject through `habitat agent plugins`; lifecycle behavior and native-provider acceptance own the commands. |
| `agent plugins create` | Delete | Remove the predecessor authoring surface and its private helpers/tests. |
| Native Oclif `plugins install/link/list/inspect/update/reset/uninstall` | Habitat | Keep under `habitat plugins`; Oclif manifest and installed-package behavior own the surface. |
| `cli command create`, `cli extension create` | Habitat | Re-author as Habitat Nx generators plus thin CLI projections; generated-output acceptance owns them. |
| `dev repo/stack/worktree` | Habitat | Move with the development vertical after removing Rawr discovery/configuration. |
| Corpus, Hyperresearch, and session topics | Rawr | Transfer with their six projects and select only from the Rawr app. |
| Config, journal, security | Delete | Remove current product paths, dead writers, state, gates, commands, and tests; a later qualified owner starts fresh. |
| Root doctor, HQ, reflect, routine, tools export, workflow harden | Delete | Remove commands and private readers without aliases. |
| `.habitat/rawr/agent-plugin-lifecycle` | Habitat | Move the owner-qualified command-channel law to `.habitat/overlays/agent-plugin-lifecycle`, then remove the Rawr namespace. |
| `.habitat/rawr/repository/contracts/rules/require_exported_value_declarations_have_jsdoc` | Habitat | Move the generic source law to `.habitat/blueprints/grit-pattern/require_exported_value_declarations_have_jsdoc` and select it from each qualified kind; delete the Rawr namespace copy. |
| `.habitat/rawr/repository/rules/require_agent_router_placement` | Habitat | Fold its positive topology into `.habitat/blueprints/agent-router/structure.toml`; delete the nested Rawr rule. |
| `.habitat/rawr/repository/rules/require_repository_script_topology` | Habitat | Fold its positive topology into `.habitat/blueprints/nx-workspace/structure.toml`; delete the nested Rawr rule. |
| Other `.habitat/rawr/repository` rules | Delete | Remove product namespace and rules that do not have a qualified generic kind owner. |
| `.habitat/blueprints/oclif-app/require_oclif_app_configuration` | Habitat | Replace the current `apps/cli`, `@habitat-ai/rawr`, and `rawr` assertions atomically with one positive generic app law; retain no product-named compatibility rule. |
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
