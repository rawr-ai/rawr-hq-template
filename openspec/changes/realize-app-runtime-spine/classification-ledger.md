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
| `@habitat-ai/rawr-agent-plugin-lifecycle` | `services/agent-plugin-lifecycle` | Habitat | Retain at the same root as `@habitat-ai/agent-plugin-lifecycle-service`, advance its exact selection first to the semantic-equivalent `service@2` acquisition successor, then to the complete terminal-SDK-consumer `service@3` bootstrap successor; qualify its public-client readers and tests without creating the final topic, overlay, profile, or installed vertical. | Task 2.10 owner-local service behavior; task 2.10b acquisition successor; task 4.2 SDK bootstrap successor; task 12.1 installed agent-plugin vertical |
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
| `runtime-realization-type-env` | `tools/runtime-realization-type-env` | Delete | Delete the live lab project; retain frozen commit `3147acbdcdd916883cee5b081c0868e3d1bf09b9`, whole tree `7fff3eaf6d80a4609dd0d511696212a38133753d`, and subtree `d35cd11d21abf6831947a57638cbd7de8035bf0d` as provenance. Task 4.9 finds no distinct derivation algorithm beyond landed `runtime-derivation@2`; later owners may still adopt only separately admitted non-derivation behavior beside the owner it proves. | Project absence; task-4.9 authority-only no-op; owner-local proof for every later adopted behavior |
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

Task 4.2 later advances only the SDK-consuming
`services/agent-plugin-lifecycle` owner to `service@3`, whose selected source law
admits `@habitat-ai/sdk/plugins/server/effect` only in `src/service/impl.ts`.
The SDK-internal Catalog service remains on `service@2` with its direct official
vendor bootstrap because a Catalog-to-SDK edge would reverse the terminal
package dependency graph.

## Current SDK Root Export Classification

Task 3.2 classifies the complete current `@habitat-ai/sdk` root face at
`main@6fbe3b25234458521aaa4d36083c89eafd0047de`. Neither export has a
conforming qualified destination yet, so both remain at the root without a
compatibility facade or a new SDK family.

| Current root export | Current owner/readers | Exact disposition | Replacement owner and proof |
|---|---|---|---|
| `HabitatClient` | `@habitat-ai/sdk`; type-only readers in the foundational Habitat CLI and Nx projection | Preserve at the root. It remains the exact typed catalog client used by the current installed CLI. | Task 11.5 moves every Habitat-client reader after the final app/runtime/Oclif vertical exists. SDK and CLI typechecks prove the public type remains available until then. |
| `createHabitatClientForWorkspace` | `@habitat-ai/sdk`; production readers in the foundational Habitat CLI application and Nx plugin | Preserve at the root. No current app or runtime owner can replace its workspace-bound acquisition without creating an empty or premature runtime family. | Task 11.5 moves every entrypoint reader and explicitly deletes the module-global acquisition. Installed-package acceptance cold-imports the SDK root and requires this to be its sole runtime export. |

The already-qualified `service`, `service/schema`, and `telemetry` subpaths and
the policy-pack data exports remain unchanged. Task 3.2 creates no `app`,
`effect`, `execution`, `plugins/*`, or `runtime/*` shell, no private runtime
project, and no SDK path move; task 3.3 owns the one atomic path transfer.

Task 3.3 moves that complete package unchanged to `packages/core/sdk`, deletes
the empty `@habitat-ai/rawr-core` package/project shell, and leaves
`packages/core` as a namespace rather than an owner. The final Nx graph retains
the SDK's exact five private dependencies and three dependents, with
`runtime-schema` still rooted at `packages/core/runtime/schema`.

## Task 3.4 Native-Host Dependency Reservation

Task 3.4 is dependency cleanup and negative artifact proof, not a native-host
implementation node. The root currently declares Elysia and Inngest without a
selected app, runtime-harness owner, public face, or current SDK/CLI reader.
Those ownerless declarations leave now; the first conforming owner later adds
the minimum vendor metadata and loading boundary it can prove.

| Current dependency surface | Task 3.4 disposition | First positive owner |
|---|---|---|
| Root `elysia` declaration | Remove the direct root declaration and reconcile the lockfile. Add no SDK peer/optional metadata, export, subpath, loader, runtime project, or blueprint. | `runtime-harnesses` task 13.1 co-lands Elysia optional peer metadata and its owner-local conditional dynamic import with the real server harness. |
| Root `inngest` declaration | Remove the direct root declaration and reconcile the lockfile. Add no SDK peer/optional metadata, export, subpath, loader, runtime project, or blueprint. | The `runtime-harnesses` task 13.3/13.4 sequence co-lands native `inngest@4.18.0` optional peer metadata and its owner-local conditional dynamic import with real Serve/Connect harnesses. `effect-inngest` is not admitted. |
| Oclif package family | Retain its current direct `@habitat-ai/cli` dependency, configuration, manifest, and installed behavior. Oclif is not an SDK peer and is not part of this cleanup. | `@habitat-ai/cli` remains the direct native owner; task 11.4 later adds its runtime host vertical without changing this ownership. |
| OpenTelemetry, Effect, and oRPC package families | Retain their current resource/provider, substrate, service, SDK, and CLI mechanism dependencies. Task 3.4 neither removes nor reclassifies them as native-host peers. | Their already named semantic owners and later runtime consumers retain the acceptance obligations elsewhere in this ledger. |

The negative artifact proof extends the current SDK/CLI tests and packed
installed-package acceptance. It MUST show that every currently exported
packed subpath remains cold with Elysia and Inngest
unavailable; SDK and CLI packed manifests contain no Elysia/Inngest dependency,
peer, optional declaration, export, load path, or unpublished workspace
dependency; and task 4.2 adds only cold host-neutral async declarations plus
stable identity/descriptor references for task 13 lowering, with no
`FunctionBundle`, registration factory, native client, native function,
adapter, loader, or harness. No empty
export, conditional loader, private runtime owner, or host blueprint may be
introduced to manufacture that proof.

Structural rejection in this node uses the existing real TypeBox
runtime-schema validation boundary and OpenTelemetry Node provider config
decoder with invalid and surplus inputs. It does not introduce a schema walker,
package walker, or whole-plan snapshot. Each later host owner co-lands the real
decoder and rejection proof for its own boundary when that owner lands.

## Runtime Authority Input Disposition

Task 1.7 closes the consumer-oracle correction before task 4.1. These objects are
evidence inputs, not merge or transplant units:

| Input | Classification | Admitted assertion and exclusion |
|---|---|---|
| Magic clean blueprint `4e2f5d63e964f8299a25172ece4d5d38f6f18655` / tree `88f0f24e98ba057c43f5aa6e93de4c7a510c0b11` | Blueprint snapshot | Retain as the stable Magic blueprint comparison point. It does not prove live runtime or deployment behavior. |
| Magic committed implementation `c4d9aa83917c303510f9621494dd9c7e6933587a` / tree `f062e173a14d787fc43adfa9c7061f605b6074ea` | Earlier implementation evidence | Admit only abstract app/runtime-boundary, service-context, scoped-resource, and direct-face behavior. Exclude its dirty worktree and product wiring. |
| Magic committed consumer oracle `ec7a49c596ca50d5c8ef8ce3f8e3e40cb08c33a7` / tree `2b3c99700d5db8264b7ee42910575e8b877bda3a` | Generic behavior oracle | Admit one semantic app with separately started server/async processes; process-local launch identity, lease, resource, health, native stop, and sibling isolation; pre-mount required-resource refusal; and external-companion demand. Exclude Magic app/resource/service/route/function wiring, direct provider acquisition, Railway/deployment evidence, and copied `mcp-openapi` tarball. |
| Habitat proposal `203c9c686b0c18644218de5583902bcb180544a8` | Provenance only | Selectively re-author immutable `app@1`, complete independently resolvable future `app@2`, finite cold `ProcessCatalog`, process-local launch identity/lifecycle, companion attachment, and sibling isolation. Do not cherry-pick it. |
| Habitat proposal `419d5286bf83a41175a001233de244699c1b72da` | Reject as landing unit | Preserve the SHA only as provenance. It removes immutable `app@1` and selects an unexercised direct official-MCP-SDK shape. Neither enters the implementation stack. |
| Magic `vendor/mcp-openapi/mcp-openapi-1.0.0.tgz` | Excluded copied artifact | It proves demand only. Conditional task 13.6 may exercise an independently versioned external `mcp-openapi@1.0.0` artifact through Habitat's public companion descriptor/health contract; no copied tarball, prompts claim, or direct official-MCP-SDK implementation is admitted. |

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
| Public Habitat SDK and Oclif CLI | `nx run @habitat-ai/cli:acceptance:oclif-installed-package` | At Gate A, retain root registry `@habitat-ai/cli@0.5.2` as the Nx bootstrap, keep `apps/habitat` outside the Bun workspaces, and preserve the Bun 1.3.14 frozen lock. Build and locally pack both candidate products without a `file:`, `link:`, or duplicate workspace identity; publish both exact candidates only to an isolated local registry; and inspect `dist/blueprints/service` for only the positive closed `service@1` kind and zero product/legacy rule vocabulary. Start a disposable Bun/Nx consumer with neither Habitat product installed and invoke native `nx add @habitat-ai/cli@<candidate-version>` once; observe the exact paired SDK dependency, complete repository foundation, generated service with TypeBox schemas, router, in-process client, and one ordinary operation using native `.handler`, Nx admission of its public client and rejection of a relative cross-project private-service import, the pinned Effect 4 substrate without premature manual Effect execution, every public cold subpath, the installed `habitat` binary, its Oclif manifest, its initializer/plugin path, and exactly one public/candidate command model: `HabitatCommand`. The task-3.2a continuation additionally cold-imports the exact declarative `@habitat-ai/sdk/telemetry` face and proves an ignored filesystem-present compatibility subject is not evaluated. Effect-oRPC execution and automatic telemetry attachment are proved later by the runtime/harness owners that own the needed process context. | A second setup operation, preinstalled SDK, source link, duplicate workspace package identity, invalid frozen lock, workspace import, unpublished dependency, missing service face, provider lifecycle or telemetry bootstrap export, ignored compatibility subject evaluation, private cross-project reach-in, Rawr command export, second public/candidate command model, manual/custom Effect runner, service-authored direct `Effect.run*`, `ProcessExecutionRuntime` for an oRPC service Effect, compatibility substrate, product term, legacy v2 or `forbids` packet in the packed SDK policy pack, manifest drift, source/installed divergence, or nonzero installed command result fails before release. |
| Native-host dependency reservation | At task 3.4, **extend** `nx run @habitat-ai/cli:acceptance:oclif-installed-package` and run `nx run runtime-schema:test`, `nx run provider-telemetry-opentelemetry-node:test`, `nx run @habitat-ai/sdk:test`, and `nx run @habitat-ai/cli:test` | Remove the ownerless root Elysia/Inngest declarations and reconcile the lockfile. With both vendors unavailable, import every current packed public subpath, inspect every packed dependency bucket/export/load path, and observe no vendor load or unpublished workspace dependency. Feed invalid and surplus structures through the real TypeBox runtime-schema and OpenTelemetry Node provider config decode boundaries. | Any Elysia/Inngest SDK/CLI dependency, peer, optional declaration, export, subpath, loader, load, runtime project, or blueprint; a walker/snapshot substitute; a warm import; or removal/reclassification of direct Oclif ownership or current OpenTelemetry/Effect/oRPC mechanism dependencies fails this cleanup node. |
| Private normalized runtime topology | At task 4.7, **co-land** `nx run runtime-derivation:acceptance:normalized-topology` and immutable topology-only `runtime-derivation@1` policy/cache proof | Inspect the exact package-less version-1 root/source/test closure and real schema/definition edges. Call private `deriveNormalizedRuntimeTopology({ entrypoint, profileId })` with reordered cold declarations; observe recursively copied/frozen identity, exact normalized value and edge shapes, process-owned roles, app-plugin-owned plugin/surface/resource facts, transitive service edges through sealed `ServiceUse` carriers, no `plugin.service`, and code-unit tuple order. Refuse duplicate plugin identities, role literals, surface tuples, and exact edges. For a self-loop and a longer service cycle, vary authored edge order and prove only order-independent refusal: task 4.7 does not prescribe an error class, selected cycle path, diagnostic ordering, or finding payload and adds no error API. Admit the same resource identity across distinct plugins, project it once into sorted unique `resourceRequirementIdentities`, and refuse only a duplicate exact `plugin.resource` edge. Prove closed-schema rejection, opaque deployment/source copying, zero executable calls, cold/unchanged/relevant-change cache behavior, and no later artifact or SDK face. | A global rejection of shared resource demand, duplicate projection entry, accepted duplicate exact plugin/resource edge, mutable version 1, optional interior, `package.json`, fake edge, SDK face, reused/unfrozen input, wrong tuple order/direction, accepted identity/role/surface/edge/cycle/schema failure, cycle result that depends on authored order, executable call, or cache failure fails task 4.7. |
| Complete-derivation contract and binding-source authority closure | Task 4.7a is sealed as an authority-only documentation gate with no Nx or source target | The correction retained exactly eight documents: `HABITAT_ARCHITECTURE.md` routes, `HABITAT_RUNTIME_REALIZATION.md` is the sole exact canonical document, and six active OpenSpec artifacts carry the sole archive-safe acceptance requirement/scenarios. Canonical §§11.8, 13.5, 15, 23.1, and 27 own mechanics. No implementation, project, blueprint, SDK edge, export map, or public export changed. | Divergence from the canonical sections or active acceptance owner, mutation of immutable `runtime-derivation@1`, premature source or SDK work, public error API, callback/live value, or lossy archive fails the sealed gate. |
| Execution identity, async-step lowering, and service-resource normalization authority correction | Task 4.7b is sealed as an authority-only documentation gate with no Nx or source target | Across the same exact eight documents, route archive-safe task-4.8 proof for canonical `execution-descriptor:sha256:` RFC 8785 identity and descriptor/full-ref/recomputed agreement; per-occurrence frozen operational `execution.effect` lowering with lazy returned `HabitatEffect`, definition-owned `Effect.gen`, retained authored-effect reference, and distinct ids under distinct parents; and exact service `resourceDep` owner/resource/default-lifetime/conditional-role/no-instance/required/local-name-reason normalization while plugin/provider reason remains authored. Preserve the exact task-4.8 corpora and leave `packages/core/runtime/definition/src/execution.ts` unchanged. | Any implementation or source change in task 4.7b; a widened identity input, wrong prefix/pattern, mismatched descriptor/ref/recomputed id or boundary, authored async descriptor in the operational table, eager authored-code invocation, reuse collapse, wrong service owner/lifetime/role/instance/optional/reason field, changed plugin/provider reason, corpus drift, or lossy archive fails the sealed gate. |
| Execution population and public-entrypoint authority correction | Task 4.7c is sealed as an authority-only documentation gate with no Nx or source target | Across the same exact eight documents, narrow task-4.8 refs, execution-table entries, and portable refs to operational descriptors derived from authored async-step occurrences. Preserve the exact five-boundary-variant contracts for future-compatible later lane-owned carriers; `plugin.web-surface` is schema vocabulary only, not a task-4.8 entry or early web Effect face. Public acceptance calls the actual SDK export with one async occurrence and one lazy web loader and proves the derived async descriptor plus preserved loader without arbitrary properties, project facts, casts, synthesized refs, or a direct table fixture. Preserve every exact task-4.8 corpus. | Any implementation/source/corpus change in task 4.7c; any non-async task-4.8 population; early web Effect authoring; or substitute public-entrypoint proof fails the sealed gate. |
| Runtime-definition ownership-router authority correction | Task 4.7d is sealed as a documentation-only gate with no Nx or source target | Across exactly nine documents, add the existing `packages/core/runtime/definition/AGENTS.md` router to the prior eight-document authority surface and admit it as the eighth behavior-companion file solely for ownership documentation. Keep the publication/assembly corpus unchanged. Route cold object-shaped `providerSelection(...)` grammar to flat runtime-definition `profile.ts` and project it only through `@habitat-ai/sdk/runtime/profiles`; provider Effect plans and acquisition remain later runtime responsibilities. | Any implementation, source, test, blueprint, SDK, or publication change in task 4.7d; any ninth behavior file other than the router; moving grammar ownership to the SDK; early provider Effect plan or acquisition authority; or mutable `runtime-derivation@1` fails the sealed gate. |
| Runtime-derivation crypto-build authority correction | Task 4.7e is sealed as a documentation-only gate with no Nx or source target | Across exactly the same eight authority documents used by tasks 4.7a-c, excluding the runtime-definition router, add the existing `packages/core/runtime/derivation/tsdown.config.ts` to task 4.8's exact publication/assembly corpus. Permit task 4.8 to add only `node:crypto` exactly once to `deps.onlyImport`, yielding exactly `["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "typebox"]`, while retaining `platform: "neutral"`, every prior entry, and every other option. This admits Node native `createHash` for synchronous RFC 8785/SHA-256 identity under pinned tsdown 0.22.14's neutral-platform audit while preserving the exact source/test and eight-file behavior corpora, every other publication file, immutable v1, counts, and exports. | Any task-4.7e implementation/config edit; missing, duplicate, reordered, or extra `onlyImport` entry; platform or other option change; hand-rolled digest, Bun-only crypto, async WebCrypto, new dependency/package/Nx/public/source-semantic change; corpus drift beyond the one corrected publication member; mutable v1; or count/export drift fails the sealed gate. |
| Complete derivation and deployment-cold plan | At task 4.8, **co-land** independent no-fallback `runtime-derivation@2`, `nx run runtime-derivation:acceptance:deployment-cold-plan`, and the installed-package extension | Follow canonical §§11.8, 13.5, 15, 23.1, and 27 plus the active acceptance requirement/scenarios. Create exactly `.habitat/blueprints/runtime-derivation/versions/2/{blueprint.toml,structure.toml}` and select version 2 in the existing derivation `habitat.toml`; inspect the retained exact root/source/test closure, exact eight-file behavior companion corpus, separate exact publication/assembly corpus including `packages/core/runtime/derivation/tsdown.config.ts`, no version-1 edit/inheritance/fallback, and no version 3, other kind/version/project, or new `runtime-definition` file/project/blueprint/version. In that config add only `node:crypto` exactly once to `deps.onlyImport`, leaving `platform: "neutral"`, every prior entry, and every other option unchanged; the final array is exactly `["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "typebox"]`. Verify the exact LF rule, SDK policy-pack growth from 11 to 13 sorted members with `runtime-derivation@1` and `@2`, blueprint copy/input growth from eight to nine directories, immutable version-1 root closure excluding `versions/`, exact version-2 closure, packed parity/provenance, public import, and actual version-2 application. Through sole installed `@habitat-ai/sdk/runtime/derivation`, call `deriveRuntimeArtifacts({ entrypoint, profileId })`; observe only `{ topology, graph, executionDescriptorTable, webRouteModuleTable, portableArtifact }`, one private topology call, `graph.topology === topology`, recursive freeze, no executable calls, and the exact singular-profile graph, private-carrier binding/source normalization, canonical identities, sole finding, TypeError refusals, and distinct reference/table artifacts. Observe exactly the three runtime values and exact finite type-only inventory, with no public error API. Exercise export/nonexport; source defaults, authored order, and ref expansion with zero source I/O/decode; carrier recovery; inheritance/override/diamond; binding-id dedupe; exact result/table zero-execution; finding/refusal; and portable roundtrip. Roundtrip the exact seven-field artifact through its public schema/decoder and verify `artifactId` is exactly `sha256:` plus 64 lowercase hexadecimal SHA-256 characters for RFC 8785 canonical JSON of the other six fields. | Wrong source/test, behavior-companion, or publication/assembly closure; absent/extra version-2 blueprint; version-1 mutation; wrong `onlyImport` array, changed platform/option, alternate crypto route, or new dependency/package/Nx/public/source-semantic change; wrong pack member/directory count, order, LF rule, parity, provenance, import, or application; new `runtime-definition` file/project/blueprint/version or other kind/version/project; source I/O/decode; invention or widening; inheritance/fallback/v3; extra runtime value or type-only export; public error API; extra public result or portable field; topology reconstruction/nonidentity; mutable result; executable call; malformed/mismatched artifact id; incomplete ref ordering; loader-as-Effect classification; early web Effect face; portable table/live state; unresolved workspace dependency; or source/installed divergence fails task 4.8. |
| Frozen-lab derivation disposition | Task 4.9 is accepted as an authority-only no-op with no Nx or source target | Audit frozen Runtime Realization Lab commit `3147acbdcdd916883cee5b081c0868e3d1bf09b9`, whole tree `7fff3eaf6d80a4609dd0d511696212a38133753d`, and subtree `d35cd11d21abf6831947a57638cbd7de8035bf0d` against landed `runtime-derivation@2`. Task 4.8 already re-authored reference identity/agreement, service-binding deduplication, surface grouping, workflow inventory, async ownership/laziness, cold tables, and refs-only portability. Reject lab `stableJson`/`exec:*` identity, explicit binding inputs, mutable shapes, public types, Oracle, alternate `deriveRuntimeSpine`, and route derivation without an admitted carrier. Leave provider graph matching, closure, cycles, and diagnostics to compiler tasks 5.2 and 5.4. | Any source, test, project, blueprint, SDK face, public-contract, Oracle, optional-interior, version-3, or alternate-path change; any mutation of `runtime-derivation@2`; any admitted rejected lab shape; or any early compiler behavior fails task 4.9. |
| Definition-to-selection authority correction | Task 4.9a is sealed as a documentation-only gate with no Nx or source target | Across exactly nine documents, establish `Entrypoint` as the sole cold selection artifact and require `defineEntrypoint(...)` to synchronously produce it from real app, profile, process, entrypoint-id, and exact five-field launch-identity inputs. Before publication, app/process/entrypoint identities agree; disagreement throws built-in `TypeError` before output, external mutation, or authored executable work, without a public error API or prescribed error text/order. Task 4.10 changes only definition `src/app.ts` and `test/definition.test.ts`, preserving signatures, inference, exact result references, freeze behavior, and SDK identity while real-constructor proof makes producer-local bindings unavailable and covers all three mismatches with zero executable work. Task 4.11 changes only derivation `test/complete-derivation.test.ts`, retains every defensive derivation check, and proves real-Entrypoint plus `profileId` success and three corrupted identities/profile mismatch refusal before result with zero Effect/loader work. | A second selection artifact; a profile field added to launch identity; publication before agreement; output, external mutation, or executable work on mismatch; missing built-in `TypeError`; a prescribed error API/text/order; weakened derivation defense; task-4.10 or task-4.11 corpus drift; changed signature, inference, result reference, freeze, SDK export, derivation source/public surface; or any new validator, schema, file, project, edge, blueprint, version, export, or error fails tasks 4.9a-4.11. |
| Habitat command and extension generators | At task 11.6, **co-land** native Nx generator acceptance; at task 12.3, **extend** `nx run @habitat-ai/cli:acceptance:generators-installed-package` through the selected command surface | From the same fresh consumer installed through the isolated-registry `nx add` flow, run both native `nx generate` entrypoints into empty destinations and against exact-existing/divergent-path fixtures; then select `plugins/cli/topics/authoring` / private `@habitat-ai/plugin-authoring` and invoke the two installed `habitat cli ... create` projections. Observe compilable Habitat/public-extension projects, exact Nx/source-bundle/manifest registration, complete atomic writes, and no change on refusal. The task 2.11 frozen source is evidence only. | Rawr vocabulary, predecessor templates or command bases, a command body outside `@habitat-ai/plugin-authoring`, partial output, overwrite, project/manifest drift, a workspace-source import, or a claim that deletion already accepted the generator fails. |
| Service, schema, middleware, and command prerequisite | **co-land** `nx run runtime-schema:test`, `nx run @habitat-ai/sdk:test`, and `nx run @habitat-ai/cli:test` | Feed TypeBox values whose keys contain `%`, `%2F`, `/`, `~`, and nested arrays through native `Check`/`Errors`; observe message-only issues when an exact path is ambiguous. Propagate procedure metadata and curated context through the service middleware lineage, and exercise `HabitatCommand` as the one public/candidate result/error/output contract. Gate A deliberately does not assert predecessor-source or reader absence. | URI decoding, invented issue paths, manual structural decoding, metadata/context loss, context overwrite, a second public/candidate command result model, or divergent source/installed command semantics fails. |
| Catalog owner qualification | At task 2.10, `nx run @habitat-ai/catalog-service:test` | Resolve a real repository-local Habitat instance through the owner-qualified catalog and prove the predecessor service identity/readers are absent without selecting an app profile. | A second catalog identity, predecessor reader, or claim of self-host/installed realization fails qualification. |
| Habitat policy and workstream tooling integration | `nx run habitat:check` and `nx run workstream-plugin-pack:verify`; task 11.1 owns catalog self-host binding | Evaluate the selected closed blueprint law, verify the tool pack from its qualified owner, and later bind the qualified catalog through the self-host. | An unselected rule, open production blueprint, tool-owned Rawr policy, or direct provider acquisition by the command fails its owner target. |
| Source inventory and rule evaluation owners | `nx run-many -t test -p @habitat-ai/resource-source-inventory provider-source-inventory-git-effect-platform-node @habitat-ai/resource-rule-evaluation provider-rule-evaluation-grit-effect-platform-node` plus `nx run @habitat-ai/catalog-service:test` | Given a disposable repository, observe the exact source inventory and native Grit result from the qualified resources/providers. For compatibility Grit, observe one request-local inventory, zero recursive compatibility glob calls, exclusion of ignored and tracked-non-file candidates, and unchanged version-3 bounds. | Provider disagreement, repeated inventory observation, compatibility filesystem globbing, ignored/local-only evidence entering policy, hidden mutation, ambiguous repository identity, or an unqualified Rawr default fails the corresponding owner target. |
| Development operations vertical | At task 12.2, **co-land** `nx run @habitat-ai/dev-service:test` and `nx run @habitat-ai/cli:acceptance:dev-native` | Author the final service/ports/topic, then invoke installed `habitat dev repo`, `habitat dev stack`, and `habitat dev worktree` through dry, admitted, and refused cases; observe each exact result, mutation prefix, output, and exit classification. | A reintroduced generic Node-mechanics package, predecessor source transfer, unexpected mutation, wrong native exit, or missing final topic fails. |
| Agent-plugin service/resource/provider qualification | At task 2.10, `nx run @habitat-ai/agent-plugin-lifecycle-service:test` and `nx run-many -t test -p @habitat-ai/resource-agent-plugin-package-output provider-agent-plugin-package-output-cowork-v1-effect-platform-node @habitat-ai/resource-content-workspace provider-content-workspace-git-effect-platform-node @habitat-ai/resource-native-agent-provider provider-native-agent-provider-claude-effect-platform-node provider-native-agent-provider-codex-effect-platform-node @habitat-ai/resource-versioned-content provider-versioned-content-git-effect-platform-node` | Build one closed release set through the existing service and resource/provider owners, prove their public-client and conformance behavior, and remove predecessor owner identities/readers. Select no app profile and invoke no installed command. | Dirty or mismatched Git input, duplicate skill ownership, invalid provider behavior, predecessor owner/reader residue, or an installed-vertical claim fails qualification. Package-output remains the sole supported export capability. |
| Native Oclif plugin-management transfer | At task 2.10a, **co-land** `nx run @habitat-ai/cli:acceptance:oclif-native-plugins` | Pack and install `@habitat-ai/cli`, then use one owner-local prebuilt package fixture and disposable state to roundtrip the native root `plugins` listing operation plus `plugins install`, `link`, `inspect`, `update`, `reset`, and `uninstall` through the transferred `@oclif/plugin-plugins` dependency/configuration. | An `apps/cli` dependency/config reader, missing native operation, source-only fixture, fixture Nx project/workspace/source owner/release membership, agent topic/profile, runtime placeholder, or final-law claim fails the transfer. |
| Installed agent-plugin vertical | At task 12.1, **co-land** `nx run @habitat-ai/cli:acceptance:agent-plugin-native` and require the accepted `nx run @habitat-ai/cli:acceptance:oclif-native-telemetry` receipt | Create `@habitat-ai/plugin-agent-plugins`, its overlay and Habitat app/profile selections, then invoke installed `habitat agent plugins check`, `package`, `status`, `sync`, `test`, and `vendors update`. Assert every command's exact result, refusal, mutation prefix, output, exit classification, correlated telemetry receipt, disposable Codex/Claude home behavior, omitted-member removal, same-ID refresh, and zero-mutation convergence. | Missing final topic/overlay/profile, placeholder provider/backend/bundle, dirty or mismatched Git input, unmanaged collision, stale same-ID visibility, omitted-member residue, mutation outside the explicit home, wrong native exit, missing telemetry receipt, or any second-run mutation fails. |
| Initial Rawr product closure | In Rawr, `nx run-many -t test -p @rawr/chatgpt-corpus @rawr/hyperresearch-codex @rawr/session-intelligence` and `nx run-many -t manifest,test -p @rawr/plugin-chatgpt-corpus @rawr/plugin-hyperresearch @rawr/plugin-session-tools` | Import the six admitted projects, then prove corpus ingestion/query, Hyperresearch's genuine command set without production fixtures, and Codex/Claude session discovery, indexing, search, metrics, and topic-to-service calls from the destination repository. | A Habitat workspace import, fixture command membership, missing transcript/metric result, wrong service edge, or topic manifest drift fails Rawr acceptance. |
| Temporal inquiry | **co-land after the runtime provider-plan checkpoint** `nx run @habitat-ai/resource-temporal-inquiry:test`, `nx run provider-temporal-inquiry-fluree-http:test`, and `nx run @habitat-ai/cli:acceptance:temporal-inquiry-nx` | Re-author a `RuntimeResource` with `HabitatEffect` operations and an app-selected cold Fluree provider plan; decode provider-owned config, construct the cold plan, acquire/release once with failure cleanup, and pass provider conformance. In a disposable consumer, native init twice produces the exact first mutation and zero second mutation; native remove twice does the same. An opt-in manifest attaches inferred immutable and mutable inquiry targets to the declared existing Nx project and root; snapshot results retain time and provenance, and absence of the manifest produces no inferred target. | Promise/session execution in the resource contract, resource-owned provider config/signals/acquisition, leaked acquisition after failure, a public `apps/habitat` reexport, Codex/Claude transcript or `post-it.md` policy in the generic owner, an invented project, direct consumer script execution, caching a mutable target, lost provenance, repeated init/remove mutation, or activation without the manifest fails. |
| Native telemetry resource and provider | At task 3.1, **co-land** `nx run @habitat-ai/resource-telemetry:test` and `nx run provider-telemetry-opentelemetry-node:test` | Through owner-local conformance, decode provider-owned config, build/acquire/release once, emit correlated spans/events/metrics, account for items presented to native exporter callbacks by coarse callback success or failure, disable export without constructing a localhost exporter, and retire the mixed singleton. Select no Habitat app profile here. | Per-entrypoint acquisition, hidden app/profile selection, export while disabled, context loss, false delivery, duplicate provider, or exporter failure changing product behavior fails. |
| Effect provisioning substrate | **co-land** `nx run runtime-substrate-effect:test` and the first mounting receipt | Create exactly one `effect@4.0.0-beta.101` `ManagedRuntime` for one `startApp(...)` process from one substrate `Layer.effectContext` lifecycle adapter, force the context before mount, and observe dependency-ordered acquisition plus reverse release owned by that ManagedRuntime. Keep bootgraph order as data and domain services as Habitat services. | A second root `Scope`, second or per-execution ManagedRuntime, acquisition during cold definition, Layer-shaped bootgraph, domain service as an Effect service/Layer node, mount before context force, or release outside the ManagedRuntime lifecycle fails. |
| Telemetry process lifecycle | **co-land at the exact runtime owners** `nx run runtime-process-runtime:test`, `nx run runtime-mounting:test`, and `nx run runtime-observation:test`; task 15.1 audits receipts only | Carry one correlation identity through process access, observation, mounting, owner-classified drain/interruption, and one shared idempotent shutdown while provider release follows native settlement. | Duplicate acquisition/shutdown, early release, false drain completion, lost correlation, observation becoming authority, or delayed task-15.1 implementation fails. |
| App-selected Oclif telemetry | No later than task 12.1, **co-land or consume an existing accepted** `nx run @habitat-ai/cli:acceptance:oclif-native-telemetry` receipt | Select the qualified task-3.1 provider through the real Habitat app/profile and run a real installed command through success, declared failure, cancellation, and cleanup; observe the same trace identity, complete output, native exit semantics, flush, and no surviving handle. | A CLI-owned or placeholder provider, changed exit result, missing output/event, duplicate flush, surviving handle, or deferral to task 15.1 fails. |
| oRPC service execution and server telemetry | **co-land with the server harness** `nx run runtime-harnesses:acceptance:server-native-telemetry` | Send real success, declared failure, defect, auth, and aborted requests through native Elysia/oRPC. Exercise native `.handler` for synchronous and Promise-returning operations and exact `@orpc/experimental-effect@2.0.0-beta.23` implementation-owned `.effect`, installed once in `src/service/impl.ts` through `@habitat-ai/sdk/plugins/server/effect`, for an Effect-backed operation. Prove bridge-owned request signal/Cause/`Effect.runPromiseExit`/Promise reconciliation, app/process-owned `effect/context` plus `effect/wrap`, one correlated lifecycle, release after native settlement, and one oRPC/bridge/Effect module realm without exposing private causes on the wire. Treat `handlerGen` only as the extension's internal underlying mechanism. | Trace discontinuity, cause leakage, wrong native response, exporter interference, early or duplicate release, duplicate module realm, direct vendor bootstrap by a terminal SDK-consuming service, direct Habitat-authored authoring/adapter/operation import, call, wrap, or reimplementation of `handlerGen`, a manual/custom runner, service- or adapter-authored direct `Effect.run*`, `ProcessExecutionRuntime` executing an oRPC service Effect, or request cancellation that leaves work running fails; the official extension's internal `handlerGen` call remains admitted. |
| Inngest/async telemetry | **co-land with the async harness** `nx run runtime-harnesses:acceptance:inngest-native-telemetry` | Execute native `inngest@4.18.0` Serve and Connect with private `FunctionBundle` registration factories that receive the same native client as the selected Serve or Connect harness; keep `WorkflowDispatcher` a separate named consumer/materialization. Exercise exactly `step.run(id, () => ProcessExecutionRuntime...)`; observe native retry/memoization/history. Replay re-enters the native function and `step.run` registration; completed memoized state returns without invoking the callback/runtime, while failed or otherwise un-memoized attempts invoke it anew. Preserve cancellation without interrupting an active step or injecting a synthetic signal, and truthful `presented` / `confirmed` / `dropped` / `unknown` outcomes. Serve owns admitted handler Promises. Connect uses `handleShutdownSignals: []` and retains the owner callback tracker because denied lease renewal deletes `requestLeases` while the callback may continue, native close/reconcile gate on those leases, and `SameThreadStrategy.close` does not call the available `waitForInProgress`; one mounting-owned outer stop invokes/awaits native `close()` once, then waits for callback-tracker zero before provider release. | `effect-inngest`, a public function dispatcher without a named consumer, a second client, resumed Effect fiber, callback invocation for completed memoized state, skipped callback for failed/un-memoized state, synthetic cancellation signal, interrupted active step, duplicate listeners/close, provider release before close and tracker zero, close/flush claimed as delivery or callback proof, history loss, retry reclassification, false drain, or telemetry changing the native outcome fails. |
| Same-app server/async process isolation | At task 13.5, **co-land** built-child acceptance for real Elysia and native Inngest Serve | Start server and async records from one app's finite process catalog with distinct immutable launch identities, leases, ManagedRuntimes, resources, native handles, readiness/liveness, and stops. Stop and restart either child without controlling its sibling; force async required-resource refusal before mount and observe the server remain live; settle each native stop before releasing its process resources. | A process represented as another app/kind/Nx project/supervisor/deployment unit, shared lease or handle, sibling stop/restart coupling, sibling health projection, async mount after missing-resource refusal, server teardown from async failure, or provider release before native stop fails. |
| External MCP companion projection | Conditional task 13.6, only after an independently versioned `mcp-openapi@1.0.0` artifact exists | Attach the external companion as a `server` surface/process projection through public `@habitat-ai/sdk/runtime/harnesses` descriptor plus readiness/health contract; observe its tool and OpenAPI-resource surface with process-local lifecycle. Core runtime release does not wait for this conditional receipt. If unavailable, preserve the generic harness subpath but make no MCP-specific dependency, subpath, adapter, harness, or release claim. | A copied Magic tarball/source, prompts claim, direct official-MCP-SDK implementation in Habitat, MCP role/kind/app/service/provider/lifecycle authority, sibling controller, MCP-specific unavailable-artifact claim, or blocking the core runtime release while the artifact is unavailable fails. |
| Semantic-ledger authority correction | Task 6.3a is the sole active documentation-only oracle with no Nx or source target | Across exactly six active OpenSpec artifacts and no seventh file, make the `app-runtime-realization` requirement the sole exact public TypeScript/API authority and route the other five artifacts to it. Freeze evidence-only `77b6c38e8701b8ac9292ef5676385a5e6e096f2:resources/semantic-ledger/**` / subtree `859b463650e7ad769a56d1b67f328e84584479ef`; two existing-kind owners; six source relations plus the root workspace relation; held provider-neutral behavior and bounded redacted failure; a closed TypeBox input plus frozen normalizing required-output/build-config `RuntimeSchema`; exact no-argument release callback; private plan-independent driver/conformance plus public plan-descriptor/metadata/assignability/coldness proof; exact 17+10/27-file corpus with the product-separation test untouched; exact package/lock/SDK/Nx deltas; `fluree/server:4.1.4`-only compatibility; and task-7.4 private recovery/execution. Preserve all sealed receipts verbatim and leave task 6.4 pending. | A second public API authority; seventh authority file; proposal/stack-cut/canonical/router/source/manifest/SDK or product-separation mutation; rewritten receipt; cherry-pick/merge/restack; 28th task-6.4 file; new kind/version/project/package; public Promise/fetch/driver/factory/helper/port/named input; wrong config normalization or release callback; task-6.4 accessor import/call, witness inspection, or body recovery/invocation; extra/reverse/implicit/cyclic edge; wrong count/inventory; failure bound/redaction breach; Fluree npm metadata or compatibility beyond 4.1.4; live task-7 work; or Rawr policy fails task 6.3a. |
| Semantic ledger and later Rawr workstream | After task 6.3a, **co-land** `nx run @habitat-ai/resource-semantic-ledger:test`, `nx run provider-semantic-ledger-fluree-http:test`, focused TypeScript/Habitat/Nx/SDK proof, and installed-package acceptance; later in Rawr, `nx run @rawr/workstream-frame:test` and `nx run-many -t manifest,test -p @rawr/plugin-workstream` | Re-author exactly the two frozen owners and 27 files against the active requirement's exact API. Prove readonly public shapes, frozen term callables, non-Promise `HabitatEffect` operations, required normalized config output, provider-neutral receipts/history/fork/merge/lines/lost-answer/contention, and private plan-independent driver HTTP mapping/redaction/failure behavior. Provider test proves only public plan descriptor/metadata shape, TypeScript assignability, and import/build coldness; it cannot inspect an accessor/witness or recover a body. Sealed task 6.1 owns generic witness/body-identity proof. Prove the exact no-argument release callback through TypeScript assignability, cold static `/fluree`, finite SDK faces, six source relations, 27-to-29 projects, 49-to-56 typed edges/no cycle, and zero vendor metadata/residue. Task 7.4 alone privately recovers/executes acquire/release and proves `tryPromise` fetch/error behavior, successful acquisition, no-op release, and cleanup. Later Rawr consumes only the released neutral face. | Copied Habitat source/Git ancestry, second API definition, direct Fluree coupling in Rawr, public Promise/driver/fetch/factory/helper/port/named input, stale-head authority, lost proposal guard, refused proposal as failure, collision strategy, resource-to-provider reachability, wrong config normalization, warm import/build, task-6.4 accessor/witness/body access or invocation, public/private inventory drift, unresolved workspace output, vendor diagnostic leak, or premature lifecycle proof fails. |
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
| Predecessor hq-sdk service views and binding mechanics | Task 4.3 `runtime-definition`/SDK cold-shape and TypeScript proof; task 4.5 SDK five-lane proof; task 4.8 `runtime-derivation:acceptance:deployment-cold-plan`; consolidated task 8.2 `runtime-process-runtime:test` | `ProcessView`, `RoleView`, `ServiceBoundary`, author-facing `ServiceBinding`, aliases, public service/contract fields, and the deleted live binding bridge preserve no API or identity. Task 4.3 authors only `ServiceUse<TContract>` plus its private non-enumerable carrier; task 4.8 derives `ServiceBindingPlan` with closed declarative scope/config references; task 8.2 authors `BoundService`, `bindService`, cache-key construction, and `ServiceBindingCache` fresh. |
| Empty bootgraph predecessor | **co-land** `nx run runtime-bootgraph:test` | The fresh owner emits deterministic dependency order and refuses missing/cyclic closure; the reservation shell preserves no implementation. |
| HQ/server/web app roots and UI mount protocol | Later `@habitat-ai/cli:acceptance:oclif-native-runtime`, `runtime-harnesses:acceptance:server`, and `runtime-harnesses:acceptance:web` are fresh-owner acceptance | The predecessor apps and UI protocol are explicitly not preserved. Habitat self-host and owner-local harness behavior is authored fresh without claiming deletion-time equivalence. |
| `packages/dev-node` | Task 2.11 exact source freeze plus package/reader absence; task 12.2 `nx run @habitat-ai/dev-service:test` and `nx run @habitat-ai/cli:acceptance:dev-native` are fresh-owner acceptance | The predecessor package is not transferred. Task 12.2 authors scratch policy in the development service and explicit filesystem, path, process, and clock ports at their final owners, then proves the app-selected Effect Platform Node provider across dry, admitted, and refused operations. Deletion is not behavioral equivalence. |
| Example-todo, hello, hq-ops, config, journal, security, removed root commands, generic test-utils, and lab identities | `nx run habitat:acceptance:product-separation-absence` | The finite absence inventory below contains every deleted project identity, command, declared or executable reader, and condemned state path. These implementations preserve no product capability. |

At the task-2.11 checkpoint, one temporary repository-separation Grit overlay
observed source-spelled static predecessor imports. Task 3.3 retires that
repository-wide package-name blacklist with the final mixed predecessor rather
than preserving it as Habitat law. The final exact-main gate composes selected
closed Habitat law and every project-owned TypeScript program through
`bun run check` with the focused acceptance target's native Nx graph,
structured package/lock/tsconfig, Oclif-manifest, and filesystem observations.
It asserts executable and declared reader absence without claiming arbitrary
lexical absence in uncompiled source or adding a task-local parser. The
inventory is cumulative but
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
- Task 3.3 project-identity extension: `@habitat-ai/rawr-core` is absent from
  the Nx graph, package manifests, lockfile, and TypeScript configuration after
  task 3.3 deletes that mixed package/project and every executable or declared
  reader. Task 2.11 did not claim this then-future absence.
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
  `scripts/chatgpt-corpus-template/**`, and `.habitat/rawr/**`. Task 3.3 adds
  `packages/habitat-sdk/**` and
  `packages/core/{package.json,project.json,src/**,test/**,tsconfig.json,tsconfig.build.json}`.
  The finite
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
- Export/import and reader identities: every predecessor identity above is
  absent from the Nx project/dependency graph, package dependencies and
  exports/imports, lockfile members, TypeScript path mappings, and Oclif
  manifest members, including the predecessor HQ shell/PID readers. Gate C
  already removed `RawrCommand`, `RawrResult`, and their readers; task 2.11
  deletes the finite frozen `findWorkspaceRoot` source/export closure, including
  the `workspace-root` export identity. Project-owned TypeScript checks own
  executable module resolution, Nx owns project edges, and behavior owns
  runtime loader execution. Arbitrary lexical spelling in uncompiled source and
  literal or computed runtime loaders are not falsely modeled as enduring Grit
  relations, and the target introduces no task-local source parser to
  compensate.
- Condemned state paths in disposable fixtures: `$HOME/.rawr/config.json`,
  `<workspace>/rawr.config.ts`, and `<workspace>/.rawr/hq/**`,
  `.rawr/journal/**`, `.rawr/security/**`, and `.rawr/routines/**`. The retained
  content-workspace release input is outside this list.

For `RawrCommand` and `RawrResult`, this zero-model/zero-reader inventory is the
Gate C oracle. Gate A MUST refuse a second public/candidate command model but
MUST NOT claim this predecessor absence before the Gate B registry receipt.

## Task 4.7a Authority Routing

Task 4.7a is sealed as a documentation-only classification gate across exactly
eight documents: `HABITAT_ARCHITECTURE.md` as router,
`HABITAT_RUNTIME_REALIZATION.md` as the sole exact canonical document, and six
active OpenSpec artifacts. Canonical §§11.8, 13.5, 15, 23.1, and 27 own exact
mechanics; the active `app-runtime-realization` requirement and scenarios are
the sole archive-safe OpenSpec acceptance owner. The ledger routes their proof.

## Task 4.7b Authority Routing

Task 4.7b is sealed as the matching documentation-only correction across the
same authority surface. It changes no source or exact task-4.8 corpus and
routes only the execution-identity agreement, per-occurrence lazy async-step
lowering/reuse, and service process/role lifetime normalization proof fixed by
the corresponding capability row.

## Task 4.7c Authority Routing

Task 4.7c is sealed as the third documentation-only correction across the same
authority surface. It changes no source or exact task-4.8 corpus and routes only
the async-only population, future-compatible conditional variant, schema-only
web-surface, and actual-public-entrypoint proof fixed by the corresponding row.

## Task 4.7d Authority Routing

Task 4.7d is sealed as a documentation-only correction before task 4.8
across exactly nine documents. It adds the existing runtime-definition router
to the prior authority surface as the eighth behavior-companion file solely for
ownership documentation, leaves the publication corpus unchanged, and routes
cold provider-selection grammar to flat runtime-definition `profile.ts` with
only an SDK `runtime/profiles` projection. Later owners retain provider Effect
plans and acquisition.

## Task 4.7e Authority Routing

Task 4.7e is sealed as the final documentation-only correction before task 4.8
across exactly the same eight authority documents used by tasks 4.7a-c. It
excludes the runtime-definition router and changes only task 4.8 authority: the
exact publication/assembly corpus additionally includes the existing
runtime-derivation `tsdown.config.ts`, whose sole permitted task-4.8 edit is one
`node:crypto` addition to the exact `deps.onlyImport` array while every other
config option and all other task-4.8 authority remain fixed.

Only after task 4.7e is complete, task 4.8 is the sole active source node under
independent `runtime-derivation@2`; immutable topology-only version 1 remains unchanged and
no fallback or version 3 is admitted. Its capability row routes the exact
behavior and publication/assembly corpora. Compiler corruption defense,
physical config preflight, and live cache construction remain routed to tasks
5.2, 7.2, and 8.2 respectively.

## Task 4.9a Authority Routing

Task 4.9a is sealed as a documentation-only correction across exactly nine
documents: the architecture router, canonical runtime-realization mechanics,
the runtime-definition owner router, and six active OpenSpec artifacts. Its
capability row is the archive-safe acceptance ledger. Task 4.10 is the sole
next implementation node and owns only the existing definition producer and
owner test; task 4.11 later owns only the existing complete-derivation test.
Profile agreement remains downstream because the exact five-field launch
identity has no profile field, and derivation retains every defensive check.

## Task 6.3a Authority Routing

Task 6.3a is the sole active documentation-only correction after sealed task
6.3. It uses exactly the six active OpenSpec artifacts named in its capability
row. The active `app-runtime-realization` requirement and scenarios are the sole
archive-safe acceptance owner; the other five artifacts route ownership,
execution order, exact corpus, and stop conditions. No canonical/system document
or owner router changes, no source node opens, every historical receipt remains
verbatim, and task 6.4 stays pending until this correction lands. The row above
is the failure oracle for both authority widening now and execution widening in
task 6.4.


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
