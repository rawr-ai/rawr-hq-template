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

Magic Migration contributes two distinct evidence snapshots. Clean `main` at
`4e2f5d63e964f8299a25172ece4d5d38f6f18655`, tree
`88f0f24e98ba057c43f5aa6e93de4c7a510c0b11`, is the stable blueprint snapshot.
The latest applicable committed implementation is
`c4d9aa83917c303510f9621494dd9c7e6933587a`, tree
`f062e173a14d787fc43adfa9c7061f605b6074ea`, on local branch
`codex/activate-assistant-led-submission`. Only that committed object is
admitted; its dirty worktree is excluded. Together they confirm useful native
mechanics: an abstract app/composer/entrypoint/runtime-boundary split, service
context lanes and narrowing, one root `Effect.scoped` application lifetime,
provider-owned `Effect.acquireRelease`, typed resource errors,
cancellation-preserving oRPC translation, and direct resource/provider faces.
They do not implement the canonical realization pipeline: provider selection
and acquisition remain in concrete app wiring, derivation and compilation are
absent, mounting is direct, and no runtime telemetry backend is configured or
proven. Those mechanics are implementation evidence beneath the reviewed
normative parent, not a runtime or source topology to port wholesale.

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
| `RawrCommand`, `RawrResult`, and duplicate Habitat output support | Habitat CLI mechanics after deletion of the Rawr symbols | Consolidate retained result, error, and output behavior into one Habitat command contract owned by `@habitat-ai/cli`; do not preserve or rename either Rawr symbol. |
| `findWorkspaceRoot` and Habitat-side Rawr workspace-discovery lookups | no retained owner | Delete product-named workspace discovery and bind explicit Habitat workspace input at the CLI boundary. Product-owned Rawr configuration transfers unchanged with its product owner. |
| Generic runtime observation contracts | Habitat core | Define through `@habitat-ai/sdk`; they carry correlation and observation law but select no backend. |
| Current Rawr-named telemetry singleton and signal hooks | no valid final owner | An early native-telemetry companion slice moves the concrete OpenTelemetry Node implementation to the qualified Habitat telemetry resource/provider and deletes the mixed-core singleton and hooks before core reservation. The selected provider remains resource-owned source and is distributed through one optional `@habitat-ai/sdk/telemetry` integration subpath rather than a third package or the CLI host. After runtime lands, the companion adds Habitat profile selection without moving provider ownership again; downstream products select only the released integration in their own repositories. |
| `packages/habitat-sdk` | Habitat core | Move wholly to `packages/core/sdk` while retaining the sole public package identity `@habitat-ai/sdk`. |
| `packages/hq-sdk` API/workflow declarations and composition | predecessor evidence | Do not move the current self-classifying API builders or Inngest-shaped workflow builders into the public SDK. After the canonical runtime owners exist, implement the accepted topology-specific server/internal faces and host-neutral async faces fresh, reusing only proven generic algorithms. |
| `packages/hq-sdk` service metadata and generic middleware/dependency contracts | Habitat authoring | Move `BaseMetadata`, `ServiceMetadataOf`, `procedureMetadata`, `getProcedureMetadata`, analytics/observability middleware factories, `AnalyticsClient`, and `Logger` to `@habitat-ai/sdk/service` with their retained platform readers. Product policy wrappers do not remain in Habitat. |
| `packages/hq-sdk` service binding declarations and mechanics | predecessor evidence | Delete the current pre-runtime declarations, `BoundService`, `bindService`, and cache mechanics during separation. Author the canonical cold binding declarations fresh in `runtime-definition` and live mechanics fresh in `runtime-process-runtime`; retain no bridge. |
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
| `@habitat-ai/cli` package at `apps/habitat` | Habitat foundational executable | Own Oclif loading, initialization, generators, foundational command implementations, and the executable projection selected by the Habitat self-host; it does not own app selection. |
| `scripts/habitat` workspace-policy tool | Habitat tooling | Retain as the workspace-policy tool selected by the self-host, normalize its Nx metadata as a tool rather than an application, and do not let it become a second app, CLI, or self-host authority. |
| `tools/workstream-plugin-pack` | Habitat tooling | Retain as qualified non-public Habitat tooling; it remains outside Rawr and outside the public SDK/runtime package closure. |
| `apps/cli`, `apps/hq`, `apps/server`, and `apps/web` plus their private package identities | no retained application owner in Habitat | Move their retained platform capabilities to the exact Habitat owner, import only the proven Rawr services/topics into Rawr, and delete every app root and all remaining composition. Do not create `apps/rawr`, a compatibility app, or an alias in Habitat. |
| `services/agent-plugin-lifecycle` | Habitat platform | Retain as the service behind `habitat agent plugins ...`; select `content-workspace`, package-output, native-provider, and versioned-content resources through the Habitat self-host. |
| `services/dev`, `packages/dev-node`, and the DevOps CLI topic | Habitat platform | Retain development, Git, Graphite, repository, stack, and worktree operations under qualified Habitat service/package/topic owners, including the scoped `dev stack doctor`; do not confuse it with the deleted root `doctor` command. |
| `services/session-intelligence` and Session Tools commands | proven Rawr product | Import the cohesive service/topic projects into Rawr. Their closed Codex/Claude transcript discovery, parsing, indexing, search, and projection semantics are product behavior, not a provider-neutral Habitat session substrate. |
| `services/chatgpt-corpus` and the ChatGPT corpus topic | proven Rawr product | Import the cohesive service/topic projects into the independent Rawr repository and govern them there. No copy remains in Habitat. |
| `services/hyperresearch-codex` and genuine Hyperresearch topics | proven Rawr product | Import the cohesive service/topic projects into the independent Rawr repository; remove synthetic `codex-slice` and `run-fixture` commands from production membership and retain only indispensable owner-local test fixtures. |
| `services/hq-ops` and the `hq attach/down/restart/status/up` shell/PID implementations | replaced platform predecessor | Delete the service and shell/PID control path. Runtime mounting owns start/stop coordination and runtime observation supplies non-authorizing status projections; no `hq` compatibility topic remains. |
| `services/example-todo` and `plugins/server/api/example-todo` | no production owner | Delete both production projects. Retain only an indispensable owner-local service or API fixture under the behavior it tests. |
| `resources/agent-plugin-package-output`, `resources/content-workspace`, `resources/native-agent-provider`, and `resources/versioned-content`, including their providers | Habitat platform | Retain under qualified Habitat resource/provider owners and select them from the Habitat agent-plugin lifecycle profile. |
| `resources/agent-plugin-export-destination` and its provider | no reachable owner | Delete the unreachable predecessor. Agent-plugin export behavior remains valid through the package-output/content lifecycle; it does not authorize an export-destination resource. |
| Native Oclif plugin install/link/list/inspect/update/reset/uninstall mechanics | Habitat platform | Retain in `@habitat-ai/cli` under the external `habitat plugins ...` surface, separate from curated agent-plugin lifecycle. |
| `config show` and `config validate` | no retained current owner | Delete the Rawr configuration schema, paths, and commands. A future Habitat app/profile inspection surface must be authored from the canonical app contract rather than renamed from product configuration. |
| `journal tail/search/show` | no retained current owner | Delete the current journal modules and commands: their production writer is already retired, and no Habitat platform invariant consumes the stored records. |
| `security check`, `security report`, and `security posture` | no retained current owner | Delete the Rawr repository policy, `.rawr/security` state, unused gate behavior, and command surfaces. Future Habitat admission or release security requires its own qualified owner and live consumer. |
| `cli command create` and `cli extension create` verified-write mechanics | Habitat platform generators | Re-author through Habitat's native Nx plugin/generator boundary and command contract. Delete Rawr templates, destinations, names, and command-base dependencies rather than renaming the predecessor classes. |
| Root `doctor`, `hq graph`, `reflect`, `routine check`, `routine snapshot`, `tools export`, `workflow harden`, `security posture`, and `agent plugins create` from Template | no retained owner | Delete the commands and their private helpers/readers. Similar future capabilities require separately accepted Habitat behavior. |
| `hello` command plugin | no retained owner | Delete the production project; keep no example plugin package. |

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
- Make app, profile, compiler, provider plan, bootgraph, process runtime,
  adapter, harness, and observation ownership mechanically visible and closed.
- Preserve one process-owned Effect runtime and one execution path for every
  owner-authored Effect body reached from a native host through Habitat runtime;
  the nearest service, plugin, or app remains its owner.
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
- Moving product/domain behavior into runtime, adapters, or harnesses.
- Publishing Rawr, internal runtime owners, resources, services, or plugins as
  a public package cohort.
- Keeping compatibility apps, aliases, fallbacks, a second runtime, or the lab
  package after cutover.
- Making telemetry, PostHog, Langfuse, HyperDX, or EVLog a prerequisite for the
  generic runtime spine. Runtime observation contracts are required; backend
  implementation and profile wiring remain in the native-telemetry companion
  workstream, which consumes the landed spine before final repository closure.

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
behavior. Runtime mounting owns cross-owner finalization. Runtime observation
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
| `packages/core/runtime/harnesses` | `runtime-harnesses` | `runtime-compiler`, `runtime-process-runtime` |
| `packages/core/runtime/observation` | `runtime-observation` | `runtime-definition` |
| `packages/core/runtime/mounting` | `runtime-mounting` | `runtime-definition`, `runtime-process-runtime`, `runtime-harnesses`, `runtime-observation` |

The IDs in this table are unscoped Nx scheduler identities only. They MUST NOT
appear as package names, workspace links, import specifiers, registry
identities, or release members. Each root has `project.json` and its
blueprint-qualified source and tests, but no `package.json`. Dependency arrows
are consumer to dependency and the table admits no other private edge. The one
terminal public project remains
`@habitat-ai/sdk` at `packages/core/sdk`; its assembly graph contains the exact
direct edges `@habitat-ai/sdk -> runtime-schema`, `runtime-definition`,
`runtime-derivation`, `runtime-compiler`, `runtime-bootgraph`,
`runtime-substrate-effect`, `runtime-process-runtime`, `runtime-harnesses`,
`runtime-observation`, and `runtime-mounting`. Real source/build references, not
publication metadata or an `implicitDependencies` substitute, must establish
those edges. No private runtime project imports the SDK facade.

The closed runtime graph is distinct from three qualified integration pairs.
The SDK may also assemble only telemetry/OpenTelemetry Node,
semantic-ledger/Fluree HTTP, and temporal-inquiry/Fluree HTTP through their
named optional subpaths. Those source-owned resource/provider projects remain
private, do not join the release group, and leave no workspace dependency in
packed output. No other non-runtime SDK assembly edge is admitted.

There is no `standard` root or Nx project. A generic runtime package would hide
ownership rather than name a capability; reusable private code stays with the
qualified runtime owner whose invariant it serves.

`runtime-definition` remains cold. It owns app/profile/entrypoint declarations,
the TypeBox `RuntimeObservationRecord` accepted from upstream owners, and the
narrow non-authorizing `RuntimeObservationPort` earlier phases can consume.
`runtime-observation` implements that port and projects read models only.
`runtime-mounting` owns the live `startApp(...)` path, harness invocation, and
cross-owner finalization. The terminal SDK exposes `startApp(...)`, but no
upstream private owner imports the SDK facade, mounting owner, or observation
implementation.

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

The generated owner-local `check:policy` target remains cacheable, lists the
exact closed blueprint, rule, owner-root, toolchain, and environment inputs it
can read, and declares `outputs: []`; a broad workspace glob is not an accepted
stand-in. Project creation, exact direct edges, the SDK assembly edge, and
target realization land atomically with the owner's first conforming
implementation. Acceptance runs each new owner target once cold and once
unchanged to prove cache hits, then changes one declared relevant input and
proves only the expected dependent work invalidates. The underlying command of
any restored cacheable task must not execute.

`schema`, `definition`, and `derivation` are the upstream private owners
consumed by later runtime phases. The terminal SDK exposes only the stable
public subpaths and assembles the reachable runtime closure into the SDK package
output. Consumers install one SDK package and its ordinary external
dependencies, never an internal runtime cohort or workspace link.

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
dead or mixed owners are absent. The native-telemetry companion has landed its
qualified resource/provider and deleted the singleton, and the remaining empty
mixed-core package/project identity is removed.
The predecessor `packages/habitat-sdk` path then moves atomically to
`packages/core/sdk`, leaving `packages/core` as a namespace rather than a
package. No alias or compatibility facade survives.

The exact public export contract is:

```text
@habitat-ai/sdk
@habitat-ai/sdk/app
@habitat-ai/sdk/effect
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
integration subpaths behind conditional imports and optional peer metadata;
they are not additional release members or eagerly loaded SDK dependencies.

Native host vendors are optional peer dependencies supplied by the selected
application. Each vendor import lives behind its owner-local conditional dynamic
import boundary and is reached only from that selected subpath. The installed
Habitat CLI must not install, load, or declare direct dependencies on server- or
async-only vendor packages. Registry acceptance inspects packed metadata,
static reachability, and real loading for each public subpath and selected
process rather than accepting one aggregate bundle smoke.

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
and is not admitted. The compiler owns the bounded diagnostic normalization its
contract requires; later owners consume the compiler artifact rather than its
private helpers. Derivation normalizes the selected direct faces, and
compilation proves coverage before any provider builds.

### Derive first; compile only normalized facts

The private core derivation owner converts import-safe app, profile, resource, provider, service,
plugin, and executable declarations into the normalized graph, descriptor
references and table, service binding plans, surface runtime plans, provider
selections, and portable diagnostics. It performs no acquisition or mounting.

The runtime compiler consumes only derived artifacts and selected process facts
and emits one complete `CompiledProcessPlan`. Empty service, workflow, or
surface collections remain explicit when a narrow vertical does not use them.
The plan still contains resource, service, surface, execution, adapter, harness,
and bootgraph inputs required by downstream phases.

The pure identity, closure, cycle, duplicate, and route-matching algorithms in
the lab may be ported after their inputs and outputs are reshaped to the frozen
contracts. The lab's truncated `CompiledProcessPlan` is rejected.

### Give one Effect kernel the process lifecycle

Providers are cold descriptors that own resource requirements, provider config
schema/decoder, observation redaction metadata, health/refresh metadata, and
`build(...)`. Provisioning validates provider-local config and passes the full
validated value through provider build, acquire, and release. Only provider-
owned diagnostic, telemetry, and catalog projections apply redaction. The build
context receives the definition-owned `RuntimeObservationPort`; it never imports
the downstream observation implementation. Its
`ProviderEffectPlan` owns cold acquire/release execution plus admitted execution
policy and telemetry labels; it does not own dependency order or live
registration. Bootgraph owns resource keys, dependency order, deduplication,
rollback order, static finalization order/policy metadata, and the provider
reference. The Effect kernel owns one root `ManagedRuntimeHandle`, scope,
provider-owned config decoding, provider build after dependencies exist,
acquisition, registration of that plan's release after successful acquisition,
and reverse release for one OS process.

`ProcessRuntimeAccess` never exposes raw `Layer`, `Context`, `Scope`,
`ManagedRuntime`, provider internals, or secrets. Services and plugins declare
requirements; apps select providers; only provisioning acquires them.

The lab's provider dependency, rollback, redaction, and release-continuation
fixtures are retained as behavior oracles. Its Promise boot modules, WeakMap
plan identity, and per-`ProcessExecutionRuntime` managed runtimes are rejected.
Magic's root `Effect.scoped` ordering and provider-local
`Effect.acquireRelease` implementations are additional vendor-shaped evidence;
its live product resource bag and entrypoint-selected providers are not.

### Centralize live execution in process runtime

Process runtime consumes `CompiledProcessPlan`, the matching non-portable
descriptor table, and `ProvisionedProcess`. It owns service binding and cache,
execution-registry assembly, `ProcessExecutionRuntime`, scoped runtime access,
adapter coordination, mount-ready records, and one idempotent process stop
handle. It never invokes a harness or projects observation read models. Runtime
mounting owns harness invocation and cross-owner single-flight settlement;
runtime observation alone projects final read models.

The execution registry admits an executable only when compiled plan and
descriptor identity agree exactly. Native callbacks may return Promises, but
every app-, service-, or plugin-owned Effect body invoked through the Habitat
runtime delegates to `ProcessExecutionRuntime`; oRPC
context, Inngest steps, and Oclif hooks are projections, not alternate runners.

The lab's exact registry matching and post-stop refusal logic are ported after
removing its runtime construction and incomplete invocation context.

### Define harness once, then realize native interiors

The generic harness contract consists of an import-safe descriptor, a runtime
mount input containing only adapter-lowered payloads and bounded access, and an
owner-local native handle with idempotent stop. Runtime mounting invokes the
harness and owns `StartedHarness`, including bounded native-handle references
and observation records. It orders mount, reverse stop, and process release;
it does not
define a drain protocol or interpret command, HTTP, durable workflow, or web
semantics. When a native host drains, its idempotent `stop()` owns that behavior.

Surface adapters alone translate `CompiledSurfacePlan` into native payloads.
They may create callbacks that delegate to `ProcessExecutionRuntime`; they do
not execute during lowering or mount hosts.

Vendor realizations retain their native laws:

- Oclif uses low-level `run`; root `finally` and output flush settle before
  runtime release, and Oclif `handle` runs last.
- Elysia owns its server and one graceful `stop(false)`. Runtime mounting waits
  for native settlement, then invokes the process-runtime stop handle before
  provider release; deadline expiry remains a
  truthful `draining` outcome and never triggers a second `stop(true)` call.
- oRPC native callbacks retain validation, middleware, declared-error,
  transport, and abort semantics while delegating Effect execution directly to
  `ProcessExecutionRuntime`. The installed
  `@orpc/experimental-effect@2.0.0-beta.23` `handlerGen` and `.effect` extension
  are excluded from this path because they call their own
  `Effect.runPromiseExit` terminal.
- Inngest Serve drains with the owning HTTP harness; Connect uses native
  `close()` and disables vendor signal ownership; stable `step.run` callbacks
  delegate Effect work to process execution.
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

The app and SDK blueprint packets plus the exact `runtime-schema`,
`runtime-definition`, `runtime-derivation`, `runtime-compiler`,
`runtime-bootgraph`, `runtime-substrate-effect`, `runtime-process-runtime`,
`runtime-harnesses`, `runtime-observation`, and `runtime-mounting` private-owner packets define one
positive root shape and allowed descendants through root `structure.toml` files
and focused Grit patterns. Adapter law is an owner-local overlay within the
process-runtime or harness packet, not an additional runtime-owner packet. All enabled
blueprints are closed. A packet may land as non-enforcing design material first,
but each enabled kind law co-lands with its first conforming owner so every
Graphite node remains green and truthful. There is no red baseline or exception
lane.

Nx owns package/project classification, cross-project/package import direction,
standard task composition, and cache inputs. Habitat owns closed filesystem
shape. Focused positive Grit import forms plus owner-local fixtures prove the
internal module direction that Nx cannot see. TypeScript owns capability
visibility. Behavior and installed-artifact tests prove runtime uniqueness,
acquisition, release, and public reachability. No manual phase-gate or structure
script is introduced when those owners can express the invariant; Grit does not
claim process-wide semantic proofs.

Magic's abstract app package, composer, entrypoint, and runtime-boundary
separation plus its service and resource/provider laws are admitted as useful
deltas after comparison with the existing Habitat packets. Its concrete
`apps/server` source topology, direct provider selection/acquisition, service
client factories, route composition, Inngest mounting, and product-specific
runtime inventory are not ported. Habitat adds the missing generic profile,
compiler-before-acquisition, process-runtime, harness, diagnostic-catalog, and
observation laws and projects the settled law back to Magic as the consumer
authority.

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
the same Graphite node. The old `apps/cli`, `apps/server`, `apps/hq`, and
`apps/web` project identities, mixed `packages/core` contents, direct telemetry
singleton, bootgraph shell, and entrypoint-local runtime acquisition cannot
coexist with a completed replacement owner. No compatibility path survives any
cutover; the final repository pass only verifies that unreachable residue is
absent.

### Keep observation and telemetry downstream of runtime authority

This change implements `RuntimeDiagnostic`, `RuntimeCatalog`, and
`RuntimeTelemetry` in `runtime-observation` as non-authorizing process
observation. It does not choose a backend or wire production exporters. The
current Rawr-named singleton is not an admitted provider: an early companion
slice replaces it with the qualified Habitat OpenTelemetry Node
resource/provider and retires its process-global signal hooks before
`packages/core` is reserved. The provider stays source-owned by that resource,
while the optional public integration is assembled into
`@habitat-ai/sdk/telemetry`; it is not a third package and is not hidden in
`@habitat-ai/cli/host`. After the runtime spine lands, the native telemetry
workstream consumes the exact checkpoint through the canonical
`RuntimeProvider -> ProviderEffectPlan` input and adds the required Habitat
profile integration. A downstream product may later select the released
integration in its own repository; the companion owns only the generic
telemetry provider and integration.
Oclif, Elysia/oRPC,
Inngest, EVLog, ClickStack, and shutdown integration remain downstream.

The observability companion document owns signal meaning, correlation,
redaction, backend receipt, and telemetry/analytics boundaries. It attaches to
the canonical runtime observation section; it does not add another realization
phase.

### Use two exact-main public release checkpoints

This migration has exactly two public checkpoints, both through the existing
fixed Nx Release group and both containing only `@habitat-ai/sdk` and
`@habitat-ai/cli`:

1. The **pre-separation interface release** follows task 2.8. It contains only
   the final `service@1` pack, `runtime-schema` adaptation, service metadata and
   middleware contracts, host-neutral client contracts, and Habitat command
   contract needed for the finite Rawr move. Its exact main commit exclusively
   authorizes that first release.
2. The **final runtime release** follows task 15.5. It contains the completed
   runtime, harness, resource-integration, telemetry, and CLI closure. Its exact
   main commit exclusively authorizes that second release.

Each checkpoint passes the local packed-tarball installed-package acceptance
before tag or registry mutation and then registry-smokes the same two packages.
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
- **Generic harness machinery absorbs vendor semantics** -> keep only the
  shared mount/stop shape generic and prove each vendor with native fixtures and
  exact installed-source review.
- **The lab reintroduces stale public types** -> port algorithms and behavior
  tests selectively; never import or publish the lab package.
- **Runtime observation becomes lifecycle authority** -> keep observation
  write-only from the realization path and prove observation failures do not
  change product outcomes or release ordering.
- **Source movement disrupts existing consumers** -> move each reader and
  writer in the same semantic node, run Nx affected gates, and delete the old
  owner rather than retain aliases.

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
4. In Habitat, land and registry-smoke the bounded pre-separation interface
   release containing the final TypeBox service-schema,
   service metadata/middleware, host-neutral client, and Habitat command
   interfaces needed by the destination projects. Delete the Rawr command base,
   migrate only admitted Rawr and retained Habitat readers to the one Habitat
   command contract, and delete already-condemned reader closures rather than
   adapting them. Defer retained Habitat workspace-discovery readers and the
   predecessor discovery deletion to their final owner/deletion boundaries;
   product-owned Rawr configuration stays with its product owner. Expose no
   Oclif host seam before the final runtime vertical. This is the sole non-live private runtime
   prerequisite before separation and publishes only `@habitat-ai/sdk` plus
   `@habitat-ai/cli`. Its accepted exact-main commit authorizes only this first
   release checkpoint.
5. Restack Session Metrics onto the admitted session service. Use native
   `nx import` from the frozen Habitat source/ref with explicit source and
   destination directories to import only the proven ChatGPT corpus,
   Hyperresearch, and session-intelligence service/topic projects with filtered
   Git history. Import cohesive projects together where possible and otherwise
   import dependency leaves first. Reconcile destination root configuration and
   local dependency edges, pass the Rawr Nx graph and behavior gates, and land
   Rawr canonical `main`. Create no copier, mirror, sync, or continuing source
   relationship.
6. In Habitat, move every retained pre-runtime platform capability to its exact
   service, resource/provider, CLI, SDK, tool, or owner-local fixture destination.
   Delete all product app/source, compatibility, example, and synthetic
   production owners rather than parking them in not-yet-created runtime owners,
   and land the product-separation boundary. Verify Marketplace remains an
   independent content repository.
7. Finish the non-runtime Habitat cleanup: classify existing SDK exports without
   empty shells, land the qualified telemetry owner, remove the mixed core
   identity, and move the terminal SDK atomically to `packages/core/sdk`. Pass
   Habitat exact-main with all Rawr-named, dead, and mixed predecessors absent.
   Write generic packets as design material, then activate each closed kind law
   only with its first conforming owner. The first live private runtime
   implementation opens only after this gate.
8. Build and seal one artifact handoff at a time: normalized derivation,
   compilation, provider-effect plans, ordered boot plan, scoped acquisition,
   process access, service binding, registry, execution runtime, adapter result,
   native harness handle, mounting-owned `StartedHarness`, and non-authorizing
   observation. After provider-plan law exists, adopt the semantic-ledger and
   temporal-inquiry resource/provider sinks, assemble their public contracts
   and optional Fluree providers through the exact SDK subpaths, and publish no
   separate resource/provider package.
9. Realize the Habitat self-host through the Oclif vertical. Run `habitat
   resolve`, `habitat check`, `habitat hook`, and `habitat agent plugins status`
   through the one command contract, explicit host/workspace binding, runtime
   mounting, and observation. Realize development/repository, native plugin,
   and generator
   capabilities through the same platform-owned path.
10. Add Elysia/oRPC, Inngest, and web adapter/harness realizations only with
   indispensable owner-local Habitat conformance fixtures. No fixture becomes a
   production app, service, plugin, or package.
11. Audit unreachable residue and pass the complete local Habitat gate. Publish
   each sealed runtime checkpoint to the native-telemetry companion so its
   Habitat profile selection restacks against the qualified resource/provider
   established before core reservation.
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
    consumers use `nx add @habitat-ai/cli` once; later upgrades use `nx migrate`.
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
