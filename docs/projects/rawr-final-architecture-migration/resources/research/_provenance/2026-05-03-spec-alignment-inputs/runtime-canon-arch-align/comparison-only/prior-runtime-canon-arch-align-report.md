# Aligning the canonical architecture spec with the runtime realization spec

The canonical architecture specification is structurally sound. It does not need to be restructured, rewritten, or reframed. Its section topology — ontology, laws, repo topology, service / resource / plugin / app models, runtime realization, roles and surfaces, agent shell, stack binding, operational mapping, cross-cutting boundaries, enforcement orientation, invariants, forbidden patterns, flexibility, final picture — is well-matched to the concern surface that the runtime realization specification has hardened. What it needs is targeted additions and strengthenings in roughly twenty places, clustered around four families: the execution-spine vocabulary that companion subsystem specs already invoke, the process-local coordination resource family with its NOT-durable invariant, the full ownership-law actor chain, and the integration vocabulary that allows companion specs to attach to named seams without inventing terminology of their own.

One genuine design contradiction survives the user's resolution heuristic that the runtime realization spec is authoritative on runtime concerns. It is the WorkflowDispatcher emission-rights question for the agent / shell role: the canonical arch spec contradicts itself between §10.10 and §12.4, and the runtime spec does not enumerate per-role emission rights. This is system-level governance, not runtime implementation, so the heuristic does not resolve it. The user must decide whether agent / shell plugins may call `WorkflowDispatcher.send(...)` through their own execution context, or whether they must always proxy through a server-internal surface. Once decided, the canonical arch spec gets the lock and the runtime spec realizes it.

The remaining apparent disagreements between the two specs are either incompleteness on the architectural side — gaps where the runtime spec has moved further than the canonical arch spec has yet absorbed — or properly resolved by the heuristic. Twelve division-of-responsibility rules, derivable from end-to-end reading of both specs, convert the alignment work into a stable boundary that companion subsystem documents (auth, deployment, async, OpenShell, MAWE, factory bundle, workstreams) can attach to without colliding with runtime authority.

## 1. Document scope and structural diff

The two specifications occupy distinct authority planes and, on the whole, respect each other's scope. Reading them end-to-end against the question "where does each one own a concern, and where does each one merely reference it?" yields a small set of overlap regions where the canonical arch spec describes runtime internals at depths the runtime spec now owns more precisely, plus a larger set of integration seams where the canonical arch spec is silent on artifacts that companion specs already invoke.

### 1.1. The runtime realization spec — scope and authority

The runtime realization spec (RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md, 5264 lines) owns the bridge from selected declarations to a running process per `startApp(...)`. Its top-level structure walks: purpose and scope (§1), fixed outcome (§2), authority planes and ownership laws (§3), canonical topology and package authority (§4), import safety (§5), layered naming (§6), schema ownership and `RuntimeSchema` (§8), Effect execution components (§9), app and entrypoint authoring contract (§10), service runtime boundary contract (§11), plugin authoring contract (§12), resource / provider / profile (§13–§15), process-local coordination resources (§16), SDK derivation (§17), runtime compiler (§18), bootgraph and Effect kernel (§17 in the recent renumbering — referenced here as the bootgraph section), process runtime and runtime access (§18), WorkflowDispatcher and async integration (§19), surface adapter lowering (§20), harness contracts (§21), diagnostics, telemetry, and `RuntimeCatalog` (§22), cross-cutting concerns (§23), end-to-end assembly flows (§24), enforcement rules (§25), load-bearing matrix (§26), component contract summary (§27), canonical picture (§28), and lock authority (§29).

Its authority claims are explicit: it is authoritative on all runtime concerns and supersedes older indexed documents. It explicitly denies authority over service domain truth, projection meaning, app identity, deployment placement, public API semantics, durable workflow semantics, shell governance, desktop-native behavior, and web framework semantics. It also names ~14 reserved boundaries (§23.5) where companion specs are expected to attach.

### 1.2. The canonical architecture spec — scope and authority

The canonical architecture spec (RAWR_Canonical_Architecture_Spec.md, 2955 lines) is the umbrella architecture document. Its scope claim (§1) covers the universal architectural shape, ontology, role / surface model, service boundary ownership, SDK posture, app composition, runtime realization lifecycle, operational mapping, default topology, and enforcement orientation. It positions itself as "the canonical integrated plug-and-play architecture layer" and explicitly states that subsystem specifications attach to it at named integration boundaries.

Its top-level structure walks: scope (§1), architectural posture (§2), core ontology (§3), canonical laws (§4), canonical repo topology (§5), service model (§6), resource / provider / profile model (§7), plugin model (§8), app model (§9), runtime realization (§10), runtime roles and surfaces (§11), agent shell and steward activation (§12), stack binding (§13), operational mapping and growth model (§14), schema / config / diagnostics / policy boundaries (§15), mechanical enforcement orientation (§16), canonical invariants (§17), forbidden patterns (§18), what remains flexible (§19), and the final canonical picture (§20).

It is not authoritative on runtime semantics internally. Its job is to name the integration vocabulary at system level, fix the laws that govern composition, and refer companion specs to the bodies that own the mechanics.

### 1.3. The structural diff — where the topologies match and where they don't

The two topologies are deliberately offset. The runtime spec is depth-first on runtime concerns; the canonical arch spec is breadth-first on platform concerns. Each is the right shape for its job. Four observations follow.

First, the canonical arch spec's section ordering is correct and does not need restructuring. Ontology → laws → topology → models → realization → roles → harnesses → operations → cross-cutting → enforcement → invariants → forbidden → flexible → picture is exactly the integration document's natural flow. There is no proposal in this report to move, split, or merge top-level sections.

Second, the canonical arch spec covers all 14 areas its §1 scope claims. Coverage is structurally complete.

Third, the canonical arch spec is largely shape-correct on runtime internals. Where it touches runtime mechanics — §10.5 (compiler), §10.6 (bootgraph and provisioning kernel), §10.8 (runtime access), §10.9 (service binding), §15.4 (diagnostics) — it uses the right vocabulary at the right depth. It does not attempt to enumerate `CompiledProcessPlan` fields, `BootResourceModule` schema, or the 50+ diagnostic codes that the runtime spec now owns. Those passages do not need to be cut. They need to be cross-referenced more explicitly.

Fourth, and the substance of this report: the canonical arch spec is integration-thin in a small number of places where the runtime spec has hardened normative content the canonical arch spec must absorb at system-level vocabulary depth. The execution-spine artifacts (`EffectExecutionDescriptor`, `ExecutionRegistry`, `ProcessExecutionRuntime`, `EffectRuntimeAccess`, `ManagedRuntimeHandle`) are referenced by every runtime-boundary section in the canonical arch spec but never named in §3.3. The process-local coordination resources (`ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessCacheHubResource`, `ProcessConcurrencyLimiterResource`) and their NOT-durable invariant exist nowhere in the canonical arch spec. The full ownership-law actor chain in the runtime spec §3 collapses into "the runtime realizes" in the canonical arch spec §4.1. The Inngest connect worker is mounted in the bootgraph by the runtime spec but has no canonical-arch anchor. SDK public surfaces in §5.1 are stale against the runtime spec §4. These are not contradictions — they are absences.

The next two sections inventory the absences as integration-surface debt and as runtime-driven additions.

## 2. Integration surface the canonical architecture spec must own

The canonical arch spec exists to be the integration document that companion subsystem specs plug into. To do that job, it must own the system-level vocabulary, ownership laws, and integration boundary names. It must not own the type shapes, exact contracts, or mechanism internals — those belong to whichever spec implements them. This section inventories, per concept, what the canonical arch spec must own, what it must strengthen, and what it must defer.

### 2.1. Runtime realization lifecycle

**Must own** the seven-phase chain `definition → selection → derivation → compilation → provisioning → mounting → observation` (already present in §10.2), the producer / consumer table per phase, and the rule that finalization and rollback are observation behavior, not an eighth phase.

**Must strengthen** the phase table by naming the key artifacts produced per phase — specifically the execution-spine artifacts (`EffectExecutionDescriptor`, `CompiledExecutionPlan`, `ExecutionRegistry`) that companion specs depend on for boundary attachment. Without those names in the phase table, a companion spec author cannot point at "the artifact produced by compilation" and reference it canonically.

**Must defer** to runtime spec the exact type shapes (`CompiledProcessPlan`, `BootResourceModule` internals, `ExecutionDescriptorTable` exact generics).

### 2.2. Ontology — service / plugin / app / role / surface

**Must own** the complete vocabulary (already present in §3), the ownership law (§4.1), and the lane model (§3.5, §6.4).

**Must strengthen** the §4.1 ownership law to match the runtime spec §3 form. The current §4.1 reads, in compressed form: "Services own truth. Plugins project. Apps select. Resources declare capability contracts. Providers implement capability contracts. The SDK derives. The runtime realizes. Harnesses mount. Diagnostics observe." The runtime spec instead names the runtime-plane actors individually: "The compiler plans processes. Bootgraph orders lifecycle. The Effect kernel runs local execution. The process runtime assembles processes. The registry matches execution. The execution runtime runs invocations. Adapters translate surfaces. Harnesses mount hosts." That granularity is load-bearing — every companion spec plugs into one or two of those actors, not into "the runtime" as a single noun.

**Must defer** exact builder implementations and lane-specific generics to the runtime spec and companion specs.

### 2.3. Agent role versus async role

**Must own** the shell-versus-steward authority law (already present in §4.11, §11.8, §12), the canonical rule that the shell may emit durable work directly into async without a fake synchronous server hop (§12.4), and the one-trusted-operator-boundary-per-shell-gateway rule (§11.10).

**Must add** an explicit statement of agent-role emission rights for `WorkflowDispatcher`. This is the single contradiction this report carries to §5 — §10.10 currently says only server API and server-internal projections may wrap dispatcher capabilities, while §12.4 says the shell may emit durable work directly. The canonical arch spec contradicts itself, the runtime spec does not enumerate per-role emission rights, and the heuristic does not resolve it.

**Must defer** OpenShell governance, shell / tool policy adapters, and steward activation internals to the OpenShell Agent Runtime spec.

### 2.4. OpenShell beneath agent role

**Must own** the statement that OpenShell is the default substrate beneath the shell-facing portion of the agent role (already present in §12.1), the canonical runtime binding table for the agent role (§12.2), and the rule that agent governance is a reserved boundary with locked integration hooks (§8.10, §13.5).

**Must add** an explicit statement of where the OpenShell runtime resource lives (`resources/openshell/...` or analogous) as a `RuntimeResource` that the agent harness provisions.

**Must defer** OpenShell internal semantics, tool policy adapters, session lifecycle, and capability enumeration to the OpenShell spec.

### 2.5. Effect substrate under runtime boundaries

**Must own** the statement that Effect is the process-local provisioning substrate (§10.6, §13), that raw Effect imports are forbidden in ordinary authoring (§18 forbidden patterns), and that Effect stays inside runtime realization (§13).

**Must add** the import allowlist — i.e., where raw Effect imports ARE allowed: `packages/core/runtime/substrate/effect/**`, `packages/core/runtime/process-runtime/**`, `packages/core/runtime/standard/**`, `packages/core/sdk/src/**/internal/**`. The canonical arch spec §18 currently names only the forbidden zones. Implementation teams reading §18 cannot tell where Effect access is sanctioned without cross-referencing the runtime spec §5.

**Must defer** `ManagedRuntimeHandle`, `EffectRuntimeAccess`, and `lowerRawrEffect` mechanics to the runtime spec.

### 2.6. Inngest as durable async harness

**Must own** the statement that Inngest owns durable async execution semantics (§13.2), that `FunctionBundle` is harness-facing and internal (§8.7), and that `WorkflowDispatcher` materializes onto Inngest (§10.10).

**Must add** the distinction between `connect`-worker mounting (outbound WebSocket worker transport) and serve-mode mounting (HTTP endpoint). The async runtime spec depends on this distinction; the runtime spec §21.2 names it; the canonical arch spec §13.2 currently elides it. This is where the async runtime spec attaches its connect-worker model.

**Must defer** Inngest client construction, connect auth handshake, retry / resume mechanics, and native function payload schema to the async runtime spec.

### 2.7. oRPC as service / callable boundary

**Must own** the statement that oRPC is the local-first callable boundary (§6.1, §13) and that service-owned procedure contracts plus plugin API contracts remain owned by service / plugin (already present).

**Must add** the descriptor-first oRPC posture as a normative integration law: `.effect(function*)` authoring causes the SDK to capture an `EffectExecutionDescriptor`; the oRPC route / procedure wrapper stays contract-shaped; at invocation time the adapter calls `ProcessExecutionRuntime`; `ProcessExecutionRuntime` runs `RawrEffect` through `EffectRuntimeAccess`. This single sentence chain is the load-bearing system-level integration story for how the contract surface and the execution surface compose.

**Must defer** effect-oRPC adapter containment details, raw effect-oRPC imports, and exact wrapper shapes to the runtime spec.

### 2.8. Providers and resource contracts

**Must own** resource / provider / profile vocabulary and laws (§7), the provider coverage validation rule, and the profile-field naming convention (`providers` / `providerSelections`, not `resources`).

**Must add** the named process-local coordination resource family (`ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessCacheHubResource`, `ProcessConcurrencyLimiterResource`) as a distinct resource class with the explicit invariant that they are process / role-local and NOT durable. This is the cleanest worked example of the user's "be explicit about integration points so companion subsystems plug in cleanly" mandate. Without it, async, MAWE, and OpenShell specs cannot canonically classify their coordination mechanisms.

**Must defer** exact resource provider effect plan mechanics (`providerFx.acquireRelease`, `tryAcquire`, `withSpan`) to the runtime spec.

### 2.9. Harnesses and diagnostics

**Must own** the harness role enumeration (Elysia, Inngest, OCLIF, web, agent / OpenShell, desktop) and their jobs (§13), and the harness law that harnesses consume mounted surface runtimes or adapter-lowered payloads, never raw SDK graphs or compiler plans (§13.7).

**Must add** `HarnessDescriptor` and `StartedHarness` as the canonical harness integration contract names. Naming them at canonical-arch-spec level — without enumerating their TypeScript shapes — gives companion specs a stable vocabulary for harness integration.

**Must defer** per-harness internal specs, exact `HarnessDescriptor.mount(...)` signatures, and telemetry hookpoints to the runtime spec.

### 2.10. Service-centric platform operational mapping

**Must own** the entrypoint → platform service → replica mapping (§14), the rule that one platform service maps to each long-running role (§14.6), and the shell's trust-placement considerations (§14.3).

**Must add** the production entrypoint set (`server.ts`, `async.ts`, `web.ts`, `agent.ts`) and their mapping to platform services as a normative default, not just an example.

**Must defer** Railway-specific deployment manifests, container image specs, replica counts, and zero-downtime mechanics to the deployment subsystem spec.

### 2.11. Default topology

**Must own** the five repo roots (§3.1, §5), runtime internals placement under `packages/core/runtime/*` (§5.6), and plugin topology (§5.5).

**Must add** the SDK topology — the `packages/core/sdk/src/` layout with `/effect`, `/execution`, `/plugins/*/effect`, `/runtime/providers/effect`. The runtime spec §4 locks this; the canonical arch spec §5.1 only lists public SDK surfaces (and that table is itself stale).

**Must defer** exact file layout inside each sub-package to the runtime spec.

### 2.12. AppDefinition and `defineApp` authority

**Must own** that `defineApp(...)` is the app composition authority, that `startApp(...)` is the only start verb, and that `AppDefinition` is the upstream input for SDK derivation.

**Must add** the normative entrypoint prohibition: an entrypoint must not construct `ManagedRuntime`, call raw Effect runtime APIs, run `RawrEffect` programs directly, construct effect-oRPC adapters, or bypass `startApp(...)` to mount service / plugin execution manually. The runtime spec §10.3 states this normatively; the canonical arch spec §9.5 currently uses softer language ("does not manually instantiate raw Effect runtimes").

**Must defer** the exact `startApp(...)` internals and the process assembly sequence to the runtime spec.

## 3. Runtime-driven additions the canonical architecture spec is missing

The §2 inventory becomes a concrete additions backlog when expanded against the runtime spec section by section. The table below lists, for each runtime-spec section that has bearing on the canonical arch spec, the current canonical-arch coverage, the recommended action, the target arch-spec section, and the rationale. Rows that are already well-aligned are included for completeness so the diff is auditable.

| Runtime spec section | Canonical arch spec coverage today | Recommended action | Target arch section | Rationale |
|---|---|---|---|---|
| §1 Purpose / scope; execution-ownership-law | Partially covered — §4.1 has compressed form | Strengthen | §4.1 | Runtime spec has fuller 15-line compact law; arch spec has 9-line collapsed version |
| §1 single-execution-terminal.txt | Not covered | Add | §4.1 or new §4.x | One authoring interface, one terminal, one runtime owner is load-bearing |
| §1 service-plugin-execution-spine.txt | Not covered as artifact list | Add | §3.3 / §10 | Execution-spine nouns must appear in system vocabulary |
| §1 durable-async-spine.txt | Partially covered — §8.7 has the chain | No change | §8.7 | Existing coverage is correct |
| §2 Fixed outcome (one assembly per startApp) | Covered — §9.3 | No change | §9 | Aligned |
| §3 Authority plane model | Not covered | Add (P2) | §3 / §10 | Plane model is useful reference for companion-spec authors |
| §3 Compact ownership law (full form) | Partially covered — simpler in §4.1 | Strengthen (P0) | §4.1 | See row 1 |
| §3 Long authority definitions per component | Partially covered — §3.7 covers some | Strengthen | §3.7 / §10 | Execution registry, process execution runtime, FunctionBundle definitions missing |
| §3 Ownership matrix | Not covered as table | Add (P2) | §10 | Matrix is valuable for subsystem-spec authors |
| §4 SDK topology (public surfaces) | Partially covered — §5.1 stale | Strengthen (P0) | §5.1 | Missing `/effect`, `/execution`, `/service/schema`, `/runtime/providers/effect` surfaces |
| §4 SDK topology (internal layout) | Not covered | Add (P1, summarized) | §5.6 / new §5.8 | Helps teams locate where to implement companion adapters |
| §5 Import safety — raw-Effect ban | Covered — §18 forbidden patterns | No change | §18 | Aligned |
| §5 Import safety — allowlist | Not covered | Add (P1) | §18 | Allowlist must be explicit for implementation teams |
| §5 Import safety — effect-oRPC allowlist | Not covered | Add (P1) | §18 | effect-oRPC containment is a load-bearing integration boundary |
| §6 Layered naming / artifact ownership table | Partially covered — §3.3 has some nouns | Strengthen (P0) | §3.3 | Execution-spine artifacts missing |
| §7 Code-block exactness rule | Runtime-spec-internal scaffolding | No change | N/A | Not a canonical-arch concern |
| §8 Schema ownership / RuntimeSchema | Covered — §15.1, §15.2 | No change | §15 | Aligned |
| §9.1 RawrEffect and curated Effect | Partially covered — §18 forbids raw Effect | Strengthen (P1) | §3.3 / §4.9 | `RawrEffect` should appear in vocabulary |
| §9.2 Execution descriptors | Not covered | Add (P0) | §3.3 / new §10.x | `EffectExecutionDescriptor` is a system-level noun companion specs invoke |
| §9.3 Execution descriptor table | Not covered | Add (P0) | §3.3 / §10 | `ExecutionDescriptorTable` must be named as system-level artifact |
| §9.4 Execution registry | Not covered in ontology | Add (P0) | §3.3 / §10 | `ExecutionRegistry` must be named as system-level artifact |
| §9.5 EffectRuntimeAccess | Not covered | Add (P0) | §3.3 / §10.8 | Establishes "SDK internal adapters only" boundary |
| §9.6 Effect execution policy | Not covered | Add (P1) | §15.6 | Execution policy per boundary kind is system-level integration contract |
| §10 App / entrypoint authoring | Covered — §9 | No change | §9 | Aligned |
| §10.2 RuntimeProfile (`providers` field name) | Partially covered — §7.6 | Strengthen | §7.6 | Explicitly name `providers` / `providerSelections` field |
| §10.3 Entrypoint prohibition | Partially covered — weaker in §9.5 | Strengthen (P1) | §9.5 | Add normative prohibition language |
| §11 Service runtime boundary | Covered — §6 | No change | §6 | Aligned |
| §11.10 Boundary errors and telemetry | Partially covered — §15.5 | Strengthen (P1) | §15.5 | Add: "oRPC owns declared caller errors. Effect owns local failure channel. RAWR owns the bridge." |
| §12 Plugin authoring | Covered — §8 | No change | §8 | Aligned |
| §12.5 Descriptor-first oRPC posture | Not covered | Add (P1) | §6.1 / §13.1 | Load-bearing integration law missing from canonical arch |
| §12.6 WorkflowDispatcher in server-internal | Covered — §8.6 | No change | §8.6 | Aligned |
| §12.7 Async step-local Effect execution | Covered — §8.7 | No change | §8.7 | Aligned |
| §13 Resource declarations | Covered — §7 | No change | §7 | Aligned |
| §14 Provider declarations | Covered — §7 | No change | §7 | Aligned |
| §15 RuntimeProfile | Covered — §7.6 | No change | §7.6 | Aligned |
| §16 Process-local coordination resources | Not covered as named resources | Add (P0) | New §7.x or §17.6 | Process-local vs durable invariant is critical for subsystem specs |
| §17 SDK derivation | Partially covered — §10.4 | No change | §10.4 | Appropriate level of depth |
| §18 Runtime compiler | Covered — §10.5 | No change | §10.5 | Aligned |
| §19.1 WorkflowDispatcher | Covered — §10.10 | Strengthen (P0, contradiction) | §10.10 + §12.4 | Emission rights from agent surface — see §5 |
| §19.2–19.4 Async lowering / FunctionBundle / step facade | Covered — §8.7 | No change | §8.7 | Aligned |
| §20 Surface adapter lowering | Covered — §10.11 | No change | §10.11 | Aligned |
| §21.1 Elysia harness | Covered — §13.1 | No change | §13.1 | Aligned |
| §21.2 Inngest harness (connect vs serve) | Not covered — §13.2 only shows chain | Add (P1) | §13.2 | Connect-worker distinction needed for operational specs |
| §21.3–21.6 OCLIF / web / agent / desktop harnesses | Covered — §13.3–13.6 | No change | §13.3–13.6 | Aligned |
| §22.1 RuntimeDiagnostic interface | Not covered at type level | Add (P1, minimal) | §15.4 | Phase / boundary enum values matter for subsystem specs |
| §22.2 RuntimeTelemetry interface | Not covered at type level | Add (P1, minimal) | §15.5 | Telemetry chain matters for observability integration |
| §22.3 RuntimeCatalog minimum shape | Not covered — only narrative | Add (P1) | §10.13 / §15 | Catalog shape needed by deployment / control-plane subsystem specs |
| §22.4 Diagnostic failure codes | Covered — §15.4 has classes | Strengthen | §15.4 | Add example codes per failure class |
| §23.1 Config and secrets | Covered — §15.3 | No change | §15.3 | Aligned |
| §23.2 Caching taxonomy | Covered — §15.7 | Strengthen (P2) | §15.7 | Add `ProcessCacheHubResource` to taxonomy |
| §23.3 Telemetry | Covered — §15.5 | Strengthen (P2) | §15.5 | Add product-analytics row |
| §23.4 Policy primitives | Covered — §15.6 | Strengthen (P1) | §15.6 | Add execution policy as named policy kind |
| §23.5 Reserved boundaries | Partially covered — §19 | Strengthen (P2) | §19 | Runtime spec names ~14 reserved boundaries more precisely |
| §24 End-to-end assembly flows | Covered — §20 narrative | No change | §20 | Canonical arch should stay at narrative level |
| §25 Enforcement rules | Partially covered — §18 + §16 | Strengthen (P1) | §16 / §18 | Gate-families taxonomy missing |
| §26 Load-bearing vs flexible matrix | Not covered | Add (P2, brief) | §19 | Expands what-remains-flexible |
| §27 Component contract summary | Runtime-spec-internal reference | No change | N/A | Too detailed for canonical arch |
| §28 Canonical picture | Covered — §20 Mermaid | Strengthen (P2) | §20 | Add execution-registry / process-execution-runtime nodes |
| §29 Lock authority | Runtime-spec-internal governance | No change | N/A | Not a canonical-arch concern |

The pattern visible across the table is consistent. Where the runtime spec describes its own internals (sequence diagrams, exact type shapes, code-block exactness rules, lock-authority procedures), the canonical arch spec correctly omits. Where the runtime spec hardens system-level vocabulary or integration laws (execution-spine nouns, ownership-law granularity, descriptor-first oRPC posture, process-local coordination resource family, SDK public surfaces, Inngest connect / serve distinction), the canonical arch spec is currently silent or stale. The next section converts this absence list into a prioritized change set.

## 4. Recommended changes to the canonical architecture specification

The change set is sized at five P0 changes, ten P1 changes, and five P2 changes, all additive. None require restructuring. Each entry names target section, change type, concrete intent, and rationale tied to runtime-spec sections or to companion-spec dependencies.

### 4.1. P0 changes — must do; block companion-spec alignment

**P0-1. Strengthen §4.1 ownership law to match the runtime spec's full actor chain.** Replace the current 9-line ownership statement with the 15-line form from runtime spec §3 that names compiler, bootgraph, Effect kernel, process runtime, execution registry, execution runtime, adapters, and harnesses individually. Concretely, the canonical arch spec §4.1 should read, in the runtime-realization tail: "The compiler plans processes. Bootgraph orders lifecycle. The Effect kernel runs local execution. The process runtime assembles processes. The registry matches execution. The execution runtime runs invocations. Adapters translate surfaces. Harnesses mount hosts." The current canonical arch spec collapses these nine actors into "the runtime realizes," losing the grain that companion specs depend on for boundary attachment. **Rationale:** runtime spec §3 (compact ownership law). Auth, async, OpenShell, and deployment specs each plug into a specific actor, not into "the runtime" as a single noun.

**P0-2. Add the execution-spine vocabulary to §3.3 (runtime realization nouns).** Add these names with one-sentence intents and cross-references to the runtime spec for full definitions: `EffectExecutionDescriptor` (the SDK operational representation of RAWR-owned executable bodies, Effect-only), `ExecutionDescriptorRef` and `ExecutionDescriptorTable` (the runtime-side identity and lookup structures), `ExecutionRegistry` (the process-runtime authority that pairs compiled execution plans with matching descriptors for adapter invocation), `ProcessExecutionRuntime` (the centralized invocation execution bridge — harnesses and adapters do not independently lower or run `RawrEffect`), `EffectRuntimeAccess` (the runtime-owned handle that sanctioned SDK internal adapters use to execute `RawrEffect` programs against the single process managed runtime), and `ManagedRuntimeHandle` (the runtime-internal handle that owns process Effect runtime lifetime). **Rationale:** runtime spec §1 (service-plugin-execution-spine), §9.2–9.5. Without these nouns in the canonical arch spec's vocabulary, companion specs that reference them are using undefined terms relative to the umbrella.

**P0-3. Add a new subsection under §7 enumerating the process-local coordination resource family and its NOT-durable invariant.** Add `ProcessQueueHubResource`, `ProcessPubSubHubResource`, `ProcessCacheHubResource`, and `ProcessConcurrencyLimiterResource` as named resources with the invariant: "These resources provide in-process coordination only. They do not provide cross-process durability, workflow run identity, durable event logs, distributed locks, durable schedules, or service-owned business truth. Using them as durable cross-process architecture is a structural error with enforcement diagnostic codes." **Rationale:** runtime spec §16, §25.10. Several companion specs (async runtime, MAWE) need this boundary canonically — otherwise teams substitute process-local pub / sub for Inngest-owned durability.

**P0-4. Update §5.1 Public SDK surfaces to match runtime spec §4.** Add the missing public SDK surfaces: `@rawr/sdk/effect` (curated native-shaped Effect authoring facade), `@rawr/sdk/execution` (execution-descriptor and boundary-policy types where public), `@rawr/sdk/service/schema` (service-owned callable data schema facade), `@rawr/sdk/plugins/server/effect`, `@rawr/sdk/plugins/async/effect`, `@rawr/sdk/plugins/cli/effect`, `@rawr/sdk/plugins/web/effect`, `@rawr/sdk/plugins/agent/effect`, `@rawr/sdk/plugins/desktop/effect`, and `@rawr/sdk/runtime/providers/effect`. Clarify that `/effect` submodules are the executable authoring helpers, not optional terminal modes. **Rationale:** runtime spec §4. The current §5.1 table is missing roughly twelve public surfaces that are now locked. Teams authoring plugins or providers against the canonical arch spec's surface list will get import errors.

**P0-5. Resolve and lock WorkflowDispatcher emission rights for the agent / shell role across §10.10 and §12.4.** Currently §10.10 says only server API and server-internal projections may wrap dispatcher capabilities, and §12.4 says the shell may emit durable work directly into the async plane without a fake synchronous server hop. These are in tension. The canonical arch spec must reconcile them. The recommended commit: add to §11 (runtime roles and surfaces) an explicit per-role emission-rights table, then update §10.10 to say "Server API, server-internal, and agent / shell projections may wrap dispatcher capabilities subject to the invocation-through-context rule" (or, alternatively, update §12.4 to say the shell emits by calling a server-internal API rather than `WorkflowDispatcher` directly). This change is the only canonical-arch-spec change that requires user input, because the heuristic does not resolve it. See §5 for full both-side framing. **Rationale:** runtime spec §19.1 does not enumerate per-role emission rights; canonical arch §12.4 versus §10.10 are textually contradictory.

### 4.2. P1 changes — should do; strengthen companion-spec integration clarity

**P1-1. Add the descriptor-first oRPC posture to §6.1 or §13.1.** State the integration law: `.effect(function*)` authoring causes the SDK to capture an `EffectExecutionDescriptor`; the oRPC route / procedure wrapper stays contract-shaped; at invocation time the adapter calls `ProcessExecutionRuntime`; `ProcessExecutionRuntime` runs `RawrEffect` through `EffectRuntimeAccess`. This law governs all server API, server-internal, and service boundary implementations. **Rationale:** runtime spec §12.5 (descriptor-first-orpc-posture).

**P1-2. Strengthen §9.5 entrypoints with normative prohibition language.** Add: "An entrypoint must not construct `ManagedRuntime`, call raw Effect runtime APIs, run `RawrEffect` programs directly, construct effect-oRPC adapters, or bypass `startApp(...)` to mount service / plugin execution manually." **Rationale:** runtime spec §10.3. The current §9.5 phrasing ("does not manually instantiate raw Effect runtimes") is materially weaker.

**P1-3. Add the raw Effect import allowlist to §18 forbidden patterns.** After the forbidden-zone list, add: "Raw Effect imports are permitted only in `packages/core/runtime/substrate/effect/**`, `packages/core/runtime/process-runtime/**`, `packages/core/runtime/standard/**`, and `packages/core/sdk/src/**/internal/**`." Add the parallel effect-oRPC allowlist: "`packages/core/sdk/src/service/effect/internal/**`, `packages/core/sdk/src/plugins/server/effect/internal/**`." **Rationale:** runtime spec §5. Naming the forbidden zone without the allowed zone causes drift.

**P1-4. Add a boundary-error ownership statement to §10 or §15.** Add: "oRPC owns declared caller errors. Effect owns the local failure channel. RAWR owns the bridge and diagnostics. Expected business states may remain values. Procedures convert caller-actionable states into declared boundary errors. Unexpected internals are not typed caller errors by default." **Rationale:** runtime spec §11.10. Service and plugin authoring depends on this law.

**P1-5. Add the `RuntimeCatalog` minimum-shape section list to §10.13.** State the minimum sections by name: process identity, app identity, entrypoint identity, roles, derived authoring, resources, providers, provider dependency graph, plugins, service attachments, workflow dispatchers, execution plans, execution registry, surfaces, harnesses, lifecycle timestamps, lifecycle status, diagnostics, topology records, startup records, execution records, finalization records. Mark storage backend, indexing, and retention as reserved. **Rationale:** runtime spec §22.3. Deployment and control-plane specs need to know what they can read.

**P1-6. Add the Inngest connect-versus-serve distinction to §13.2.** Add: "The Inngest harness supports two mounting modes: connected-worker mode (outbound WebSocket worker transport via Inngest `connect`) and serve mode (HTTP endpoint). Mode selection is profile-driven and does not change the async surface semantics." **Rationale:** runtime spec §21.2. The async runtime spec depends on this distinction.

**P1-7. Strengthen §15.6 policy primitives with execution policy.** Add a row to the policy table: "Execution policy (per boundary kind, per invocation) | Runtime / SDK `EffectExecutionPolicy`." **Rationale:** runtime spec §9.6. Auth's redaction policy and async's Inngest-versus-Effect retry split both attach to this concept.

**P1-8. Add the enforcement gate-families taxonomy to §16.** Enumerate the seven gate families from runtime spec §25.11: static / import gates, type gates, runtime behavior gates, registry gates, fixture / plan gates, effect-only terminal gates, provider-separation gates. The current §16 names only `canon → graph → proof → ratchet` without the family taxonomy. **Rationale:** runtime spec §25.11. Tooling teams need this taxonomy at architectural depth.

**P1-9. Add `RawrEffect` to canonical vocabulary in §3.3.** Name `RawrEffect` as the author-facing execution value type (a lazy effectful program, not running work) and the canonical import: `import { Effect, TaggedError, type RawrEffect } from "@rawr/sdk/effect"`. Clarify it is not raw Effect. **Rationale:** runtime spec §9.1. `RawrEffect` is referenced in §18 forbidden patterns without being defined in §3.3.

**P1-10. Cross-reference companion subsystem specs explicitly in §1 Scope.** Add: "Subsystem specifications that attach to this canonical architecture include: RAWR Effect Runtime Realization System (runtime authority), RAWR Async Runtime (async role and durable steward activation), RAWR Authentication Subsystem (auth / authz at callable boundaries), RAWR Deployment Subsystem (multi-process placement), RAWR OpenShell Agent Runtime (agent role substrate), RAWR Managed Agent Workspace Execution (steward workspace resources), RAWR Workstream System and Workstream Review Subsystem, RAWR Authoring / Classifier System, and RAWR Factory Bundle Export." **Rationale:** the canonical arch spec §1 currently says subsystem specs attach at integration boundaries without naming them. The absence of cross-references makes the corpus impossible to navigate without an external map.

### 4.3. P2 changes — polish and completeness

**P2-1. Add the authority-plane reference frame.** Add a new §3.x or sidebar in §10 listing the planes from runtime spec §3.1: authoring / authority, selection / demand, derivation / planning, lifecycle / execution, translation / native-host, observation, and durable-async integration. **Rationale:** runtime spec §3.1. Helps companion-spec authors locate which plane they occupy.

**P2-2. Strengthen §19 "What remains flexible" against runtime spec §23.5.** Add: process-local coordination provider details and refresh / retry mechanics; runtime policy enforcement primitives (reserved); semantic service dependency adapters; key / KMS resources. Clarify the difference between "flexible" (may vary without reopening architecture) and "reserved" (named integration hook with locked owner; must be locked no later than first implementation slice). **Rationale:** runtime spec §23.5. The current §19 conflates flexibility and reservation.

**P2-3. Update §20 final Mermaid to show `ExecutionRegistry` and `ProcessExecutionRuntime`.** The current diagram shows `process runtime → surface adapters → harnesses` but elides the registry and execution runtime nodes. Add them between process runtime and adapters. **Rationale:** runtime spec §28 (canonical picture), §24.1 (sequence diagram).

**P2-4. Add `ProcessCacheHubResource` to the §15.7 caching taxonomy table.** Currently the table treats "cache resource" as generic. Naming the process-local hub explicitly aligns with the §7.x process-local family addition (P0-3). **Rationale:** runtime spec §23.2.

**P2-5. Add a product-analytics row to §15.5 telemetry.** Add "Product analytics | Explicit service / resource / sink owner" to the telemetry layer table. **Rationale:** runtime spec §23.3.

The full change inventory totals 20 entries — close to the report's headline figure. Of these, P0-1 (ownership-law granularity), P0-2 (execution-spine vocabulary), P0-3 (process-local coordination resources), and P0-4 (SDK surfaces) are the integration-law debts that companion specs already trip over. P0-5 is the single contradiction. The P1 and P2 changes accumulate clarity.

## 5. Flagged contradictions requiring user resolution

This section flags only contradictions that the user's heuristic — "the runtime realization spec is authoritative on runtime concerns" — does not resolve. Most apparent disagreements between the two specs are incompleteness on the canonical arch spec's side (and are picked up as P0 / P1 strengthenings in §4) rather than design conflicts. Five candidates were examined; one survives.

### 5.1. The single genuine contradiction — WorkflowDispatcher emission rights for the agent / shell role

**Side A — direct emission is sanctioned.** The canonical arch spec §12.4 reads: "The shell may also emit durable work directly into the async plane without a fake synchronous server hop." The OpenShell Agent Runtime spec reinforces this in §8.3 and §14.4: external conversational ingress enters through agent, external product ingress enters through server, and durable system work runs on async; the shell does not need a fake synchronous server route just to create work. On this reading, agent / shell plugins may call `WorkflowDispatcher.send(...)` through their execution context, subject to the same invocation-through-context rule that governs server-internal plugins.

**Side B — direct emission is restricted to server / server-internal contexts.** The canonical arch spec §10.10 reads: "Server API and server-internal projections may wrap dispatcher capabilities for trigger, status, cancel, or dispatcher-facing caller surfaces" — silent on agent / shell. The runtime spec §12 plugin contract scopes `WorkflowDispatcher` to server-internal and async-step contexts; runtime spec §19 (WorkflowDispatcher and async integration) does not enumerate per-role emission rights. On this reading, agent / shell must proxy through a server-internal surface; "emit durable work directly into the async plane" in §12.4 means by calling a server-internal API that wraps the dispatcher, not by calling the dispatcher from agent plugin code.

**Why the heuristic does not resolve it.** The contested question is not a runtime-implementation detail. It is an architectural-rights question: does the agent role have the architectural privilege to emit durable workflow events without proxying through server? The runtime spec is silent on per-role emission rights — it defines how dispatching works, not who may dispatch. Deferring to the runtime spec gives no answer. The canonical arch spec is the proper home for this decision, and the canonical arch spec contradicts itself between §10.10 and §12.4. The OpenShell Agent Runtime spec's §8.3 and §14.4 reinforce Side A's reading; the runtime spec §12 and §19 frame Side B's reading. The contradiction sits squarely in canonical-arch territory, so the canonical arch spec must decide.

**Escalation recommendation.** The user must decide. The recommended commit is to lock agent / shell direct-emission rights in the canonical arch spec under §11 (runtime roles and surfaces) with explicit conditions (when agents may emit, what envelope must accompany the emission, what trust and policy gates apply), and require the runtime spec §19 to enumerate per-role emission rights consistent with the arch-spec lock. The alternative — restricting emission to server / server-internal — requires updating §12.4 to say the shell emits by calling a server-internal API. Status quo (§12.4 grants direct emission, §10.10 silently denies it, runtime spec does not enumerate) creates ambiguity that downstream subsystem specs (OpenShell, async runtime, workstream system) inherit and that compiles into divergent implementations across teams.

### 5.2. Apparent contradictions resolved by the heuristic or treated as incompleteness

For completeness, four other candidates were examined and ruled out as either heuristic-resolved or non-contradictory incompleteness.

**Ownership-law granularity (heuristic resolves).** Runtime spec §3 has a 15-line form naming compiler, bootgraph, Effect kernel, process runtime, execution registry, execution runtime, adapters, and harnesses individually. Canonical arch spec §4.1 has a 9-line version that collapses runtime realization into "the runtime realizes." This is appropriate system-level elision, not contradiction. The recommended action is P0-1 (strengthen §4.1), not contradiction-flagging.

**Profile field-name convention (already aligned).** Runtime spec §15 / §25.3 says a profile field named `resources` is not the provider-selection field; the correct fields are `providers` or `providerSelections`. Canonical arch spec §7.6 already states this. No action beyond consistency-checking any code examples.

**Finalization as lifecycle phase (already aligned).** Both specs explicitly state that shutdown, rollback, provider release, harness stop order, finalizers, managed runtime disposal, and final catalog records are deterministic finalization and observation behavior, not an eighth top-level lifecycle phase. The phrasing in canonical arch §10.1 mirrors runtime spec §1.

**Service-procedure terminals (heuristic resolves).** Runtime spec §25.9 names public `.handler(...)` terminals, Promise / handler execution branches, and the global `fx` authoring spelling as invalid. Canonical arch spec §18 forbidden patterns names raw `Layer`, `Context.Tag`, `Effect.Service`, `ManagedRuntime`, `Scope`, and `FiberRef` authoring but does not name `.handler(...)` or global `fx`. The heuristic resolves this in favor of the runtime spec. The canonical arch spec §18 should be strengthened to add these forbidden patterns (folded into the broader §18 strengthening as part of P1-3), but this is a P1 strengthening, not a contradiction.

The verdict: zero genuine design contradictions beyond the WorkflowDispatcher emission-rights question. The alignment task is overwhelmingly an additions exercise, not a conflict-resolution exercise.

## 6. Division-of-responsibility guidance for companion subsystem documents

Twelve rules govern the boundary between the canonical arch spec, the runtime realization spec, and the companion subsystem specs (auth, deployment, async, OpenShell, MAWE, workstreams, factory bundle, authoring / classifier). Each rule has a short statement, a concrete example of what belongs in the canonical arch spec, and a concrete example of what does not. Together they form a stable contract that companion specs can attach to without colliding with runtime authority, and that the canonical arch spec can be checked against on revision.

**Rule 1 — Vocabulary and laws over types and mechanics.** The canonical arch spec owns vocabulary and ownership laws; the runtime spec owns type shapes and enforcement mechanics. *Belongs in canonical arch:* "The compiler plans processes. The bootgraph orders lifecycle." *Does not belong:* `CompiledProcessPlan` exact field list, `BootResourceModule` schema.

**Rule 2 — System-level integration boundaries over body internals.** The canonical arch spec names integration boundaries at system level; subsystem specs own the bodies of those boundaries. *Belongs in canonical arch:* "The Inngest harness supports connect-worker and serve modes; mode selection is profile-driven." *Does not belong:* Inngest client construction, connect auth handshake, retry / resume mechanics — the async runtime spec owns these.

**Rule 3 — Public SDK surfaces over internal SDK topology.** The canonical arch spec enumerates the public SDK surfaces; the runtime spec owns the SDK internal topology and adapter containment. *Belongs in canonical arch:* the table of `@rawr/sdk/*` public imports. *Does not belong:* the `packages/core/sdk/src/**/internal/**` file layout.

**Rule 4 — Forbidden patterns as architectural kinds, not import paths.** The canonical arch spec states forbidden patterns in terms of architectural kinds; the runtime spec states them in terms of import paths and type-level names. *Belongs in canonical arch:* "Raw Effect vocabulary stays quarantined inside runtime / provider / harness implementation boundaries." *Does not belong:* the exact list of forbidden raw Effect exports (`ManagedRuntime.make`, `Runtime.run*`, `Effect.runPromise`).

**Rule 5 — Operational mapping at entrypoint / platform-service / replica level only.** The canonical arch spec owns the operational mapping at the entrypoint / platform-service / replica level; the deployment subsystem spec owns multi-process placement policy, replica counts, and container orchestration. *Belongs in canonical arch:* "One platform service per long-running role." *Does not belong:* Railway-specific deployment manifests, container image specs, zero-downtime deploy mechanics.

**Rule 6 — Lane / topology index without builder generics.** The canonical arch spec owns the canonical role / surface / plugin lane index (the topology + builder agreement table); the runtime spec owns the type-level builder factories and classification enforcement. *Belongs in canonical arch:* the topology + builder table (§8.3). *Does not belong:* `defineServerApiPlugin` exact type generics, `PluginDefinition` exact field list.

**Rule 7 — Agent / steward authority split without shell internals.** The canonical arch spec owns the agent / steward authority split; the OpenShell Agent Runtime spec owns shell governance, tool policy, and session management. *Belongs in canonical arch:* "The shell drives what; the stewards drive how; governance decides whether." *Does not belong:* OpenShell policy adapter implementations, tool capability enumeration, shell session lifecycle.

**Rule 8 — Config / secrets boundary rules over loading mechanics.** The canonical arch spec owns the config / secrets boundary rules (sources, redaction at boundary, profile-driven selection); the runtime spec owns the config loading implementation, the substrate config component, and `RuntimeSchema` validation flow. *Belongs in canonical arch:* "Secrets redact at the config boundary; config validates through `RuntimeSchema`." *Does not belong:* config source precedence algorithms, provider-specific refresh strategy.

**Rule 9 — Diagnostics taxonomy at class level only.** The canonical arch spec owns the diagnostics taxonomy at class level; the runtime spec owns the exact diagnostic codes, severity, and phase mapping. *Belongs in canonical arch:* "Runtime diagnostics cover at least: topology / builder mismatch, missing provider coverage, bootgraph lifecycle failure, execution registry / descriptor mismatch, surface adapter shape violation." *Does not belong:* the 50+ individual diagnostic code strings (`plugin.topology.builder_mismatch`, `execution.registry.identity_mismatch`).

**Rule 10 — `RuntimeCatalog` minimum sections, not exact interface.** The canonical arch spec owns the `RuntimeCatalog` minimum section list (what must be recorded); the runtime spec owns the exact `RuntimeCatalog` TypeScript interface; the deployment / control-plane subsystem spec owns backend, indexing, and retention. *Belongs in canonical arch:* the list of minimum catalog section names. *Does not belong:* the exact interface shape; the storage backend; the indexing strategy.

**Rule 11 — Service boundary lanes without context-type generics.** The canonical arch spec owns the service boundary lanes as system-level vocabulary; the runtime spec owns the `ServiceBoundaryContext` type shape, `provided` seeding-law enforcement, and `ServiceBindingCacheKey` exact composition. *Belongs in canonical arch:* "Service binding is construction-time over `deps`, `scope`, and `config`. Invocation does not participate. `provided.*` is service-middleware output." *Does not belong:* `ServiceBoundaryContext` TypeScript generic; `ServiceProcedureExecutionContext` exact shape.

**Rule 12 — WorkflowDispatcher surface law without dispatch internals.** The canonical arch spec owns the WorkflowDispatcher surface law (who may use it, what it owns, what it does not own); the runtime spec owns the `WorkflowDispatcher` interface type and materialization mechanism; the async runtime spec owns Inngest-side semantics. *Belongs in canonical arch:* the per-role emission-rights table (after the user resolves §5.1) and the non-ownership statement that the dispatcher does not own workflow semantics or expose product APIs. *Does not belong:* `WorkflowDispatcher.send(...)` exact signature, `WorkflowDispatchResult` type.

A practical corollary follows from these twelve rules: when a companion subsystem spec is authored, its `runtime_authority: no` metadata is enforced by checking that every runtime-shaped claim it makes can be located in either the canonical arch spec's vocabulary (Rules 1, 3, 6, 11) or the runtime spec's mechanics (Rules 1, 4, 9, 10), and that any new integration boundary it introduces is named in the canonical arch spec before the companion spec elaborates it. Auth-specific compiler gates, for example, are runtime-spec-internal compiler enumeration (Rule 9 corollary): the auth subsystem may contribute a checklist by reference, but ownership of the gate-family taxonomy stays in the runtime spec; the canonical arch spec carries only the seven gate-family names. The Inngest connect worker as a `BootResourceModule` (Rule 2): the canonical arch spec names the connect / serve mounting distinction; the runtime spec owns the bootgraph wiring; the async runtime spec attaches its connect-worker model to the canonical-arch-spec name. MAWE provider-boundary law (Rule 11 corollary): the canonical arch spec carries the service-binding-excludes-invocation rule; MAWE elaborates it for the managed-agent case without restating it.

These twelve rules are the boundary that prevents drift. Companion specs that respect them attach cleanly. Companion specs that violate them surface as either runtime-shaped claims the runtime spec must absorb or as architectural-rights claims the canonical arch spec must lock. The single live instance of the latter — agent / shell direct emission rights — is the contradiction in §5.1. Once that lock is taken, the alignment between runtime realization and canonical architecture is closed for the visible corpus, and the platform's system-level grade lifts from "structurally sound with integration-thin seams" to "structurally sound with locked seams."
