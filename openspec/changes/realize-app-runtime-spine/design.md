## Context

The reviewed canonical Habitat authority landed on `main` at merge commit
`f920232efbcb10cc4a7220e3b6be4b81a393009d`, and this execution record landed
directly above it at `7457505fc5dc068c1ff80a06ca78f713ebe3a954`.
Canonical `main` is the semantic ledger. Earlier source commits and document
blob identities remain ordinary Git provenance; branch names and transient
restack commits are not alternate authority. The landed authority reconciles the frozen
runtime lineage with the accepted Habitat identity, app and entrypoint law,
TypeBox adaptation, resource/provider public faces, CLI topic topology, and the
repository boundary between Habitat and downstream products. Source
implementation remains closed until the whole-board classification and review
gates in tasks 1.2 and 1.6 settle.

The frozen specification lineage from
`d4acaa7f8d1235ad2e0dbf7675aefc500b50e03d` through
`a1e6e4c6714b293c910858cb850a157ffbc24db6`, its architecture blob
`2961da490b026d39f5458d1174ff8ba0d373b0ab`, and its runtime blob
`c6f475ccc09b1d629ed746f3fbb0cc55baf8b9ee` remain source provenance. They are
not alternate current authority. Current code and the Runtime Realization Lab
define only starting material and proof burden. Older Documents drafts, stale
branch copies, and quarantined M2 plans are provenance, not authority.

User-settled identity and distribution amendments apply without changing the
runtime lifecycle:

- Habitat is the platform, substrate, runtime, and authoring law; it is not a
  peer product next to Rawr;
- `apps/habitat` is the platform's self-hosted realization for non-core
  platform capabilities; Rawr application identity belongs only in its
  independent repository;
- the one public runtime/authoring SDK is `@habitat-ai/sdk`, not `@rawr/sdk`;
- `@habitat-ai/cli` remains the separate public Oclif executable;
- foundational Habitat commands stay with that executable, while a downstream
  CLI consumes the released host and SDK contracts;
- resource/provider shape and selection use the later direct-face law recorded
  in [[authority-amendment]].

The current Nx graph has five `type:app` projects: the Habitat self-host plus
four flattened Rawr process roots for CLI, server, HQ composition, and web.
Those process roots are not peer product identities. `apps/hq` contains a
useful declaration-only manifest and process selection sketch, but entrypoints
still assemble live hosts. `packages/habitat-sdk` publishes one public package from a single source
file and directly constructs Effect-backed dependencies behind a module-global
Promise. `packages/bootgraph` is a reservation shell. `packages/core` remains a
mixed package containing Oclif support, workspace lookup, and the direct
telemetry singleton. There is no production compiler, bootgraph, root managed
runtime, process runtime, adapter owner, or harness owner.

The latest applicable Runtime Realization Lab is commit
`3147acbdcdd916883cee5b081c0868e3d1bf09b9`; the frozen refs all contain its
same `tools/runtime-realization-type-env` subtree
`d35cd11d21abf6831947a57638cbd7de8035bf0d`. Later lab changes update vendors,
tooling, or policy maintenance but add no newer realization experiment. The lab provides
high-value derivation, registry, provider-ordering, rollback, redaction, and
native-boundary tests. Its app/profile shape, compiled plan, managed runtime,
public types, package topology, and Oracle APIs are not the target and will not
be imported as a parallel runtime. The live `runtime-realization-type-env` tool
project is classified `delete`: its frozen commit remains provenance, and later
runtime owners may port admitted algorithms or tests only into the owner-local
implementation they verify.

Task 4.9 audits that exact frozen commit, whole tree
`7fff3eaf6d80a4609dd0d511696212a38133753d`, and subtree against landed
`runtime-derivation@2`. The comparison closes as an authority-only no-op:
task 4.8 already re-authored reference identity/agreement, service-binding
deduplication, surface grouping, workflow inventory, async ownership/laziness,
cold tables, and refs-only portability. No distinct derivation algorithm
remains to port. The lab's `stableJson`/`exec:*` identity, explicit binding
inputs, mutable shapes, public types, Oracle, alternate `deriveRuntimeSpine`,
and route derivation without an admitted carrier are rejected. Provider graph
matching, closure, cycles, and built-in refusal proof remain compiler work in
tasks 5.2 and 5.4 without creating a compiler diagnostic API. Task 4.9 changes
no source, test, project, blueprint, SDK face, public
contract, Oracle, optional interior, version 3, or alternate path; the landed
version-2 owner remains exact.

Task 4.9a closes the definition-to-selection contract before implementation
across exactly nine documents: the architecture router, the sole canonical
runtime-realization document, the runtime-definition owner router, and six
active OpenSpec artifacts. `Entrypoint` is the sole cold selection artifact,
produced synchronously by `defineEntrypoint(...)` from real `AppDefinition`,
`RuntimeProfile`, and `ProcessDefinition` values, the entrypoint id, and exact
five-field `RuntimeLaunchIdentity`. Before return or publication, the launch
identity's app, process, and entrypoint fields agree respectively with
`app.id`, `process.id`, and the entrypoint id. Disagreement throws built-in
`TypeError` before output, external mutation, or authored executable work; no
public error API, error text, or validation order is designed. Profile
agreement stays at the selection-to-derivation edge because launch identity has
no profile field, and complete derivation retains all four defensive checks.

Task 4.10 is therefore the sole next implementation node and changes only
`packages/core/runtime/definition/src/app.ts` and
`packages/core/runtime/definition/test/definition.test.ts`. It preserves the
existing signatures and inference, the returned entrypoint's exact
app/profile/process references, freeze behavior, and SDK export identity. Its
real-constructor tests make producer-local bindings unavailable after handoff,
exercise the three mismatches separately, and prove zero executable work. It
adds no validator, schema, file, project, edge, blueprint, version, export, or
error surface. Task 4.11 later changes only
`packages/core/runtime/derivation/test/complete-derivation.test.ts`: a real
`Entrypoint` plus `profileId` completes after selection source is unavailable,
while each corrupted app/process/entrypoint identity and a profile mismatch is
refused before result with zero Effect-body or loader invocation. Derivation
source and public surfaces remain exact.

Task 5.0 then closes compiler authority without implementation across the two
canonical system documents and these six active OpenSpec artifacts. Canonical
`HABITAT_RUNTIME_REALIZATION` §16 alone owns exact compiler mechanics and closed
TypeBox DTO fields; the active specification owns archive-safe acceptance, and
the other documents route or record that authority. The correction changes no
source, test, project, blueprint, SDK surface, package, runtime behavior, or
`.habitat` current-realization record. Task 5.1 is the sole next source node.

Magic Migration contributes three distinct evidence snapshots. Clean `main` at
`4e2f5d63e964f8299a25172ece4d5d38f6f18655`, tree
`88f0f24e98ba057c43f5aa6e93de4c7a510c0b11`, is the stable blueprint snapshot.
The earlier applicable committed implementation is
`c4d9aa83917c303510f9621494dd9c7e6933587a`, tree
`f062e173a14d787fc43adfa9c7061f605b6074ea`, on local branch
`codex/activate-assistant-led-submission`. Only that committed object is
admitted; its dirty worktree is excluded. The later committed consumer oracle is
`ec7a49c596ca50d5c8ef8ce3f8e3e40cb08c33a7`, whole tree
`2b3c99700d5db8264b7ee42910575e8b877bda3a`. It proves, in Magic's own
temporary realization, that one semantic app can expose separately started
server and async process boundaries with distinct resources, native stops,
health identities, and sibling restart/failure behavior. Its native Inngest
Serve boundary and external `mcp-openapi@1.0.0` process are consumer evidence,
not Habitat implementation authority.

Across those snapshots Habitat admits only generic assertions: the abstract
app/composer/entrypoint/runtime-boundary split, service context lanes and
narrowing, process-local acquisition and release, typed resource errors,
cancellation-preserving oRPC translation, direct resource/provider faces,
required-resource refusal before mount, and independent sibling process
lifecycle. Magic's concrete app/resource catalog, service clients, route and
function inventories, Railway placement, deployment files, copied
`vendor/mcp-openapi/mcp-openapi-1.0.0.tgz`, and dirty deployment evidence are
excluded. The snapshots do not implement the canonical realization pipeline:
provider selection and acquisition remain in product wiring, derivation and
compilation are absent, mounting is direct, and no canonical runtime telemetry
proof exists. These are behavior oracles beneath Habitat law, never source
topology to port wholesale.

Two competing Habitat proposal commits are provenance only. Commit
`203c9c686b0c18644218de5583902bcb180544a8` correctly surfaced immutable
`app@1`, complete `app@2`, process-local launch identity, companion attachment,
and sibling isolation; this change selectively re-authors those assertions and
does not cherry-pick the commit. Commit
`419d5286bf83a41175a001233de244699c1b72da` is rejected as a landing unit because
it removes `app@1` from current resolution and selects an unexercised direct
official-MCP-SDK implementation. Its SHA remains provenance, not source or
authority.

### Authority and destination ledger

The current repository is a mixed migration input, not a valid two-product
topology. A current Rawr name confers no ownership. Before runtime
implementation, every capability is classified from its behavior and invariants
as Habitat platform, proven Rawr product, qualified conformance fixture, or
delete. Retention requires one exact destination and acceptance owner;
ambiguity results in deletion. Rawr moves first to its independent repository,
and Habitat then contains only platform source, its self-host, and qualified
conformance fixtures.

| Current owner or capability | Authority | Qualified destination and disposition |
|---|---|---|
| Mixed `packages/core` project | none as an aggregate | Delete the project identity; `packages/core` remains only the Habitat core namespace. |
| `RawrCommand`, `RawrResult`, and duplicate Habitat output support | Habitat CLI mechanics across the task 2.8 publication barrier | A pre-Gate-A semantic sieve deletes condemned closures with no retained capability. Gate A exposes exactly one public/candidate `HabitatCommand` contract while the private predecessor remains only for unchanged surviving readers; Gate B publishes the accepted SDK/CLI pair; Gate C migrates those readers and deletes both Rawr symbols. Preserve no shim, alias, fallback, or dual public authority. |
| `findWorkspaceRoot` and Habitat-side Rawr workspace-discovery lookups | no retained owner | Delete product-named workspace discovery and bind explicit Habitat workspace input at the CLI boundary. Product-owned Rawr configuration transfers unchanged with its product owner. |
| Generic runtime observation contracts | Habitat core | Define through `@habitat-ai/sdk`; they carry correlation and observation law but select no backend. |
| Current Rawr-named telemetry singleton and signal hooks | adoption evidence, not a merge owner | Hold the mixed telemetry root. Task 3.1 re-authors its path-qualified OpenTelemetry Node resource/provider and singleton retirement into fresh Habitat-owned nodes; it does not select an app. Exact runtime owners receive process/mounting/observation integration, and real app-selected Oclif proof must exist or co-land no later than task 12.1. Task 15.1 audits receipts and retirement only. Do not restack or merge the predecessor root. |
| `packages/habitat-sdk` | Habitat core | Move wholly to `packages/core/sdk` while retaining the sole public package identity `@habitat-ai/sdk`. |
| `packages/hq-sdk` API/workflow declarations and composition | predecessor evidence | Do not move the current self-classifying API builders or Inngest-shaped workflow builders into the public SDK. After the canonical runtime owners exist, implement the accepted topology-specific server/internal faces and host-neutral async faces fresh, reusing only proven generic algorithms. |
| `packages/hq-sdk` service metadata and generic middleware/dependency contracts | Habitat authoring | Move `BaseMetadata`, `ServiceMetadataOf`, `procedureMetadata`, `getProcedureMetadata`, analytics/observability middleware factories, `AnalyticsClient`, and `Logger` to `@habitat-ai/sdk/service` with their retained platform readers. Product policy wrappers do not remain in Habitat. |
| `packages/hq-sdk` service binding declarations and mechanics | predecessor evidence | Delete every predecessor `ProcessView`, `RoleView`, `ServiceBoundary`, author-facing `ServiceBinding`, `BoundService`, `bindService`, and cache mechanic during separation. Author only the cold `ServiceUse<TContract>` relation in `runtime-definition` and the terminal SDK service face; derive `ServiceBindingPlan` in `runtime-derivation`; author the five context lanes in the SDK service owner; and author live binding/cache mechanics fresh in `runtime-process-runtime`. Retain no bridge, alias identity, or predecessor public API. |
| `packages/hq-sdk` concrete embedded adapters | no shared production owner | Delete `FeedbackClient`, `DbPool`, `Sql`, and embedded adapters with the example-todo production projects. Retain only the minimum owner-local fake required by a platform acceptance test. Create no generic adapter or test-helper package. |
| Mixed `packages/hq-sdk` / `@habitat-ai/rawr-hq-sdk` identity | none | Delete only after the preceding named transfers have moved every reader; the deletion node moves no capability. |
| Mixed `packages/runtime-context` / `@rawr/runtime-context` | predecessor evidence | Preserve its five-lane semantics in the canonical specifications, delete the unused package and workflow/support state during separation, then author the canonical service and execution contracts fresh with their qualified runtime owners. |
| `packages/ui-sdk` / `@rawr/ui-sdk` | no retained current owner | Delete the unused `HTMLElement` mount protocol. Author canonical route-projection and web-harness contracts fresh when their first qualified owner lands. |
| `packages/test-utils` / `@rawr/test-utils` | no generic package owner | Move each useful fixture to the test owner whose behavior it proves; move `runCommand` to CLI owner-local test support, then delete the package and project. |
| Standalone TypeBox adapter | Habitat core | Create the exact private `runtime-schema` owner as the bounded separation prerequisite, expose its service contract adaptation through `@habitat-ai/sdk/service/schema`, move every reader, and delete the standalone package/project. |
| `packages/bootgraph` reservation package | no retained current owner | Delete the empty reservation shell during separation. Author the private package-less `packages/core/runtime/bootgraph` owner fresh only when its implementation lands. |
| Compiler, Effect substrate, process runtime, mounting, observation, adapters, and harnesses | Habitat runtime | Keep the exact compiler, substrate/effect, process-runtime, harnesses, mounting, and observation roots as private package-less Nx projects under `packages/core/runtime/*`; keep adapter contracts and implementations owner-local to process-runtime or harnesses rather than creating a generic adapter project; admit no generic `standard` package or directory; ship their exact closure only through `@habitat-ai/sdk`. |
| `services/habitat` / `@habitat-ai/service` | Habitat non-core self-host capability | Rename to `services/catalog` / `@habitat-ai/catalog-service`; realize it through `apps/habitat` and the same service/runtime law used by consumers. |
| `resources/source-inventory` and `resources/rule-evaluation`, including their Git and Grit providers | Habitat non-core reusable capability | Retain under their qualified Habitat resource/provider owners and select them from `apps/habitat`; do not move them into core or Rawr. |
| App composition currently inside `apps/habitat` | Habitat self-host app | Own only Habitat self-host membership, profile, process declarations, and thin entrypoints. |
| `@habitat-ai/cli` package at `apps/habitat` | Habitat foundational executable | Task 2.10a first receives only native `@oclif/plugin-plugins` dependency/configuration and installed roundtrip ownership. Task 11.4 later authors the foundational Oclif loader/harness, private source-bundle contract, final generic Oclif laws, and executable runtime projection. Generator and additional-topic realization remain with their later tasks; the CLI never owns app selection. |
| `scripts/habitat` workspace-policy tool | Habitat tooling | Retain as the workspace-policy tool selected by the self-host, normalize its Nx metadata as a tool rather than an application, and do not let it become a second app, CLI, or self-host authority. |
| `tools/workstream-plugin-pack` | Habitat tooling | Retain as qualified non-public Habitat tooling; it remains outside Rawr and outside the public SDK/runtime package closure. |
| `apps/cli` / `@habitat-ai/rawr` | deletion substrate after bounded native transfer | After Gate C and the Rawr move, task 2.10a transfers only native Oclif plugin management to `@habitat-ai/cli`. Task 2.11 then records the exact pre-deletion commit/tree and deletes the residual app, manifest, and source. Later source-bundle, generic-law, agent, development, generator, and runtime owners re-author their behavior from final contracts; deletion is not their realization proof. |
| `apps/hq`, `apps/server`, and `apps/web` plus their private package identities | no retained application owner in Habitat | Delete every app root and all remaining composition after admitted declarations reach exact owners. Do not create `apps/rawr`, a compatibility app, or an alias in Habitat. Later harness acceptance is fresh-owner proof. |
| `services/agent-plugin-lifecycle` | Habitat platform | Task 2.10 qualifies only the existing service, public-client readers, and owner-local tests. Task 12.1 creates the final agent topic/overlay and selects content-workspace, package-output, native-provider, versioned-content, and telemetry providers through the Habitat self-host. |
| `services/dev`, `packages/dev-node`, and the DevOps CLI topic | deletable predecessors with a later Habitat destination | Task 2.10 performs no development transfer. Task 2.11 freezes and deletes all three predecessor roots/readers; task 12.2 authors the final `@habitat-ai/dev-service`, explicit ports, topic, app-selected Effect Platform Node provider path, and installed behavior, including scoped `dev stack doctor`. It does not revive the deleted root `doctor` command. |
| `services/session-intelligence` and Session Tools commands | proven Rawr product | Import the cohesive service/topic projects into Rawr. Their closed Codex/Claude transcript discovery, parsing, indexing, search, and projection semantics are product behavior, not a provider-neutral Habitat session substrate. |
| `services/chatgpt-corpus` and the ChatGPT corpus topic | proven Rawr product | Import the cohesive service/topic projects into the independent Rawr repository and govern them there. No copy remains in Habitat. |
| `services/hyperresearch-codex` and genuine Hyperresearch topics | proven Rawr product | Import the cohesive service/topic projects into the independent Rawr repository; remove synthetic `codex-slice` and `run-fixture` commands from production membership and retain only indispensable owner-local test fixtures. |
| `services/hq-ops` and the `hq attach/down/restart/status/up` shell/PID implementations | replaced platform predecessor | Delete the service and shell/PID control path. Runtime mounting owns start/stop coordination and runtime observation supplies non-authorizing status projections; no `hq` compatibility topic remains. |
| `services/example-todo` and `plugins/server/api/example-todo` | no production owner | Delete both production projects. Retain only an indispensable owner-local service or API fixture under the behavior it tests. |
| `resources/agent-plugin-package-output`, `resources/content-workspace`, `resources/native-agent-provider`, and `resources/versioned-content`, including their providers | Habitat platform | Task 2.10 qualifies the existing resource/provider owners and conformance only. Task 12.1 later selects them from the Habitat agent-plugin lifecycle profile and proves the installed vertical. |
| `resources/agent-plugin-export-destination` and its provider | no reachable owner | Delete the unreachable predecessor. Agent-plugin export behavior remains valid through the package-output/content lifecycle; it does not authorize an export-destination resource. |
| Native Oclif root `plugins` listing plus `plugins install/link/inspect/update/reset/uninstall` mechanics | Habitat platform | Task 2.10a moves the exact `@oclif/plugin-plugins` dependency/configuration and complete installed roundtrip from `apps/cli` to `@habitat-ai/cli`, using one owner-local prebuilt package fixture, and deletes the obsolete product-bound Oclif-app packet/applications. It adds no agent topic/profile, runtime, private source-bundle contract, or final generic law. |
| `config show` and `config validate` | no retained current owner | Delete the Rawr configuration schema, paths, and commands. A future Habitat app/profile inspection surface must be authored from the canonical app contract rather than renamed from product configuration. |
| `journal tail/search/show` | no retained current owner | Delete the current journal modules and commands: their production writer is already retired, and no Habitat platform invariant consumes the stored records. |
| `security check`, `security report`, and `security posture` | no retained current owner | Delete the Rawr repository policy, `.rawr/security` state, unused gate behavior, and command surfaces. Future Habitat admission or release security requires its own qualified owner and live consumer. |
| `cli command create` and `cli extension create` verified-write mechanics | Habitat platform generators | Delete the predecessor source after freezing it as provenance. Task 11.6 re-authors the two native `@habitat-ai/cli` Nx generator entrypoints and verified-write mechanics without a command topic. Task 12.3 creates and selects `plugins/cli/topics/authoring` / private `@habitat-ai/plugin-authoring` for the two thin command projections. Delete Rawr templates, destinations, names, and command-base dependencies rather than renaming the predecessor classes. |
| Root `doctor`, `hq graph`, `reflect`, `routine check`, `routine snapshot`, `tools export`, `workflow harden`, `security posture`, and `agent plugins create` from Template | no retained owner | Delete the commands and their private helpers/readers. Similar future capabilities require separately accepted Habitat behavior. |
| `hello` command plugin | no retained owner | Delete the production project; keep no example plugin package. |

Pre-runtime disposition is deliberately staged. First, task 2.10 qualifies only
the catalog, the four agent-plugin resource/provider families, and the
agent-plugin lifecycle service/readers/tests at their already existing owners.
Second, task 2.10a transfers native Oclif plugin management to the existing
public CLI, deletes the obsolete product-bound Oclif-app packet/applications,
and records the packed/installed roundtrip receipt. Third, task 2.10b adopts the
exact `0.5.14` bounded foundation-continuation pair and advances only retained
service/resource owners to their immutable acquisition successors. Fourth,
task 2.11 records the
exact pre-deletion source commit and whole tree, deletes `apps/cli`, the
product-bound Oclif-command-plugin packet/applications, and the exact task 2.11
predecessor inventory while explicitly retaining mixed
`@habitat-ai/rawr-core` / `packages/core` for task 3.3, and proves
checkpoint-aware cumulative absence.

The frozen tree is immutable provenance and a source of later owner-local test
oracles, not a source bundle, compatibility implementation, or behavioral
receipt. Task 11.4 creates `plugins/cli/topics/foundation` / private
`@habitat-ai/plugin-foundation`, defines the private CLI source-bundle contract,
and activates the final closed generic Oclif-app/CLI-topic law. Task 12.1 first
creates the agent-plugin topic/overlay/profile and installed vertical; task 12.2
owns the development vertical; task 11.6 owns generator mechanics and task 12.3
owns the selected authoring topic and command projections. Consequently,
task 2.11 deletion cannot satisfy any of those later acceptance gates.

This ledger is also the repository-separation boundary. Habitat core and
platform owners never import product owners. Rawr consumes only exact released
Habitat package interfaces. The independent Rawr move and the Habitat deletion
boundary complete before runtime implementation; there is no period in which a
co-located Rawr app is treated as a reference implementation or migration
fallback.

The system's dominant failure loop is structural: flattened process roots make
entrypoints acquire and mount locally; local acquisition creates more helper
state and shutdown owners; those helpers make the process roots appear like
independent apps. The balancing intervention is the canonical artifact chain:
each phase emits one qualified downstream artifact, positive Habitat law seals
the owner, and native acceptance proves that an instance cannot bypass it.

## Goals / Non-Goals

**Goals:**

- Realize the canonical seven-phase runtime once, as generic platform kinds.
- Preserve byte-identical `app@1` and add complete, independently resolvable
  `app@2` as its future successor. Keep one semantic app/Nx project around one
  finite cold `ProcessCatalog`, with each thin entrypoint module producing one
  `Entrypoint` through `defineEntrypoint(...)`, thereby selecting one process
  record, then passing that exact artifact to its sole future `startApp(...)`
  call without reconstruction.
- Make app, profile, compiler, provider plan, bootgraph data, process runtime,
  adapter, harness, and observation ownership mechanically visible and closed.
- Give each app/process one Effect `Context`, resource lifetime, policy, and
  telemetry wrapper through the public `effect/context` and `effect/wrap`
  faces. Preserve the selected native bridge's execution authority:
  `ProcessExecutionRuntime`, if retained for other invocation classes, never
  executes oRPC service Effects.
- Give each started process exactly one `effect@4.0.0-beta.101`
  `ManagedRuntime`, created from one substrate `Layer.effectContext` lifecycle
  adapter and forced before mount. Let that managed runtime own its scopes;
  never turn boot order or domain services into a Layer graph.
- Make every `startApp(...)` invocation consume one exact `Entrypoint` artifact
  without reconstructing selection or identity and remain process-local: it
  owns only one lease, runtime, resource closure, native-handle set, immutable
  launch identity carried by that artifact, and stop, with no sibling control
  or health aggregation.
- Realize the Habitat self-host on the substrate after all downstream product
  source and flattened process-app owners have left the repository.
- Keep `@habitat-ai/sdk` as the sole public runtime and authoring distribution
  and `@habitat-ai/cli` as the separate public Oclif executable package.
- Ship the settled generic service kind as constructible `service@1` law in the
  SDK Habitat pack so downstream repositories never duplicate generic service
  topology.
- Supply the exact production runtime checkpoint required by native telemetry
  and the research service without coupling either consumer into this change.

**Non-Goals:**

- Reopening the canonical ontology, app/runtime lifecycle, or settled service
  semantics.
- Implementing deployment placement, authentication, persistent catalog
  storage, generic config precedence, every reusable platform provider, or every future
  harness.
- Making a process an app, blueprint kind, child Nx project, supervisor,
  deployment unit, or whole-app controller.
- Authoring an MCP SDK face or direct official-MCP-SDK server in Habitat. MCP is
  a `server` surface/process projection. Conditional acceptance of an external
  `mcp-openapi@1.0.0` companion waits for an independent versioned artifact and
  makes no prompts claim.
- Moving product/domain behavior into runtime, adapters, or harnesses.
- Publishing Rawr, internal runtime owners, resources, services, or plugins as
  a public package cohort.
- Keeping compatibility apps, aliases, fallbacks, a second runtime, or the lab
  package after cutover.
- Making telemetry, PostHog, Langfuse, HyperDX, or EVLog a prerequisite for the
  generic runtime spine. Runtime observation contracts are required; task 3.1
  owns the qualified telemetry resource/provider, the exact runtime owners own
  lifecycle integration, and task 12.1 owns app-profile selection plus the
  installed Oclif telemetry receipt. The mixed source root remains evidence
  until those exact destinations pass and task 15.1 audits its retirement.

## Decisions

### Treat the runtime as an artifact chain of constitutional kinds

The implementation follows one direction:

```text
definition
  -> selection
  -> derivation
  -> compilation
  -> provisioning
  -> mounting
  -> observation
```

The app selects. Habitat core derives and the SDK exposes. The compiler validates and plans. Bootgraph
orders cold provider plans. The Effect kernel acquires one process scope. The
process runtime binds and assembles execution, and its idempotent stop handle
releases process-owned resources. The execution runtime invokes. Adapters lower
compiled surfaces. Harnesses mount native payloads and own their native stop
behavior. Runtime mounting owns cross-owner finalization for that one process;
it has no sibling or whole-app control. Runtime observation
projects bounded read models of that outcome without becoming product or
execution authority.

The migration is narrowed by selected instances, not by deleting phases. The
first vertical is the existing `habitat resolve` command through every phase;
it already exercises the Habitat catalog service plus selected source-inventory
and rule-evaluation resource providers. The second vertical is the read-only
`habitat agent plugins status` command through the same substrate. Genuine Rawr
commands, such as corpus, Hyperresearch, or session commands, are accepted only by the
Rawr repository's owner-local OpenSpec after separation and released Habitat
consumption. Server, Inngest, and web harnesses are added only after the generic
chain and Oclif boundary are sealed and only with qualified Habitat-owned
conformance fixtures.

Alternative considered: one process bootstrap that accepts selected config and
acquires resources directly. Rejected because it fuses compilation,
provisioning, process runtime, and harness authority and recreates the current
entrypoint-local model under a cleaner name.

### Preserve one public SDK over private runtime Nx owners

`packages/core` is a namespace root, not a package or Nx project. The public
SDK project and package lives at `packages/core/sdk` and remains named
`@habitat-ai/sdk`. Runtime implementation owners remain its private sibling
roots under `packages/core/runtime/*`:

```text
packages/core/
  sdk/
    package.json
    project.json
    src/
      app/
      effect/
      execution/
      service/
      plugins/
      runtime/
  runtime/
    schema/
    definition/
    derivation/
    compiler/
    bootgraph/
    substrate/effect/
    process-runtime/
    harnesses/
    observation/
    mounting/
```

The SDK source families above are terminal public entry modules from the
reviewed parent, not upstream implementation owners. Habitat blueprints own
their exact private filenames and interiors. The closed private project
inventory is:

| Exact project root | Nx-only project ID | Direct private dependencies at the completed graph |
|---|---|---|
| `packages/core/runtime/schema` | `runtime-schema` | none |
| `packages/core/runtime/definition` | `runtime-definition` | `runtime-schema` |
| `packages/core/runtime/derivation` | `runtime-derivation` | `runtime-schema`, `runtime-definition` |
| `packages/core/runtime/compiler` | `runtime-compiler` | `runtime-definition`, `runtime-derivation` |
| `packages/core/runtime/bootgraph` | `runtime-bootgraph` | `runtime-compiler` |
| `packages/core/runtime/substrate/effect` | `runtime-substrate-effect` | `runtime-definition`, `runtime-compiler`, `runtime-bootgraph` |
| `packages/core/runtime/process-runtime` | `runtime-process-runtime` | `runtime-derivation`, `runtime-compiler`, `runtime-substrate-effect` |
| `packages/core/runtime/harnesses` | `runtime-harnesses` | `runtime-definition`, `runtime-compiler`, `runtime-process-runtime` |
| `packages/core/runtime/observation` | `runtime-observation` | `runtime-definition` |
| `packages/core/runtime/mounting` | `runtime-mounting` | `runtime-definition`, `runtime-process-runtime`, `runtime-harnesses` |

The IDs in this table are unscoped Nx scheduler identities only. They MUST NOT
appear as package names, workspace links, import specifiers, registry
identities, or release members. Each root has `project.json` and its
blueprint-qualified source and tests, but no `package.json`. Dependency arrows
are consumer to dependency and the table admits no other private edge. The one
terminal public project remains
`@habitat-ai/sdk` at `packages/core/sdk`. A direct assembly edge may co-land only
with its real public projection or terminal composition consumer. The ordinary
delivery tasks authorize the exact edges
`@habitat-ai/sdk -> runtime-schema`, `runtime-definition`,
`runtime-derivation`,
`runtime-substrate-effect`, `runtime-process-runtime`, `runtime-harnesses`,
`runtime-observation`, and `runtime-mounting`. Real source/build references, not
publication metadata or an `implicitDependencies` substitute, must establish
those edges. No private runtime project imports the SDK facade.

That list does not authorize an early compiler or bootgraph edge. The first
`runtime-compiler@1` node has only its real definition and derivation imports;
the first `runtime-bootgraph@1` node has only its real compiler import. Neither
has a public face or early SDK source/build edge. Task 10.6's later terminal SDK
composition source establishes the final direct edges
`@habitat-ai/sdk -> runtime-compiler` and
`@habitat-ai/sdk -> runtime-bootgraph` only when its real
`compileRuntimePlan(...)` and `orderBootgraph(...)` imports, calls, and consumer
proof co-land. Runtime mounting gets neither edge, and transitive
process-runtime reachability is not a substitute.

The final SDK edge to `runtime-derivation` is an explicit seven-step delivery.
Task 4.7 creates the private owner, its two private edges, immutable
topology-only `runtime-derivation@1`, and bounded normalized topology with no SDK
edge or export. Task 4.7a closes the exact eight-document authority scope:
`HABITAT_ARCHITECTURE.md` routes, `HABITAT_RUNTIME_REALIZATION.md` is the sole
exact canonical document, and the six active OpenSpec artifacts preserve the
archive-safe acceptance owner without source work. Task 4.7b closes the matching
execution-identity, async-step-lowering, and service-resource-normalization
correction across that same authority surface, also without source work. Task
4.7c closes the matching task-4.8 population and public-entrypoint acceptance
correction across the same surface without source work. Task 4.7d adds the
existing runtime-definition router as the eighth behavior-companion file solely
for ownership documentation across its sealed nine-document authority surface.
Task 4.7e closes the remaining build-authority gap across the same exact eight
authority documents used by tasks 4.7a-c, excluding that router, without
implementation work. Only then does task 4.8 select independent complete
`runtime-derivation@2` with no
inheritance or fallback and alone add
`@habitat-ai/sdk -> runtime-derivation` when the complete derivation surface
becomes public through exactly `@habitat-ai/sdk/runtime/derivation`. The
completed graph remains exact; the phased landing does not authorize an empty
SDK shell or a second facade.

The SDK composition root supplies the definition-owned observation port
implementation to `runtime-mounting`. Mounting publishes through that port and
does not import `runtime-observation`; the SDK independently assembles both
private owners.

The closed runtime graph is distinct from three qualified integration pairs.
The SDK may also assemble only telemetry/OpenTelemetry Node,
semantic-ledger/Fluree HTTP, and temporal-inquiry/Fluree HTTP through their
named optional subpaths. Those source-owned resource/provider projects remain
private, do not join the release group, and leave no workspace dependency in
packed output. No other non-runtime SDK assembly edge is admitted.

There is no `standard` root or Nx project. A generic runtime package would hide
ownership rather than name a capability; reusable private code stays with the
qualified runtime owner whose invariant it serves.

`runtime-definition` remains cold. It owns app/profile/process-catalog/
entrypoint declarations, immutable `RuntimeLaunchIdentity` with exactly
`{ app, process, entrypoint, deployment, source }`, the TypeBox
`RuntimeObservationRecord` accepted from upstream owners, and the narrow
non-authorizing `RuntimeObservationPort` earlier phases can consume. Immutable
`app@1` remains byte-identical; complete `app@2` is a separate independently
resolvable future successor with no inherited file or fallback. One semantic
app/Nx project owns one finite cold process catalog and thin entrypoint modules.
Each module produces one `Entrypoint` through `defineEntrypoint(...)`, thereby
selecting one catalog record, then passes that exact artifact to its sole future
`startApp(...)` call without reconstructing selection or identity. Catalog
records are not apps, kinds, child projects, supervisors, deployment units, or
live registries.
`runtime-observation` implements that port and projects read models only.
`runtime-mounting` owns the live `startApp(...)` path, harness invocation, and
process-local cross-owner finalization. It consumes the exact `Entrypoint`
artifact and its carried frozen identity without reconstructing either. Each
invocation owns only its process lease, managed runtime, resources, native
handles, frozen identity, and stop; a sibling invocation remains independent.
The terminal SDK exposes
`startApp(...)`, but no
upstream private owner imports the SDK facade, mounting owner, or observation
implementation. There is no whole-app handle, readiness aggregate, supervisor,
deployment controller, or cross-process stop/restart authority.

There is no `adapters` root or generic adapter Nx project. The generic
`SurfaceAdapter` contract and coordination stay owner-local inside
`runtime-process-runtime`; native lowering implementations stay with their
selected owner inside `runtime-process-runtime` or `runtime-harnesses`. The
harness project consumes the bounded process-runtime ports and adapter-lowered
payloads without creating a reverse project edge.

`runtime-harnesses` owns the generic harness contract, mount input,
owner-local native handle, and native stop behavior, plus SDK-distributed
non-CLI native realizations. `runtime-mounting` invokes a selected harness and
owns the resulting `StartedHarness` record. The foundational Oclif harness
is implemented and distributed by `@habitat-ai/cli`, which consumes the exact
SDK harness contract and process-runtime ports. The SDK's CLI subpaths own
authoring and lowering contracts, not a second Oclif loader or harness.
`@habitat-ai/cli/host` is the one import-safe consumer entrypoint for downstream
private Oclif apps. It accepts the selected app definition and native process
inputs, supplies the loader and harness, and selects no topic. Habitat and
downstream app definitions therefore share released host mechanics without
sharing command membership or executable identity.

The SDK re-exports the import-safe `HarnessDescriptor`, `HarnessMountInput`,
read-only required-resource readiness gate, `HarnessReportSink`,
`HarnessHealthReport`, and `NativeHarnessHandle` interface with idempotent stop
and distinct optional liveness/readiness probes through
`@habitat-ai/sdk/runtime/harnesses`. Private `StartedHarness` remains
mounting-owned. No live handle value, accessor, or registry is public. Required acquisition fails before
mount. Liveness claims only process/native-host response; readiness fails closed
over every required resource and required selected harness contribution.
Missing, negative, rejected, or timed-out evidence remains not ready, and logs
or observations cannot promote it. This public contract admits external
companions without creating a controller or importing vendor semantics into
Habitat.

MCP is only a `server` surface and process projection. It is not a role, kind,
app, service, provider, deployment unit, or lifecycle owner. Habitat adds no MCP
authoring face or direct official-MCP-SDK implementation. The Magic oracle's
copied `mcp-openapi@1.0.0` tarball proves consumer demand only. Task 13.6 may
attach that external companion through the public contract only after the same
version exists as an independently versioned ordinary artifact, and acceptance
may claim its real tool and OpenAPI-resource projection but no prompts surface.

The repository keeps one scheduler vocabulary rather than manufacturing a
private-runtime variant. `habitat:lint` remains the sole workspace-owned
cacheable Biome task. Its input set includes every source format it checks plus
`.editorconfig`, `biome.json`, the relevant package/toolchain metadata, and any
other file the command reads. Project `check` remains non-cacheable `nx:noop`
and inherits the shared dependency set: `habitat:lint`, owner `typecheck`,
optional qualified `verify`, generated `check:policy`, and `^check`. It does not
hide `test` or `build`; the root `ci` and `ci:affected` graphs schedule
`build,check,test` explicitly.

Private runtime owners define cacheable `typecheck`, `test`, and `build` through
the shared target defaults when their first implementation lands. The public
SDK inherits the same check/type/build contract and adds only its packed-subpath
verification. App projects additionally own their native manifest and
`acceptance:<capability>` targets. Habitat owns
`acceptance:oclif-native-runtime`, installed-package acceptance, and qualified
platform harness acceptance. A downstream repository owns its own product
acceptance after installing released Habitat packages. No project-specific
synonym may replace the shared target name.

The generated owner-local `check:policy` target is a non-cacheable `nx:noop`
composition target with a deterministic dependency list of its inferred policy
leaves. Each cacheable application or compatibility leaf alone lists its exact
closed blueprint, rule, owner-root, toolchain, environment, and inspected-corpus
inputs and declares `outputs: []`; a broad workspace glob is not an accepted
stand-in. Project creation, exact owner-internal direct edges, and target
realization land atomically with the owner's first conforming implementation.
An SDK assembly edge lands atomically with that owner's first public SDK
projection, never before it. For `runtime-derivation`, those are deliberately
different nodes: task 4.7 is private topology, task 4.7a is the authority-only
complete-derivation-contract and binding-source gate, task 4.7b is the matching
authority-only identity/lowering/resource-normalization correction, task 4.7c
is the authority-only population/public-entrypoint correction, task 4.7d is the
authority-only definition-router ownership correction, task 4.7e is the
authority-only crypto-build correction, and task 4.8 is the first public
projection. Acceptance runs each new owner target once cold and once unchanged
to prove cached leaf replays, then changes one declared relevant input and
proves only the affected leaf work invalidates. The composition target never
executes a Habitat command, and the underlying command of any restored cacheable
leaf must not execute.

The catalog observes one Git-visible source inventory per selected owner check.
Version-2 compatibility coverage and version-3 root patterns filter that shared
inventory before any final canonical-file observation; neither may recursively
glob the live repository. This makes ignored local evidence inert and keeps
subject acquisition proportional to repository authority rather than to
filesystem residue. Version-3 root-pattern subject and command-line bounds stay
specific to that authoring surface; version-2 compatibility coverage retains
the source-inventory contract's repository bound until a separately admitted
chunking contract exists.

`schema`, `definition`, and `derivation` are the upstream private owners
consumed by later runtime phases. The terminal SDK exposes only the stable
public subpaths and assembles the reachable runtime closure into the SDK package
output. The CLI initializer installs one exact paired SDK package and its
ordinary external dependencies, never an internal runtime cohort or workspace
link.

Artifact and dependency flow follows the canonical producer/consumer chain:

```text
core schema, definition, selection, and derivation
  -> runtime compiler
  -> runtime bootgraph and Effect substrate
  -> process runtime
  -> owner-local adapters and harnesses
  -> native host
```

Each private owner consumes only qualified upstream artifacts and never imports
the terminal public SDK facade to reconstruct earlier decisions. Nx owns
project and build edges and the SDK's exact assembly closure; Habitat, Grit, and TypeScript
own closed source topology, local authoring forms, and capability visibility.
Other than the bounded non-live `runtime-schema` adaptation required for the
initial product transfer, no private runtime project lands before independent
Rawr separation and the Habitat semantic sieve have passed exact-main gates. `RawrCommand`,
`RawrResult`, Rawr workspace discovery, all downstream product source, and all
dead or mixed owners are absent. Fresh Habitat-owned telemetry nodes have
re-authored the qualified resource/provider and singleton retirement from the
held source evidence, and the remaining empty mixed-core package/project
identity is removed.
The predecessor `packages/habitat-sdk` path then moves atomically to
`packages/core/sdk`, leaving `packages/core` as a namespace rather than a
package. No alias or compatibility facade survives.
Task 3.4 then removes only the ownerless root Elysia and Inngest declarations
and proves the current packed SDK/CLI public artifacts remain cold and
vendor-isolated. That cleanup adds no SDK metadata or export, loader, runtime
project, native host implementation, or blueprint.

The exact public export contract is:

```text
@habitat-ai/sdk
@habitat-ai/sdk/app
@habitat-ai/sdk/effect
@habitat-ai/sdk/effect/context
@habitat-ai/sdk/effect/wrap
@habitat-ai/sdk/execution
@habitat-ai/sdk/service
@habitat-ai/sdk/service/schema
@habitat-ai/sdk/plugins/server
@habitat-ai/sdk/plugins/server/effect
@habitat-ai/sdk/plugins/async
@habitat-ai/sdk/plugins/async/effect
@habitat-ai/sdk/plugins/cli
@habitat-ai/sdk/plugins/cli/effect
@habitat-ai/sdk/plugins/cli/schema
@habitat-ai/sdk/plugins/web
@habitat-ai/sdk/plugins/web/effect
@habitat-ai/sdk/plugins/agent
@habitat-ai/sdk/plugins/agent/effect
@habitat-ai/sdk/plugins/agent/schema
@habitat-ai/sdk/plugins/desktop
@habitat-ai/sdk/plugins/desktop/effect
@habitat-ai/sdk/runtime/resources
@habitat-ai/sdk/runtime/providers
@habitat-ai/sdk/runtime/providers/effect
@habitat-ai/sdk/runtime/profiles
@habitat-ai/sdk/runtime/derivation
@habitat-ai/sdk/runtime/harnesses
@habitat-ai/sdk/runtime/observation
@habitat-ai/sdk/runtime/schema
@habitat-ai/sdk/resources/semantic-ledger
@habitat-ai/sdk/resources/semantic-ledger/fluree
@habitat-ai/sdk/resources/temporal-inquiry
@habitat-ai/sdk/resources/temporal-inquiry/fluree
@habitat-ai/sdk/telemetry
@habitat-ai/sdk/habitat-pack.json
@habitat-ai/sdk/blueprints/*
@habitat-ai/sdk/package.json
```

The root export is a terminal core-authoring facade, not an aggregate vendor
barrel. The data exports retain the installed Habitat pack and blueprint
contract already consumed by workspaces.

The two resource families above remain source-owned by their qualified Habitat
resource/provider projects. Their provider-neutral contracts assemble into the
SDK's resource subpaths. Their Fluree providers assemble only into optional
integration subpaths behind conditional imports and optional peer metadata
when each named integration owner lands; task 3.4 adds none of that metadata or
loading machinery. They are not additional release members or eagerly loaded
SDK dependencies.

Native host vendors are optional peer dependencies supplied by the selected
application. Each vendor import lives behind its owner-local conditional dynamic
import boundary and is reached only from that selected subpath. This is a
later owner-local realization rule, not a task-3.4 output: Elysia optional peer
metadata and its conditional import co-land with the first conforming
`runtime-harnesses` owner in task 13.1, while Inngest metadata and its import
co-land in the task 13.3/13.4 owner sequence. Task 4.2's async face remains cold
and host-neutral: it emits only declarations plus stable identity/descriptor
references for task 13 lowering, with no `FunctionBundle`, registration
factory, native client, adapter, native function, loader, or harness. Native
Inngest 4.18 source is future vendor evidence, not a task-4.2 installed
dependency. The installed Habitat CLI must not install, load, or declare
direct dependencies on server- or async-only vendor packages. Oclif remains a
direct `@habitat-ai/cli` dependency and native owner rather than an SDK peer;
OpenTelemetry, Effect, and oRPC retain their current substrate or mechanism
dependencies. Registry acceptance inspects packed metadata, static
reachability, and real loading for each public subpath and selected process
rather than accepting one aggregate bundle smoke. Structural rejection uses
the existing real TypeBox and OpenTelemetry decode boundaries during task 3.4
and the selected host owner's real decoder when that owner lands, never a
schema walker or whole-plan snapshot.

The existing TypeBox adapter becomes the core runtime's one canonical private
schema adapter under `packages/core/runtime/schema`.
`RuntimeSchema.fromTypeBox(...)` adapts runtime-carried data, while the terminal
SDK `service/schema` entry projects TypeBox contracts to oRPC-compatible service
boundaries without reimplementing validation or creating another schema
grammar. Habitat blueprints own the adapter's private filename. Current service
authoring, resource descriptors, providers, and plugin law move only after
their canonical destination owns them. A compatibility re-export is not an
accepted steady state.

Alternative considered: keep every runtime phase inside the current single
`src/index.ts`. Rejected because one publication unit does not require one
source owner; collapsing the internal kinds would remove the same boundaries
the platform is meant to guarantee.

### Use TypeBox where runtime data crosses a structural boundary

TypeBox backs `RuntimeSchema` and every data contract that must be decoded,
validated, redacted, or serialized across an owner boundary; its TypeScript
type derives from the schema. `RuntimeSchema.fromTypeBox(...)` adapts the
TypeBox value into runtime use; the SDK does not invent parallel structural
builders such as `RuntimeSchema.struct(...)` or `RuntimeSchema.string(...)`.
Semantic functions may canonicalize order,
calculate identity, and enforce cross-field invariants. They do not reparse
closed object shape. Operational ports, Effect values, callbacks, provider
descriptor closures, runtime handles, and lifecycle methods remain owner-local
TypeScript interfaces whose data inputs and results use the structural schemas.
No fake schema represents an Effect or live handle. The SDK's admitted Standard
Schema adapter emits message-only issues for the current TypeBox version because
raw `instancePath` cannot reconstruct an unambiguous path.

Alternative considered: preserve lab interfaces and handwritten validators,
then migrate them after behavior is green. Rejected because that creates a
second schema authority and makes the temporary shape an integration contract.

### Select direct resource and provider faces through the SDK

The later landed resource/provider law in [[authority-amendment]] refines the
frozen examples. A resource package owns one provider-neutral root face.
Concrete providers are nested projects with direct public faces; a resource
face never imports a provider implementation. Provider-specific config schema
and decoding stay with the provider. Habitat blueprints own the concrete
filename and export-map shape for those public faces.

An app profile imports the selected resource and provider faces and calls the
core definition operation exposed as SDK
`providerSelection({ resource, provider, config })`. A resource-owned
selector wrapper or provider catalog would create a second app-selection path
and is not admitted. Derivation owns authored missing or ambiguous selection as
fatal built-in `TypeError`. The compiler also throws built-in `TypeError` before
any result for normalized-handoff inconsistency, provider dependency closure or
cycles, or another invalid compiler input. It exposes no compiler finding,
diagnostic, or public error API. Later owners consume the compiler result rather
than its private helpers.

### Derive first; compile only normalized facts

The private core derivation owner lands in two complete increments. Task 4.7
creates the package-less owner and selected closed `runtime-derivation@1` law
with only its schema and definition edges. Its sole operation is private
`deriveNormalizedRuntimeTopology({ entrypoint, profileId })`, and its sole
artifact is `NormalizedRuntimeTopology`. `NormalizedPluginIdentity` contains
exactly `{ pluginId, instance? }`; `NormalizedSurfaceRequirement` contains
exactly `{ plugin, role, surface, capability }`; and
`NormalizedResourceRequirementIdentity` contains exactly
`{ resourceId, lifetime, role?, instance? }`, where `lifetime` is effective and
`role` exists only when authored. The topology recursively copies and freezes
the selected entrypoint's exact `RuntimeLaunchIdentity`, carries exact
`profileId`, takes roles only from the selected process, and derives plugin,
surface, and resource facts only from the selected app's plugins.
`resourceRequirementIdentities` is the sorted unique projection of resource
values from accepted `plugin.resource` edges. Distinct plugin identities may
demand the same resource identity, which appears once in that projection; only
a duplicate exact `plugin.resource` edge is refused.

The typed edge union is exact: `app.plugin` carries `{ appId, plugin }`;
`plugin.resource` carries `{ plugin, resource }`; `service.service` carries
`{ serviceId, dependencyServiceId }`; `service.resource` carries
`{ serviceId, resourceId }`; and `service.semantic` carries
`{ serviceId, adapterId }`. Service facts are followed transitively only from
definitions reachable through the private `ServiceUse` carriers. There is no
`plugin.service` edge. The `service.service` direction is dependent to
dependency, and a self-loop is a cycle. Derivation refuses mismatched selected
app/process/entrypoint or profile identity, duplicate plugin identities, role
literals, surface tuples, exact edge tuples, and every service cycle before
emission. Shared resource demand across distinct plugins is admitted.
`identity.deployment` and `identity.source` remain opaque values copied exactly
rather than re-derived.

Task-4.7 service-cycle acceptance proves only order-independent refusal for
self-loops and longer cycles. It does not prescribe an error class, select or
expose a cycle path, order diagnostics, or define a finding payload, and task
4.7 adds no error API.

All nested output values are fresh recursive copies and recursively frozen.
Every tuple-bearing collection is lexicographically ordered by the complete
tuple using ECMAScript code-unit order, with a missing optional field compared
as the empty string while remaining absent in output. Equivalent authored order
therefore yields deeply equal topology, while the copied launch identity remains
nonidentical to the input reference. The owner-local closed TypeBox schemas set
`additionalProperties: false` at every object and are adapted through
`RuntimeSchema.fromTypeBox(...)`; this real source/build reference establishes
the schema edge while the selected declaration types establish the definition
edge. Neither may be simulated through `implicitDependencies`; surplus fields
and unknown edge variants are rejected.

The checked-in task-4.7 root contains exactly `AGENTS.md`, `habitat.toml`,
`project.json`, `src/`, `test/`, `tsconfig.json`, `tsconfig.test.json`, and
`tsdown.config.ts`. Its source closure is only `src/index.ts` and
`src/normalized-runtime-topology.ts`; its proof closure is only
`test/normalized-topology.test.ts` and `test/nx-cache.test.ts`. Acceptance also
proves that preserved cold web loaders and Effect bodies are never invoked.
This increment has no optional interior, `package.json`, SDK edge or export,
complete graph, reference/table family, or portable plan. The selected
topology-only `runtime-derivation@1` law is immutable; complete derivation does
not edit, inherit from, or fall back to it.

Task 4.7a closes the design decision without source work. Canonical
`HABITAT_RUNTIME_REALIZATION` §§11.8, 13.5, 15, 23.1, and 27 are the sole exact
mechanics route; the active `app-runtime-realization` requirement and scenarios
are the sole archive-safe acceptance owner. This design records only ownership
and phase boundaries.

Task 4.7b closes the three remaining complete-derivation joins through that
same eight-document authority surface, again without implementation or source
work and without changing the exact task-4.8 corpora. It fixes canonical
RFC 8785/SHA-256 execution-descriptor identity and descriptor/ref/recomputation
agreement; per-occurrence lazy async-step lowering to derived frozen
`execution.effect` descriptors, including definition-owned `Effect.gen` for a
generator and distinct ids when one authored step is reused under distinct
parents; and deterministic service-owned `resourceDep` normalization from the
service id, dependency local name, resource default lifetime, and binding role
only for role lifetime. It leaves authored async descriptors and effects in
definition by reference, leaves plugin/provider reasons authored, and changes
no `packages/core/runtime/definition/src/execution.ts`.

Task 4.7c closes the population and acceptance join through the same exact
eight-document authority surface, again without implementation, source, or any
task-4.8 corpus change. Task 4.8 derives and populates only async-step
operational descriptors. The exact five-boundary-variant ref/table contracts
remain future-compatible, but non-async variants require later separately
admitted lane-owned carriers and lowering. `plugin.web-surface` remains schema
vocabulary only, not a task-4.8 entry or an early web Effect face. Acceptance
must call the actual public SDK export with an authored async occurrence and
lazy web loader; arbitrary properties, project facts, casts, synthesized refs,
and direct table fixtures cannot prove the entrypoint or its population.

Task 4.7d closes the remaining ownership-routing gap without implementation,
source, test, or publication work. Its exact nine-document authority surface
adds `packages/core/runtime/definition/AGENTS.md` to the prior eight documents
and admits that existing router as the eighth behavior-companion file solely
for documentation. It records flat runtime-definition `profile.ts` as owner of
cold `providerSelection(...)` grammar, projected only through
`@habitat-ai/sdk/runtime/profiles`, while provider Effect plans and acquisition
remain later runtime responsibilities. The separate
publication/assembly corpus is unchanged.

Task 4.7e closes the build-authority gap without implementation or config work
across exactly the same eight authority documents used by tasks 4.7a-c; it
excludes the runtime-definition router. It adds the existing
`packages/core/runtime/derivation/tsdown.config.ts` to task 4.8's exact
publication/assembly corpus. Task 4.8 may add only `node:crypto` exactly once to
that config's `deps.onlyImport`, producing exactly
`["@orpc/contract", "@orpc/server", "@standard-schema/spec", "node:crypto", "typebox"]`
while retaining `platform: "neutral"`, every prior entry, and every other
option. Synchronous RFC 8785/SHA-256 identity uses Node's native `createHash`;
pinned tsdown 0.22.14's neutral-platform `onlyImport` audit otherwise rejects
the emitted builtin. No platform change, hand-rolled digest, Bun-only crypto, async
WebCrypto, dependency, package, Nx, public-surface, or source-semantic change is
admitted. The source/test and eight-file behavior-companion corpora, every
other publication file, immutable v1, counts, and exports remain fixed.

Only after task 4.7e is sealed, task 4.8 alone creates the exact independent
`.habitat/blueprints/runtime-derivation/versions/2/{blueprint.toml,structure.toml}`
closure, selects version 2 in the existing derivation `habitat.toml`, preserves
the exact eight-file behavior companion corpus, and uses the separate exact
publication/assembly corpus named by the active requirement. It exposes the
sole derivation face while leaving immutable topology-only version 1 untouched,
with no fallback or version 3. It admits no new `runtime-definition` file,
project, blueprint, or version and no other kind, version, or project.
Derivation owns cold source/ref
normalization, binding ids/equal-diamond deduplication, and authored
missing/ambiguous provider-selection refusal with zero source I/O, decode,
acquisition, or cache construction. The compiler owns normalized-handoff
consistency and dependency closure/cycles; provisioning owns all-ref config
preflight before acquisition; process runtime owns live cache construction and
reuse. The owner-specific design sections carry those decisions.

### Compile one closed cold handoff without a public compiler face

Task 5.0 fixes the compiler container before source work. Its exact authority
corpus is the two canonical system documents plus the six active OpenSpec
artifacts. `HABITAT_RUNTIME_REALIZATION` §16 is the sole exact mechanics and
closed-TypeBox-DTO owner; the active specification owns archive-safe
acceptance. This design intentionally does not reproduce the schema field block.

The private package-less `runtime-compiler@1` owner exposes one synchronous
internal operation:

```ts
compileRuntimePlan({ entrypoint, graph }) -> {
  plan,
  references,
  observationSeed,
}
```

The inputs are the exact selected `Entrypoint` and complete
`NormalizedAuthoringGraph`. The compiler does not accept the complete derivation
result, `ExecutionDescriptorTable`, `WebRouteModuleTable`, or
`PortableRuntimePlanArtifact`. Its returned values are the exact
`CompiledProcessPlan`, `RuntimeCompilationReferenceTable`, and
`CompilationObservationSeed` contracts defined only in runtime §16. The plan,
its nested records, and seed are closed TypeBox DTOs; the table is the private
operational reference interface. Provider and service definitions remain their
exact cold references. Repeated
`providerEntries()` calls return the same one-time, referentially stable,
canonically sorted frozen provider snapshot, and repeated `serviceEntries()`
calls do the same for the service snapshot; compilation neither copies nor
invokes the referenced values.

The operation projects one process rather than copying the whole normalized
app graph. It duplicate-checks and canonicalizes `entrypoint.process.roles`,
roots compilation in the agreeing selected surface plans, closes transitively
over their service bindings, semantic dependencies, resources/providers,
workflows, Effect refs, and web refs, and excludes facts
owned solely by unrelated app roles from both the plan and reference table.
Cold provider/service objects are recovered through the `Entrypoint` and
reconciled against normalized selection/binding identities; they are not values
carried by the normalized graph.
A reached unselected optional requirement retains its id and exact
derivation-owned finding but contributes no binding, provider node or edge,
compiled resource, or cold reference.

`CompiledProcessPlan` contains neither `observationSeed` nor `findings`.
`observationSeed` is the separate third field of `RuntimeCompilationResult`,
beside `plan` and `references`.

Every invalid compiler input throws built-in `TypeError` before any result.
There is no `CompilationFinding`, diagnostic result, custom/public error API,
prescribed message, or prescribed validation order. Derivation retains its one
optional-provider finding without transferring it into compiler output.
`observationSeed` is returned structural data, not publication: the compiler
does not import, consume, implement, call, or publish through
`RuntimeObservationPort`.

Adapter and harness planning carries only the exact selected surface lane tuple
and selected harness ids with ordinary identity/reference agreement.
Adapter-target resolution remains task 10.1 and harness-descriptor compatibility
remains tasks 10.2-10.3. The compiler never accepts, constructs,
or consumes `ProviderEffectPlan`; resolves or decodes config; builds or acquires
a provider; binds a service or cache; invokes an Effect, loader, callback, or
native host; mounts a harness; accesses a live value; or publishes observation.
These are later-owner responsibilities rather than empty hooks inside the
compiler.

Task 5.1 creates the exact closed blueprint and project structure, activates
version 1, implements the baseline complete plan, establishes only the real
compiler-to-definition and compiler-to-derivation edges, and proves cache plus
pack application/provenance. It grows the sorted SDK policy pack from 13 to 14,
the copied/input blueprint directories from 9 to 10, and adds the LF rule. It
creates no `package.json`, optional interior, `versions/` directory, Grit source
law, successor blueprint, compiler SDK subpath, fake public export, implicit
edge, or early SDK edge. Task 10.6's later terminal SDK composition source alone
adds the final direct compiler assembly edge when it actually imports and calls
`compileRuntimePlan(...)`; runtime mounting and transitive process-runtime
reachability cannot substitute.

The compiler project has exactly three focused `nx:run-commands` acceptance
targets: `acceptance:compiled-process-plan` runs
`compile-runtime-plan.test.ts`, `acceptance:derivation-handoff` runs
`derivation-handoff.test.ts`, and `acceptance:nx-cache` runs
`nx-cache.test.ts`; each has `cache: false`, `parallelism: false`, and
`outputs: []`. Task 5.1's separate publication/assembly corpus is exactly the 18
files named by the active acceptance owner: repository LF policy and Habitat
authority/readme files; the three compiler blueprint files; the core router;
four compiler routing/config files; five SDK routing/pack/build files; and the
Habitat installed-package test. It excludes SDK `package.json`, an SDK
public-face test, product-separation acceptance, root manifests/lock/Nx files,
and `.habitat/index.json`. Compiler source, tests, and tsconfigs remain its distinct
implementation closure.

Tasks 5.2 through 5.4 expand only `compile-runtime-plan.test.ts`; task 5.5
expands only `derivation-handoff.test.ts`, while `nx-cache.test.ts` remains the
task-5.1 owner-cache proof. They change no compiler source or structural
surface. Behavior tests prove semantics, TypeScript and TypeBox prove type and
closed admission, Habitat proves exact structure, Nx proves exact edges and
cache behavior, and SDK pack acceptance proves only pack and installed-blueprint
provenance. Runtime source/AST string tests and a fabricated SDK compiler export
are rejected. The real derivation-to-compilation proof makes producer-local
authoring bindings unavailable after handoff rather than requiring derivation
source to disappear.

### Keep service use cold until process binding

Plugin service use is one relation, not a family of process, role, boundary, or
binding views. `useService(serviceDefinition, { contract, instance?, binding? })` returns
a frozen `ServiceUse<TContract>` with the public enumerable shape
`{ kind: "service.use", serviceId, serviceInstance? }`. `serviceInstance` is
present only for a genuine composition-selected instance. The key containing a
use in a plugin's services map is the local injected-client property and has no
alias, identity, or cache-key authority. Neither the complete service definition
nor the contract object is public cold data.

`runtime-definition` carries the exact definition and contract witness
references plus an optional closed binding tree through a private
non-enumerable symbol. It neither copies nor recursively freezes the referenced
definition or contract; it fresh-copies and recursively freezes only the binding
tree before freezing the declaration and carrier. Its accessor is available
only to private runtime owners and is not re-exported by the SDK. The public SDK supplies
`ServiceContractOf` and map-key-preserving TypeScript inference without dynamic
lookup or a second runtime record.

Task 4.8's complete derivation increment follows the canonical sections and
active acceptance owner without inventing either. Its exact eight-file behavior
companion corpus evolves only existing `runtime-definition` service/profile
source and test files, SDK service/profile projection source/tests, and
installed acceptance; it retains the already-corrected runtime-definition
router unchanged as the eighth routing companion. Its separate exact
publication/assembly corpus adds only
the admitted SDK derivation face and independent version-2 law, updates their
existing publication owners, and applies the sole config change sealed by task
4.7e. Cold `providerSelection(...)` lives in flat
`profile.ts` and is
exported only through `@habitat-ai/sdk/runtime/profiles`, while the derivation
face retains exactly three runtime values. It normalizes each `ServiceUse` and
produces the corresponding
`ServiceBindingPlan`. Its scope and config binding references are closed
declarative discriminated unions; they contain no callback, resolver, provider
acquisition, source I/O/decode, or live value. Task 4.8 proves source defaults,
authored order, expanded refs, binding ids, and pre-emission diamond dedupe only.
The compiler consumes the derived plan rather than
inventing it. The SDK service owner separately defines the five context lanes,
and process runtime alone constructs `BoundService` values through
`bindService`, creates the cache key, and owns `ServiceBindingCache`. The
predecessor `ProcessView`, `RoleView`, `ServiceBoundary`, and author-facing
`ServiceBinding` names are rejected rather than adapted.

### Keep provider plans cold and definition-owned

Task 6.0 closes provider-effect-plan authority before source work across the
two canonical system documents, the runtime-definition router, and the six
active OpenSpec artifacts. Canonical `HABITAT_RUNTIME_REALIZATION` §13.4 and
its directly affected §§17, 25, and 27 alone own exact mechanics; the active
`app-runtime-realization` requirement and scenarios alone retain archive-safe
acceptance. This design records ownership, delivery, and proof allocation
without reproducing the canonical TypeScript blocks. Task 6.0 changes no
source, test, project, blueprint, package/public output, SDK documentation,
`.habitat` record, or runtime behavior. Task 6.1 is the sole next source node.

`ProviderEffectPlan` is operational interior of `runtime-definition`, not a
kind, project, package, bootgraph record, or new runtime phase. A provider's
required synchronous `build(...)` receives exactly already-decoded config, the
`RuntimeResourceMap` operational contract, and the definition-owned observation
port. It receives no scope or telemetry client and returns a cold plan rather
than an acquisition result. Task 6.1 types only that map contract and changes
`requireResource(...)` to preserve its full const input/readonly shape for exact
true, exact false, absent, and widened optionality inference. It creates no map
instance or factory. Task 7.2 alone assembles the substrate-private concrete
frozen map and proves exact declared-reference lookup and copied-reference miss.

A `ProviderFx` is the curated `HabitatEffect` value with requirements fixed to
`never`; it is never a thunk, Promise, raw value, or terminal result. Acquire
retains its typed error. Release is required, receives only the acquired value,
and returns an infallible provider Effect. `providerFx` admits exactly
`succeed`, `tryPromise`, and `acquireRelease`. The plan publicly contains only
`kind` plus acquire and release boundary records; each boundary record contains
only its boundary, policy, and telemetry metadata. Construction recursively
freezes fresh plan, metadata, and private-witness containers while preserving
the opaque acquire Effect and release callback by exact identity without
traversal, copying, freezing, or invocation. The non-enumerable witness and its
accessor remain private to runtime owners. The `RuntimeProvider` interface keeps
erasure-friendly `unknown`/`unknown` config and acquire-error defaults; only the
`defineRuntimeProvider(...)` helper defaults schema-free config to `undefined`
and acquire error to `never`.

Task 6.1 proves definition construction only: no `tryPromise`, release, build, or other
authored callback runs; body identity and metadata/descriptor freezing remain
exact; and the private accessor accepts a genuine nominal plan while rejecting
a forged lookalike. Task 7.2 executes synchronous-throw/rejection mapping,
proves no release registration on typed acquire failure, and classifies build,
forgery, and Effect defects. It also constructs and uses the real beta.101
`Effect.acquireRelease(acquire, release)` adapter and registers release
immediately after successful acquisition. Task 7.3 executes cleanup through
that adapter and proves expected-cleanup observation, release-defect
continuation, rollback, reverse order, inert repeated disposal/release, and
runtime close; it does not lower or register another adapter. Raw Effect, Exit,
Scope, Layer, ManagedRuntime, `ProviderScope`, terminal runners, witness access,
and alternate plan constructors remain absent from both public provider faces.

Task 6.1 preserves byte-identical `runtime-definition@1` and creates only the
complete independent version-2 blueprint and structure files. The selected
successor remains flat with eight shell entries, the existing ten source files
plus `provider-effect-plan.ts`, and the existing two proof files plus
`provider-effect-plan.test.ts`; it adds no skill, Grit rule, inheritance,
fallback, optional interior, version 3, nested providers directory, or second
owner. The exact eight-file behavior corpus, including `src/resource.ts`, and
separate 17-file
publication/assembly corpus are closed by the active acceptance requirement,
giving task 6.1 a 25-file ceiling.

Task 6.1 evolves the existing terminal provider root, which exposes only
`defineRuntimeProvider` as a value and the four admitted
provider/build/resource-map types, and adds only the provider Effect subpath,
which exposes only `providerFx` as a value and the five admitted acquire,
release, plan, Effect, and facade types. Publication grows the SDK pack from 14 to 15,
JavaScript build specifiers from 17 to 18, and runtime authoring subpaths from 8
to 9 while copied/input blueprint directories remain 10. TypeScript owns const
requirement preservation, map overloads, ProviderFx/error inference, required
never-release, and positive/negative nominal anti-forgery. Definition,
derivation, and compiler behavior tests own cold no-callback construction,
descriptor flags/body identity, accessor forgery rejection, and zero-build
truth. Habitat and Nx own structure, application, edges, and cache; SDK and
installed-package tests own public inventories and packed provenance.
Source-string or AST assertions are not a proof path.

### Keep boot ordering private, closed, and deterministic

Completed documentation-only task 6.1a closes bootgraph authority across the
two canonical system documents and these six active OpenSpec artifacts.
`HABITAT_ARCHITECTURE` routes ownership, canonical
`HABITAT_RUNTIME_REALIZATION` §17 alone owns the exact TypeScript, DTO, ordering,
refusal, freezing, owner-closure, corpus, and task mechanics, and the active
capability requirement alone preserves archive-safe acceptance. No OpenSpec
artifact copies the canonical TypeScript block. The correction changes no
implementation, source, test, project, blueprint, package/public output,
`.habitat` record, SDK edge, or runtime behavior; task 6.2 is the sole next
source node.

Task 6.2 creates the complete private package-less `runtime-bootgraph@1` owner
and the full synchronous `orderBootgraph(...)` operation. The operation accepts
only compiler-owned `BootgraphInput`. One selected compiler node becomes one
selection-id-backed resource key carrying resource, lifetime, and optional role
and instance identity; one module retains that key and provider identity. An
edge from one selection to another means the source depends on the target. Kahn
ordering therefore emits dependencies first and breaks every ready-set tie by
ascending `selectionId`. Module and order collections are acquisition order;
rollback and release collections are its exact reverse. Repeated dependency
targets for one module deduplicate and sort by `selectionId`, while an exact
repeated edge triple refuses.
Every occurrence of a node key inside modules, dependencies, forward order, and
reverse orders reuses that one exact frozen key object.

Caller-reachable refusals are separate: malformed or surplus input; duplicate
`selectionId`; duplicate exact lifecycle resource identity tuple
`(resourceId, lifetime, role-or-empty, instance-or-empty)`; duplicate exact
edge; dangling endpoint; self-cycle; and multi-node cycle. Each throws built-in
`TypeError` before a result. Independently, the implementation validates every
produced artifact against the closed output schema and exact internal
module/order/reverse/reference relations before return; disagreement throws the
same built-in `TypeError` as a defensive invariant, not as a caller-reachable
refusal fixture. Accepted output is a fresh recursive frozen copy. Input is
neither mutated nor newly frozen, and its preexisting frozen state, property
descriptors, and reference identities remain unchanged. The operation has no
findings and performs no provider build, config/decode, Effect, acquisition,
release, observation, or other external work. It carries no provider reference,
provider-plan body, decoder/redaction metadata, live value, or compiler result
surface beyond the ordering artifact.

The complete task-6.2 implementation/proof closure is exactly the four source
files `bootgraph.ts`, `boot-resource-key.ts`, `boot-resource-module.ts`, and
`index.ts`; the two tests `bootgraph.test.ts` and `nx-cache.test.ts`; and the two
project tsconfigs. Its separate publication/assembly closure is exactly the
repository LF file; three Habitat authority/readme files; three bootgraph
blueprint files; the core router; bootgraph `AGENTS.md`, `habitat.toml`,
`project.json`, and `tsdown.config.ts`; SDK `AGENTS.md`, `README.md`,
`habitat-pack.json`, `project.json`, and `tsdown.config.ts`; and Habitat installed
package acceptance. The project root has exactly eight entries, `src` four,
`test` two, and the blueprint root three; `src/index.ts` is the sole private
assembly interface.

Task 6.2's baseline `bootgraph.test.ts` must prove one nontrivial dependency
graph's exact ordering, output shape, schema admission, and key-reference reuse,
plus one representative malformed-input generic `TypeError`. That paired
positive/negative proof prevents an empty or constant implementation from
satisfying the complete source node.

The sole owner edge is `runtime-bootgraph -> runtime-compiler`, established by
the real relative compiler import and tsconfig reference. Task 6.2 grows Nx
projects 26 to 27, adds the exact bootgraph-blueprint LF rule, grows the sorted
protocol-1 SDK pack 15 to 16 by inserting
`runtime-bootgraph@1` before `runtime-compiler@1`, copied/input blueprint
directories 10 to 11, and SDK build inputs 13 to 14; SDK JavaScript entries
remain 18 and exports remain 21. The SDK
changes carry policy assets only: they create no SDK source/build edge, bootgraph
public face, package export, or release member. Explicit owner targets are only
`typecheck`, `test`, `build`, and `check`; policy and application targets remain
inferred. Installed proof owns pack parity, exact fixture instance, resolution
and application provenance, structure, and restoration.

Task 6.3 is proof-only and expands only the already-created
`bootgraph.test.ts`. It adds permutation, tie-break, identity-reuse, dedupe,
freeze/state-preservation, empty/disconnected, coldness, and cumulative deleted
`packages/bootgraph` / `@rawr/bootgraph` absence proof; validates every
successful output against the closed schema and exact output relations; and
exhaustively proves only caller-reachable input refusals. It does not fabricate
an internal output-disagreement fixture and changes no source, project,
blueprint, pack, SDK/public files, or `nx-cache.test.ts`. The frozen
product-separation test remains untouched. Task 10.6 alone adds the real terminal SDK
edge when `startApp(...)` composition imports and calls `orderBootgraph(...)`
beside `compileRuntimePlan(...)`.

### Give one Effect kernel the process lifecycle

Before the first acquisition, provisioning materializes every declared source
and preflights every provider config plus service scope/config ref using exact
authored-order first-hit lookup and owning-schema decode. Any required-source,
declared memory/test, malformed/unreadable source, exhausted-key, or
winning-decode refusal yields zero acquisition; only an absent optional
dotenv/file source skips. Only provider-owned diagnostic, telemetry, and
catalog projections apply redaction.

Task 7.2 assembles the private frozen dependency-resource map from exact
declared requirement references, joins the ordered boot artifact with the
compiler reference handoff, constructs and uses the real beta.101
`Effect.acquireRelease(acquire, release)` adapter, registers release immediately
after successful acquire, proves `tryPromise` mapping and failed-acquire
non-registration, and classifies build, plan-forgery, and Effect defects. Task
7.3 exercises that adapter to prove expected-cleanup recovery and observation,
release-defect continuation, rollback, reverse order, inert repeated
disposal/release, and runtime close. It does not lower or register another
adapter.

The bootgraph artifact owns only selection-backed resource/provider identity,
dependency order, deduplication, rollback order, and release-order metadata.
Exact provider references plus
provider-owned config decoder and observation-redaction metadata stay in the
compiler reference handoff. The Effect substrate joins those inputs; neither
handoff carries a provider plan or acquire/release body, and bootgraph never
becomes a Layer dependency graph. For each started process the Effect substrate creates exactly one
`effect@4.0.0-beta.101` `ManagedRuntime` from exactly one
`Layer.effectContext` lifecycle adapter. Only after config preflight and
dependency readiness does that adapter call synchronous provider `build(...)`,
privately recover the returned plan bodies, construct and use
`Effect.acquireRelease(acquire, release)`, execute acquire, and register required
release immediately after successful acquisition. A typed acquire failure
registers no release; failed startup rolls back the acquired prefix, and reverse
release continues after each infallible cleanup Effect. The adapter returns the
assembled process Context. The substrate forces the managed context before
mount and exposes only one `ManagedRuntimeHandle`. `ManagedRuntime` owns its
scopes, fibers, and reverse release; Habitat constructs no second root `Scope`,
second ManagedRuntime, or per-execution runtime.

Domain services remain Habitat services bound by process runtime. They are not
Effect services, Context tags, or Layer nodes, and service dependency direction
does not become Layer composition. `Layer.effectContext` is the one lifecycle
adapter around the ordered provider acquisition Effect, not a second bootgraph
or service graph.

`ProcessRuntimeAccess` never exposes raw `Layer`, `Context`, `Scope`,
`ManagedRuntime`, provider internals, or secrets. Services and plugins declare
requirements; apps select providers; only provisioning acquires them.

The lab's provider dependency, rollback, redaction, and release-continuation
fixtures are retained as behavior oracles. Its Promise boot modules, WeakMap
plan identity, Layer-shaped bootgraph, separately created root Scope, and
per-`ProcessExecutionRuntime` managed runtimes are rejected. Magic's
process-local scoped acquisition and provider release order are behavior
evidence only; its live product resource bag, direct `Layer.build`, domain
service construction, and entrypoint-selected providers are not ported.

Tasks 6.4 and 6.5 stop at each qualified Fluree HTTP provider's config
schema/decode contract, cold plan construction, and provider conformance; they
perform no live acquisition, release, or failure cleanup. Task 7.4 runs both the
semantic-ledger and temporal-inquiry provider packages through the real Effect
substrate to prove single acquisition/release and failure cleanup before adding
the admitted lab and Magic process-lifetime assertions.

### Centralize process context without stealing native execution

Process runtime consumes `CompiledProcessPlan`, the matching non-portable Effect
`ExecutionDescriptorTable`, and `ProvisionedProcess`. The separate non-portable
`WebRouteModuleTable` remains on the web lowering path and never enters the
Effect execution registry. Process runtime owns service binding and cache,
execution-registry assembly, scoped runtime access, the app/process Effect
`Context`, resource lifetime, policy and telemetry decoration exposed through
`effect/context` and `effect/wrap`, adapter coordination, mount-ready records,
and one idempotent process stop handle. It may retain
`ProcessExecutionRuntime` only for invocation classes whose selected native
boundary does not already own Effect execution. It never invokes a harness or
projects observation read models. Runtime mounting owns harness invocation and
cross-owner single-flight settlement; runtime observation alone projects final
read models.

The live `ServiceBindingCache` key is exactly
`{ identity, profileId, bindingId }`, with all five
`RuntimeLaunchIdentity` fields. It excludes plugin
`NormalizedServiceUse.localName`/services-map property name as a separate ingredient,
plugin/surface/capability, contract/schema object identity, decoded values, and
invocation. Service-owned dependency keys may influence reuse only through
normalized dependency or requirement ids already represented by `bindingId`.
Task 8.2 alone proves construction and reuse.

The execution registry admits an executable only when compiled plan and
descriptor identity agree exactly. `effect/context` assembles the one
process-owned environment from provisioned values; `effect/wrap` decorates an
owner-authored Effect with the selected lifetime, policy, and telemetry without
calling an Effect terminal. Synchronous or Promise-returning native operations
use native `.handler`. A boundary delegates to `ProcessExecutionRuntime` only
when Habitat owns that execution terminal. Effect-backed oRPC service operations
instead use official implementation-owned `.effect`, installed once in
`src/service/impl.ts`, and MUST NOT pass through `ProcessExecutionRuntime`. The
extension's internal `handlerGen` is the underlying vendor mechanism that
delegates to `.handler`. Habitat-authored authoring, adapter, and operation code
neither directly imports, calls, wraps, nor reimplements it; the selected
official extension's internal call remains admitted.

The lab's exact registry matching and post-stop refusal logic are ported after
removing its runtime construction and incomplete invocation context.

### Define harness once, then realize native interiors

The generic harness contract consists of an import-safe descriptor,
`HarnessMountInput` containing frozen launch identity, roles, adapter-lowered
mount-ready payloads, bounded access, read-only required-resource readiness,
and report sink, plus a `NativeHarnessHandle` with idempotent stop and optional
distinct health probes. Runtime mounting invokes the harness, receives the
native handle, and only after successful mount creates private
`StartedHarness` from descriptor identity, native handle, accepted findings,
launch identity, and mount metadata. It orders mount, reverse stop, and process release;
it does not
define a drain protocol or interpret command, HTTP, durable workflow, or web
semantics. When a native host drains, its idempotent `stop()` owns that behavior.

Surface adapters alone translate `CompiledSurfacePlan` into native payloads.
They may create callbacks that delegate to `ProcessExecutionRuntime` only for
invocation classes without a selected native Effect bridge; they do not execute
during lowering, replace the oRPC bridge, or mount hosts.

Vendor realizations retain their native laws:

- Oclif uses low-level `run`; root `finally` and output flush settle before
  runtime release, and Oclif `handle` runs last.
- Elysia owns its server and one graceful `stop(false)`. Runtime mounting waits
  for native settlement, then invokes the process-runtime stop handle before
  provider release; deadline expiry remains a
  truthful `draining` outcome and never triggers a second `stop(true)` call.
- oRPC native callbacks retain validation, middleware, declared-error,
  transport, and abort semantics. Synchronous or Promise-returning non-Effect
  operations use native `.handler`; Effect-backed Habitat service operations
  use official implementation-owned
  `@orpc/experimental-effect@2.0.0-beta.23` `.effect`, installed once in
  `src/service/impl.ts`. Its internal `handlerGen` delegates into native
  `.handler` and owns the request-fiber signal, Cause reconciliation,
  `Effect.runPromiseExit`, and Promise boundary. Habitat-authored authoring,
  adapter, and operation code never directly imports, calls, wraps, or
  reimplements it; the official extension's internal call remains admitted. The
  app/process supplies the
  one Context, resource lifetime, policy, and telemetry decoration through
  `effect/context` plus `effect/wrap`; it does not replace the bridge terminal.
  Acceptance resolves oRPC, the official bridge, and Effect through one module
  realm and rejects a manual/custom runner or `ProcessExecutionRuntime` for
  oRPC service Effects.
- Native `inngest@4.18.0` owns Serve and Connect retry, memoization, history,
  replay, cancellation, and transport outcomes; `effect-inngest` is rejected.
  Private `FunctionBundle` registration factories receive the same native
  client as the selected Serve or Connect harness; `WorkflowDispatcher` is a
  separate named consumer/materialization. The exact step boundary is
  `step.run(id, () => ProcessExecutionRuntime...)`. Replay re-enters the native
  function and `step.run(...)` registration and never resumes a suspended
  Effect fiber. A completed memoized step returns native memoized state without
  invoking the callback or `ProcessExecutionRuntime`; a failed or otherwise
  un-memoized attempt invokes the callback anew. Native cancellation does
  not interrupt an already active step, so Habitat injects no synthetic signal.
  Serve tracks admitted handler Promises. Connect uses
  `handleShutdownSignals: []` and retains the owner callback tracker because
  `handleExtendLeaseAck` may delete `requestLeases` while the callback
  continues, native close/reconcile gate on those leases, and
  `SameThreadStrategy.close` does not call the available `waitForInProgress`.
  Runtime mounting owns one outer single-flight stop, invokes and awaits native
  `close()` once, then waits for callback-tracker zero before release. Native
  close/flush proves neither callback completion nor delivery, so observation reports only evidenced
  `presented`, `confirmed`, `dropped`, or `unknown` outcomes.
- MCP remains an external companion projection of a `server` surface. Habitat
  authors no MCP protocol face or direct official-SDK harness. Conditional
  `mcp-openapi@1.0.0` acceptance uses its independent package's public lifecycle
  and tool/OpenAPI-resource surface only, never Magic's tarball or prompts.
- Web mounting remains a distinct native harness; it is not another app.

The lab's native passage fixtures are ported as black-box acceptance tests, not
as production Oracle types.

### Make Habitat law positive, closed, and co-landed with conformity

The generic `service@1` kind is a runtime capability authority with one public
contract, one in-process client, one router face, and private implementation.
One service depends on another only through the other service's public client.
Apps supply resources/providers during composition; plugins and apps own
transport projection and orchestration. The service source and its independently
selected proof taxonomy are closed around that minimal spine. The kind contains
no product vocabulary or product inventory. This is settled law to package and
prove, not another local service design branch. oRPC 2 and Effect 4 are the
single vendor substrate; no compatibility blueprint or legacy construction
branch survives. Habitat law asserts durable ownership and topology rather than
vendor-syntax snapshots.

Within that spine, a synchronous or Promise-returning operation uses native
`.handler`; an Effect-backed operation uses exact
`@orpc/experimental-effect@2.0.0-beta.23` implementation-owned `.effect`,
installed once in `src/service/impl.ts`, after `effect/context` and
`effect/wrap` apply the app/process-owned environment, lifetime, policy, and
telemetry. The extension's `handlerGen` is an internal vendor mechanism only;
Habitat-authored authoring, adapter, and operation code does not directly
import, call, wrap, or reimplement it, while the selected extension's internal
call remains admitted. Service law rejects
service-authored direct `Effect.run*`, a manual Promise bridge, a custom Effect
runner, or routing an oRPC service Effect through `ProcessExecutionRuntime`.

Blueprint definition composition is separate from instance realization. In
Gate A, `component` is informal shorthand for authoring-tree organization only:
a named subdirectory inside one blueprint groups small ordinary rule assets.
The existing schema-version-1 `blueprint.toml` `[[rules]]` sequence remains the sole
ordered composition surface and references nested rule assets through each
rule's existing runner fields. For the Gate A service proof, root
`structure.toml` remains exactly one ordinary Habitat structure rule and owns
the complete positive filesystem closure; authoring component directories group
focused ordinary Grit `pattern.md` packets only. Each structure or Grit packet
remains a normal blueprint rule, application, and focused Nx target.

A component name or directory creates no definition field, runtime DTO, parser
branch, evaluator primitive, kind identity, manifest, Nx project, application,
or component-named target. Directory placement alone activates nothing; only an
ordinary root rule declaration gives a nested asset authority. One repository
owner still pays only for one project-root `habitat.toml`, one selected
blueprint/version, and one Nx project, while its existing `check:policy`
composition evaluates the selected rule applications.

The app, SDK, complete Oclif-app, and complete CLI-topic blueprints plus the
exact `runtime-schema`, `runtime-definition`, `runtime-derivation`,
`runtime-compiler`, `runtime-bootgraph`, `runtime-substrate-effect`,
`runtime-process-runtime`, `runtime-harnesses`, `runtime-observation`, and
`runtime-mounting` private-owner blueprints may organize ordinary packets into
authoring directories where that improves locality. Adapter law remains an
ordinary owner-local rule packet within the process-runtime or harness
blueprint, not an additional runtime-owner blueprint. All enabled blueprints
are closed. A packet may land as non-enforcing design material first, but each
enabled kind law co-lands with its first conforming owner so every Graphite node
remains green and truthful. There is no red baseline or exception lane.

For the Oclif kinds specifically, task 2.10a transfers native vendor mechanics
and deletes the obsolete product-bound Oclif-app law without activating a
replacement. Task 2.11 deletes the product-bound Oclif-command-plugin law with
its final predecessor owners. Task 11.4 creates
`plugins/cli/topics/foundation` / private `@habitat-ai/plugin-foundation` as the
first conforming topic owner and is the first permitted landing of the fresh
final closed Oclif-app law, final closed CLI-topic law, and topic-neutral private
CLI source-bundle contract, together with the conforming foundational runtime
vertical. The task 12.1 agent-plugin topic consumes those already-landed
generic contracts and adds only its qualified overlay and instance selection.

Directory nesting alone does not create blueprint composition. A blueprint
relation is admitted only when the related law is independently constructible
and reusable: `include` applies that law at the same anchor, while `contains`
binds a closed child kind below a parent-owned boundary and cardinality. Neither
relation creates a child manifest, project, or target; repeated occurrences of
one related rule batch into one application owned by the parent instance. Gate
A implements zero blueprint relations: the service proof is constructible from
ordinary rules whose assets are grouped in its own authoring tree.
Any later `include` / `contains` mechanism is a separately gated extension after
Gate A and must prove an independently constructible reusable child kind before
implementation. An admitted relation resolver fails closed on a missing
definition, cycle, escaping bind, overlapping ownership, or cardinality
violation.

The SDK pack recursively preserves the complete declared authority tree and
relative paths for every packaged blueprint, with source-to-installed byte
parity for definition manifests, the required root structure anchor, informal
authoring directories, and every rule-referenced asset. The current shallow `${id}/*`
copy is a regression; packaging may not flatten, reinterpret, or omit nested
authority. Recursive packing is the only Gate A engine/build correction;
catalog decoding, rule applications, evaluator behavior, and Nx target
projection remain unchanged.

This current-native shape is also the Gate A bootstrap boundary. The repository
continues to use registry `@habitat-ai/cli@0.5.2` for Nx projection before the
candidate is published, so Gate A adds no blueprint or instance schema version,
`components` field, runner-array form, component DTO, parser branch, or evaluator
merge behavior that would require candidate plugin authority. No inheritance,
variant, capability, niche, manual inventory, custom runner, custom parser, open
scope, or expanded downstream composition configuration enters this change.

`service@1` is the first end-to-end proof. Its current monolithic roughly
900-line source-law direction is deleted rather than optimized, and the law is
recast as a root structure anchor rule plus small ordinary rules whose assets
are grouped under the context-bearing `contract`, `funnel`, and `spine`
authoring directories. The nested packets are focused Grit rules only; the one
root Habitat structure rule owns the complete positive filesystem closure. Each
packet retains its normal application and focused target. The root anchor
retains the project, `client.ts`, and source boundary. Database is optional
closed service-owned persistence; modules, database, model, middleware,
operations, and proof are not child kinds. TypeScript retains visibility proof,
Nx retains project and dependency proof, and behavior tests retain service
semantics and lifecycle proof.

Nx owns package/project classification, cross-project/package import direction,
standard task composition, and cache inputs. Habitat owns closed filesystem
shape. Focused positive Grit import forms plus owner-local fixtures prove the
internal module direction that Nx cannot see. TypeScript owns capability
visibility. Behavior and installed-artifact tests prove runtime uniqueness,
acquisition, release, and public reachability. No manual phase-gate or structure
script is introduced when those owners can express the invariant; Grit does not
claim process-wide semantic proofs.

Magic's committed consumer oracle
`ec7a49c596ca50d5c8ef8ce3f8e3e40cb08c33a7` / tree
`2b3c99700d5db8264b7ee42910575e8b877bda3a` confirms only generic process
assertions after comparison with the clean blueprint snapshot: one semantic
app can expose separate server and async entrypoints; each process can retain
its own identity, scoped resource lease, health state, native handle, and stop;
and a native Inngest Serve boundary can remain separate from a built Elysia
server. Its concrete Magic app/resource/service/route/function wiring, direct
`Layer.build`, entrypoint-selected providers, Railway deployment evidence, and
copied `vendor/mcp-openapi/mcp-openapi-1.0.0.tgz` are not ported. The external
MCP companion proves demand only and supplies no prompts claim. Habitat adds the
missing generic profile, compiler-before-acquisition, process-runtime, public
companion descriptor/health contract, harness, diagnostic-catalog, and
observation laws; conditional task 13.6 waits for an independently versioned
`mcp-openapi@1.0.0` artifact.

### Keep generic law distinct from downstream products

The canonical architecture and runtime specifications define Habitat kinds,
owners, interfaces, flows, phases, and invariants independently of any product
instance. This change implements those contracts only after repository
separation. The independent Rawr repository owns any later product app. Its
initial finite import contains only the ChatGPT corpus, Hyperresearch, and
session-intelligence domain closures. Later stack-only product capabilities may
enter only through separate Rawr owner-local admission after their released
Habitat prerequisites exist. Product ids, providers, plugin membership, config,
role sets, and deployment choices never become Habitat law.

### Separate repositories before runtime implementation

Habitat retains one production application root: `apps/habitat`, the
platform's self-hosted realization. Rawr source moves to its independent
repository before live private runtime owners are implemented; only the
bounded non-live `runtime-schema` prerequisite may land earlier. Habitat realizes its
catalog, policy, agent-plugin lifecycle, development/repository, generator, Nx,
and CLI
capabilities through the app/profile/process contract. Generic host mechanics
belong to Habitat runtime adapters and harnesses. Product composition never
becomes a Habitat app.

Each ownership cut moves every reader and writer and deletes its predecessor in
the same Graphite node, except for the bounded task 2.8 command publication
barrier. Before Gate A, a semantic-sieve node deletes only predecessor reader
closures already classified for deletion and requiring no retained-capability
transfer. Gate A lands the `HabitatCommand` producer and installed-candidate
acceptance while the remaining private `RawrCommand`/`RawrResult` source and
readers remain unchanged; it neither revives nor preserves a condemned closure.
The root continues to use registry `@habitat-ai/cli@0.5.2` as its Nx
bootstrap, `apps/habitat` remains outside the Bun workspaces, and Bun 1.3.14
retains a valid frozen lock; the candidate is not source-linked through a
`file:`, `link:`, or duplicate workspace identity. Gate B publishes only the
fixed SDK/CLI release pair from accepted exact main and records registry smoke.
Gate C begins only after that receipt, replaces the root Nx bootstrap with the
exact registry CLI, migrates surviving readers, and deletes the predecessor
model and every remaining reader in one green node. Gate A admits one
public/candidate command model only, and Gate C admits zero predecessor models
or readers. This changes release ordering, not authority, and creates no
compatibility architecture.

After that barrier, task 2.10 is a narrow existing-owner qualification only:
catalog, the four agent-plugin resource/provider families, and the
agent-plugin lifecycle service/readers/tests. Task 2.10a then moves only native
`@oclif/plugin-plugins` dependency/configuration and its complete installed
plugin-management roundtrip into `@habitat-ai/cli`. It does not move a topic,
profile, development vertical, generator, runtime owner, private source-bundle
contract, or final generic law.

Task 2.10b then adopts the exact `0.5.14` foundation-continuation pair and
selects `service@2` / `resource@2` only for retained platform owners, with all
provider and condemned selections unchanged. Only after both the native
transfer receipt and that adoption are sealed does task 2.11 record the exact
pre-deletion source commit and whole-tree identity and delete `apps/cli` with the
exact task-2.11 predecessor inventory. It explicitly retains mixed
`@habitat-ai/rawr-core` / `packages/core` until its telemetry and SDK readers
move and task 3.3 deletes that identity. The frozen source is provenance and may
supply later owner-local test oracles; it is neither a live reader nor a claim
that later behavior survived. The final generic Oclif laws and private source-bundle
contract first land with task 11.4. The final agent topic, overlay, app/profile
selection, and installed acceptance first land with task 12.1. Development
lands with task 12.2. Native generator mechanics first land at task 11.6,
while task 12.3 creates and selects the private
`plugins/cli/topics/authoring` / `@habitat-ai/plugin-authoring` command
projection. Task 2.11 proves
absence only and cannot substitute for any of those fresh-owner gates.

The old `apps/cli`, `apps/server`, `apps/hq`, and `apps/web` project identities,
mixed `packages/core` contents, direct telemetry singleton, bootgraph shell, and
entrypoint-local runtime acquisition cannot coexist with a completed cutover.
No compatibility path survives Gate C or any other cutover; the final
repository pass only verifies that unreachable residue is absent.

#### Canonical purpose normalization

OpenSpec 1.3.1 applies requirement deltas but does not rewrite a retained
capability's `Purpose` block. The archive node therefore performs exactly these
three deterministic purpose replacements after applying every delta and before
strict validation:

| Capability | Exact retained purpose |
| --- | --- |
| `agent-plugin-channel-selection` | Define the one reviewed Marketplace Git record that selects canonical curated agent-plugin content without introducing another release or provider-state authority. |
| `agent-plugin-release-derivation` | Define how exact reviewed Marketplace Git content becomes a closed invocation-local release model for validation, packaging, testing, and native convergence without a persistent release store. |
| `qualified-artifact-authoring` | Define two separately owned Habitat source-authoring projections for first-party CLI commands and external CLI extensions without recreating an aggregate scaffold or app-composition owner. |

No other Purpose block changes during archive. A missing replacement, an extra
replacement, or retained positive Personal, Template, or Rawr application
authority fails the archive and restores the pre-archive tree.

### Keep observation and telemetry downstream of runtime authority

This change implements `RuntimeDiagnostic`, `RuntimeCatalog`, and
`RuntimeTelemetry` in `runtime-observation` as non-authorizing process
observation. It does not choose a backend or wire production exporters. The
current Rawr-named singleton is not an admitted provider. The mixed telemetry
root remains held source evidence while task 3.1 re-authors its path-qualified
OpenTelemetry Node resource/provider and singleton retirement into fresh
Habitat-owned nodes before `packages/core` is reserved. Task 3.1 selects no app.
The provider stays resource-owned, while the optional public integration is
assembled into `@habitat-ai/sdk/telemetry`; it is not a third package and is not
hidden in `@habitat-ai/cli/host`. Each admitted process, mounting, observation,
and harness obligation co-lands beside its exact runtime owner through the
canonical `RuntimeProvider -> ProviderEffectPlan` input. The selected Habitat
profile and real installed-Oclif telemetry receipt must exist or co-land by
task 12.1; placeholders and deferral to the final audit are forbidden. Task
15.1 only audits exact receipts and retirement. The mixed root is never
restacked or merged and retires only after destination acceptance. A downstream
product may later select the released integration in its own repository.
Oclif, Elysia/oRPC,
Inngest, EVLog, ClickStack, and shutdown integration remain downstream.

The observability companion document owns signal meaning, correlation,
redaction, backend receipt, and telemetry/analytics boundaries. It attaches to
the canonical runtime observation section; it does not add another realization
phase.

### Use two exact-main functional release checkpoints

This migration has exactly two functional public checkpoints, both through the existing
fixed Nx Release group and both containing only `@habitat-ai/sdk` and
`@habitat-ai/cli`:

1. The **pre-separation foundation release** occurs at task 2.8 Gate B, after
   Gate A has landed the final `service@1` pack, `runtime-schema` adaptation,
   service metadata and middleware contracts, host-neutral client contracts,
   and sole public/candidate `HabitatCommand` contract. The accepted Gate A
   exact-main commit exclusively authorizes that release. Its registry receipt
   then authorizes Gate C reader cutover and predecessor deletion; task 2.8 does
   not close until Gate C proves zero predecessor command model or reader.
2. The **final runtime release** follows task 15.5. It contains the completed
   runtime, harness, resource-integration, telemetry, and CLI closure. Its exact
   main commit exclusively authorizes that second release.

Exact-main bounded foundation-continuation tags inside the first checkpoint do
not create a third functional checkpoint. Releases `0.5.7` through `0.5.15`
continue the original Gate B `0.5.6` pair while admitting only the already
sequenced foundation corrections and owner transfers. Each must publish the
same two-package Nx release group and carry its own installed-registry receipt.
The latest pre-separation continuation release is `0.5.14` from
`9e650107ac8c292ca13be5edc2390b870b952c68`; it adds immutable `service@2` and
`resource@2` acquisition successors while retaining every version-1 closure.
Habitat adopts that exact pair and advances only retained platform instances
before task 2.11. Transferred or deleted instances remain at version 1 until
their already-authorized removal, so continuation never becomes normalization
of condemned substrate.

The task-3.2a `0.5.15` continuation carries only the already-qualified
declarative telemetry SDK face plus the catalog's Git-visible
compatibility-acquisition correction. It adds no package, runtime owner,
provider acquisition, app/profile selection, mount, instrumentation bootstrap,
or product behavior. Habitat must adopt the exact released pair before task 3.3
resumes.

Before each public checkpoint, installed-package acceptance publishes the local
candidate pair only to an isolated registry and passes the one-operation
`nx add` flow. The exact-main fixed Nx Release group then publishes and
registry-smokes the same two packages; at the first checkpoint, that public
receipt is the barrier between Gates B and C.
Neither checkpoint publishes a service, resource, provider, private runtime
project, or downstream product as another package.

## Risks / Trade-offs

- **The migration becomes a large rewrite** -> seal and land one complete
  owner/artifact handoff at a time; activate its closed law and remove its old
  reader and writer in that same node.
- **A narrow vertical becomes a toy framework** -> use real Habitat commands
  such as `habitat resolve` and `habitat agent plugins status` through both
  source and compiled Oclif entrypoints; retain lab fixtures only as
  supplemental falsifiers.
- **Internal runtime projects recreate a package cohort or cycle** -> keep one
  public `@habitat-ai/sdk` package, make each runtime root a private package-less
  Nx project, make the public facade a terminal export surface, and verify the
  SDK's assembled output plus each installed subpath and selected-process
  dependency closure from a registry-built artifact.
- **Authoring directories become a second runtime grammar** -> keep components
  as informal shorthand for directory organization only, order their ordinary
  Grit packets
  through schema-v1 `blueprint.rules`, and retain each packet's existing
  application and focused target without a component DTO, parser, or evaluator
  merge.
- **Gate A requires its unpublished candidate plugin to understand new law** ->
  change no blueprint or instance schema and keep every nested asset behind an
  existing rule runner so registry `@habitat-ai/cli@0.5.2` can project the
  repository until the accepted candidate is published.
- **Packaging silently drops nested composed authority** -> recursively pack
  every declared definition, root anchor, authoring directory, and rule asset
  with preserved relative paths, then compare source and installed bytes before
  publication.
- **Relations turn ordinary directories into an ontology and delay Gate A** ->
  keep internal law as ordinary packets in informal authoring directories,
  implement zero relations in Gate A, and gate any later `include` or `contains`
  extension on independently constructible reusable law.
- **Generic harness machinery absorbs vendor semantics** -> keep only the
  shared mount/stop shape generic and prove each vendor with native fixtures and
  exact installed-source review.
- **The lab reintroduces stale public types** -> port algorithms and behavior
  tests only at their admitted later owner; task 4.9's derivation audit is a
  no-op, and the lab package is never imported or published.
- **Runtime observation becomes lifecycle authority** -> keep observation
  write-only from the realization path and prove observation failures do not
  change product outcomes or release ordering.
- **Source movement disrupts existing consumers** -> move each reader and
  writer in the same semantic node except at the explicit command publication
  barrier; there, accept the producer, publish from exact main, and only after
  registry receipt cut every surviving reader over and delete the old owner.
  Never retain aliases or claim Gate A has already closed predecessor readers.

## Migration Plan

1. Retain task 1.1's source identities as ordinary provenance and use the
   landed authority on canonical `main` as the semantic ledger.
2. Reopen the current capability inventory and apply the completed semantic
   sieve. Record one exact Habitat, Rawr, fixture, or delete disposition for
   every current project, command, helper, policy, test, and product record.
3. In a clean worktree of existing Rawr repository `rawr-ai/rawr` at canonical
   `origin/main` `b02a9394a1476a90c11a871b678e28591d69bfa3`, author the Rawr
   OpenSpec, disposition its legacy Turborepo-era contents, establish the Nx
   consumer shape, and record the six-project finite import ledger without
   moving source.
4. In Habitat, first reorganize blueprint authoring through the existing
   schema-version-1 ordered rule surface and restore recursive
   source-to-installed pack parity. Keep root `structure.toml` as one ordinary
   Habitat structure rule that owns the complete positive service filesystem
   closure; let root rules reference focused ordinary Grit assets under `spine`,
   `modules`, `model`, `persistence`, and `proof` authoring directories; and
   retain every packet's ordinary application and focused target. Recursive
   packing is the only engine/build correction. Add no component field,
   schema version, runner-array form, runtime DTO, parser branch, evaluator
   merge, or downstream configuration. This keeps the unpublished candidate
   out of the authority loop while registry `@habitat-ai/cli@0.5.2` remains the
   root Nx bootstrap. Use `service@1` as the first proof: delete the monolithic
   source-law direction and leave TypeScript, Nx, and behavior to their proper
   truths. Gate A implements zero blueprint relations; module and database
   remain service-owned law organized inside the service blueprint. Only after
   Gate A may a separate `include` / `contains` slice be proposed for
   independently constructible reusable law. Then cross the bounded task 2.8
   publication barrier in order. **Gate A** produces the final TypeBox
   service-schema, service metadata/middleware,
   host-neutral client, and sole public/candidate `HabitatCommand` interfaces;
   passes isolated-registry installed-candidate acceptance while the root keeps
   registry `@habitat-ai/cli@0.5.2`, `apps/habitat` remains outside Bun
   workspaces, and existing private predecessor readers remain untouched; then
   lands that accepted producer on exact main. **Gate B** uses the fixed Nx
   Release group from that exact revision to publish and registry-smoke only
   `@habitat-ai/sdk` and `@habitat-ai/cli`, and records the exact receipt. **Gate
   C** starts only from that receipt, replaces the root Nx bootstrap with the
   exact registry CLI, migrates admitted Rawr and retained Habitat readers, deletes
   condemned reader closures rather than adapting them, and removes
   `RawrCommand`, `RawrResult`, and every predecessor reader without a shim,
   alias, fallback, or dual public authority. Defer retained Habitat
   workspace-discovery readers and the predecessor discovery deletion to their
   final owner/deletion boundaries; product-owned Rawr configuration stays with
   its product owner. Expose no Oclif host seam before the final runtime
   vertical. This is the sole non-live private runtime prerequisite before
   separation. The barrier changes publication order only; it does not preserve
   a compatibility model.
5. Restack Session Metrics onto the admitted session service. Use native
   `nx import` from the frozen Habitat source/ref with explicit source and
   destination directories to import only the proven ChatGPT corpus,
   Hyperresearch, and session-intelligence service/topic projects with filtered
   Git history. Import cohesive projects together where possible and otherwise
   import dependency leaves first. Reconcile destination root configuration and
   local dependency edges, pass the Rawr Nx graph and behavior gates, and land
   Rawr canonical `main`. Create no copier, mirror, sync, or continuing source
   relationship.
6. In Habitat, finish only the existing-owner qualification sequence: catalog;
   package-output, content-workspace, native-agent-provider, and
   versioned-content families/providers; then the agent-plugin lifecycle
   service/readers/tests. In a separate bounded node, move the
   `@oclif/plugin-plugins` dependency/configuration and complete installed
   root `plugins` listing plus install/link/inspect/update/reset/uninstall
   roundtrip from `apps/cli` to `@habitat-ai/cli` with an owner-local prebuilt
   package fixture, deleting the obsolete Oclif-app packet/applications in that
   same node. After that receipt,
   freeze the exact pre-deletion commit/tree and delete `apps/cli` plus all
   product app/source, the obsolete Oclif-command-plugin packet/applications,
   compatibility, example, synthetic, and the remaining exact task-2.11
   predecessor owners, explicitly retaining mixed `@habitat-ai/rawr-core` /
   `packages/core` until task 3.3.
   The deletion proves absence, not later agent,
   development, generator, source-bundle, runtime, or generic-law realization.
   Land the product-separation boundary and verify Marketplace remains an
   independent content repository.
7. Finish the non-runtime Habitat cleanup: classify existing SDK exports without
   empty shells, land the qualified telemetry owner, remove the mixed core
   identity, move the terminal SDK atomically to `packages/core/sdk`, then
   remove the ownerless root Elysia/Inngest declarations and prove current
   SDK/CLI cold packed isolation without adding metadata, exports, loaders,
   runtime projects, or blueprints. Pass Habitat exact-main with all Rawr-named,
   dead, and mixed predecessors absent.
   Write generic packets as design material, then activate each closed kind law
   only with its first conforming owner. The first live private runtime
   implementation opens only after this gate.
8. Build and seal one artifact handoff at a time: one finite cold
   `ProcessCatalog`, normalized derivation, compilation, provider-effect plans,
   ordered boot plan, one `effect@4.0.0-beta.101` `ManagedRuntime` created from
   one substrate `Layer.effectContext` lifecycle adapter, forced context before
   mount, process access, service binding, registry, execution runtime, adapter
   result, native harness handle, mounting-owned `StartedHarness`, and
   non-authorizing observation. The bootgraph remains ordinary order data,
   domain services remain Habitat services rather than Effect Layer nodes, and
   no second root Scope or per-execution ManagedRuntime is admitted. After
   provider-plan law exists, adopt the semantic-ledger and
   temporal-inquiry resource/provider sinks, assemble their public contracts
   and optional Fluree providers through the exact SDK subpaths, and publish no
   separate resource/provider package.
9. Realize the Habitat self-host through the Oclif vertical. Task 11.4 first
   creates `plugins/cli/topics/foundation` / private
   `@habitat-ai/plugin-foundation`, selects it into the Habitat app/profile, and
   lands the private CLI source-bundle contract and final closed generic
   Oclif-app/CLI-topic laws with `habitat resolve`; `habitat check` and `habitat
   hook` follow through the same path. Task 12.1 then creates the final private
   agent-plugin topic/overlay and app/profile selections and runs every installed
   `habitat agent plugins` command with real telemetry. Realize development at
   task 12.2, native generator mechanics at task 11.6, and the selected private
   authoring topic/command projections at task 12.3; native
   plugin management is already transferred by task 2.10a rather than rebuilt
   here.
10. Add Elysia/oRPC, native `inngest@4.18.0`, and web adapter/harness
   realizations only with indispensable owner-local Habitat conformance
   fixtures. The oRPC fixture proves synchronous/Promise native `.handler`,
   implementation-owned official `.effect`, bridge-owned request-fiber
   execution, process-owned `effect/context`/`effect/wrap`, abort, resource
   release, and one module realm; `handlerGen` remains vendor-internal and every
   manual/custom Effect runner is rejected. A real built Elysia child and native
   Inngest Serve child prove distinct process identities and leases, sibling
   stop/restart independence, async pre-mount failure without server teardown,
   and native stop before process release. `effect-inngest` is rejected. A
   conditional external `mcp-openapi@1.0.0` companion may run only after an
   independently versioned artifact exists, through the public companion
   descriptor/health contract, with no copied tarball, prompts claim, or direct
   official-MCP-SDK implementation. No fixture becomes a production app,
   service, plugin, or package.
11. Audit unreachable residue and pass the complete local Habitat gate. Audit
   the already-landed telemetry resource/provider, runtime-owner, app-selected
   Oclif, server, and async receipts, then retire the held mixed source only when
   every destination receipt is exact. This checkpoint adds no backend,
   profile, provider, Oclif wiring, placeholder, or delayed authority transfer.
12. Land the complete Habitat stack on canonical `main`, pass exact-main CI,
    and use `nx release` for the second and final initiative checkpoint to tag, publish, and registry-smoke
    `@habitat-ai/sdk` plus the separate `@habitat-ai/cli` executable. Assemble
    the selected telemetry provider only into the optional
    `@habitat-ai/sdk/telemetry` subpath. Record exact versions, source commit,
    provenance, and integrity; publish no internal runtime, telemetry, or Rawr
    package cohort.
13. The Rawr owner-local OpenSpec then upgrades the already installed consumer
    integration through `nx migrate @habitat-ai/cli@<released-version>`. The
    migrated CLI dependency supplies the exact `@habitat-ai/sdk` version. New
    consumers use `bunx nx add @habitat-ai/cli --no-interactive` once; later
    upgrades use `nx migrate`.
    Genuine corpus, Hyperresearch, and session commands receive Rawr-native runtime
    acceptance there. Separate later Rawr changes may then adopt the workstream
    domain through the released semantic-ledger subpath, re-author the accepted
    research service through the released runtime, and receive the unique
    specification-toolbox references as non-executable governance guidance; no
    source returns to Habitat.
14. Re-run exact-main gates in Habitat and Rawr, verify Marketplace remains
    independent content authority, then notify research and downstream consumer
    lanes and drain both Graphite repositories.

Rollback reverts the latest complete semantic Graphite node. It does not leave
the new reader with the old writer, reactivate an alias, or create a second
runtime as a fallback.

The current web surface is a static Vite/React product host with no selected
runtime resource or Effect boundary, so it is deleted with the flattened app
roots. A generic web adapter/harness build handoff is admitted only through an
indispensable Habitat owner-local conformance fixture; it does not create a
browser managed runtime until a selected platform or downstream plugin requires
one.
