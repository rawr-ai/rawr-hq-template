## Frame

### Objective

Create one reusable research-experiment service that lets several
investigations run isolated cells, preserve submitted artifacts, correlate
observations, and evaluate outcomes without duplicating provider mechanics or
surrendering study-specific judgment.

This is a service consolidation, not an SDK framework project. The service owns
the experiment domain. Resources declare the provisionable capabilities it
needs. Providers implement those resources. The process runtime provisions
them. A shared package exists only when a runtime-agnostic helper has a proved
consumer outside the service.

### Hard Core

1. Local frozen study material owns input truth.
2. A submitted artifact, not solver prose or telemetry, is the product output.
3. Solver execution, artifact capture, verification, observation, and judgment
   remain distinguishable authorities.
4. Agent failure is study data. Infrastructure failure is a typed failure of
   the service or resource boundary that owns it.
5. A valid solver terminal cannot be erased or rerun by later verification,
   review, or telemetry failure.
6. The service owns per-cell semantics and authoritative write ordering.
7. Resources and providers own acquisition and vendor mechanics, never study
   policy or product correctness.
8. Lanes own cases, prompts, treatments, scheduling, rubrics, interpretation,
   aggregation, evidence, and history.

### Exterior

The shared operational plane does not own subject corpora, profile allocation,
model catalogs, rubrics, release disposition, evidence retention, gateway
lifecycle, or a scheduler around Langfuse Experiments.

## Existing Architecture Authority

The implementation MUST apply the repository's existing service kind rather
than define another service abstraction.

Source authority for the BUILD cut is:

- Habitat blueprint: `.habitat/blueprints/service`
- current closure/behavior reference:
  `services/agent-plugin-lifecycle` at Template commit
  `3beb49360968ba7f1ebec1bfe89f572972026306`
- exact service closure at that commit: oRPC `1.14.8`, TypeBox `1.3.6`,
  Effect `4.0.0-beta.100`, and `effect-orpc@1.0.0-effect-v4.8`
- current resource/provider reference:
  `resources/agent-plugin-package-output`

The Habitat blueprint establishes the required spine:

```text
services/research-experiment/
  AGENTS.md
  package.json
  project.json
  tsconfig.json
  tsconfig.build.json
  tsconfig.test.json
  vitest.config.ts
  src/
    index.ts
    client.ts
    router.ts
    service/
      base.ts
      contract.ts
      impl.ts
      router.ts
      modules/
        cells/
          contract.ts
          module.ts
          router.ts
          model/
            dto/
              run-cell.ts
              terminal.ts
              evaluation.ts
              observation.ts
            policy/
          router/
            index.ts
            run.router.ts
```

The exact relationships are likewise inherited, not recreated:

- `base.ts` declares the service context and provisioned resource ports,
  including durable cell-state persistence. Lane data/configuration/policy
  enters through the TypeBox service boundary, not executable context hooks.
- `contract.ts` composes module contracts with `eoc.router`.
- `impl.ts` calls `implementEffect(contract, Layer.empty)` exactly once and
  attaches independently decorated native middleware. It MUST NOT call
  `.$context(...)`.
- native middleware projects runtime-provisioned dependencies into the narrow
  module/leaf execution context before `.effect(...)` handlers consume them;
  leaf handlers do not reach through a root `context.deps` bag.
- root and module `router.ts` files compose with `service.router(...)` and
  `module.router(...)`.
- module `contract.ts` imports `eoc` directly, attaches private
  `ORPCTaggedError` classes, and adapts ordinary TypeBox schemas with the
  Habitat-required `standard` import from `#adapters/typebox`. That import MUST
  resolve to the canonical Template bridge already implemented in
  `packages/hq-sdk/src/orpc/schema.ts`, never to a research-local adapter.
  TypeBox `1.3.6` does not supply Standard Schema itself. If the authoritative
  restack still exposes only `schema`/`typeBoxStandardSchema`, BUILD may add only
  the missing canonical `standard` alias/export and package import mapping at
  the existing Template authority before scaffolding the service. The bridge
  delegates validation and translates issues; it does not decode, transform,
  clone, freeze, normalize, or compose schemas.
- procedure implementations use effect-oRPC `.effect(...)`.
- public service errors use the existing oRPC/effect-oRPC error authority.
- `src/router.ts` re-exports the service router, `src/client.ts` uses the
  existing `defineServicePackage(router)` boundary, and `src/index.ts` plus
  `package.json` exports expose only the governed router/client/contract
  surfaces. This ordinary service package shell acquires no runtime resources.

No `ProcedureContract`, capability registry, custom router, package-owned
`Context.Service`, or package-owned `ManagedRuntime` is added.

Habitat is read-only and has no service generator. BUILD applies these packets
manually:

- `require_service_spine_topology`
- `require_service_orpc_relationships`
- `require_service_contract_authority`
- `require_orpc_error_authority`
- the existing agent-router placement and shape rules

The current `agent-plugin-lifecycle` service proves the exact dependency
closure and selected behavior/resource patterns, but it is not relationship or
structural authority: its older layout and `.$context(...)` implementation
conflict with the closed service blueprint. The blueprint governs both
structure and oRPC relationships.

## Deletion-First Repartition

The current `packages/research-sdk` tree is a source quarry, not the destination.
No current production module qualifies whole-file as runtime-agnostic
cross-service package support.

| Current surface | Destination |
| --- | --- |
| `contracts/identity.ts`, `contracts/execution.ts`, `contracts/stage-output.ts` | service-owned TypeBox DTO schemas and inferred types |
| pure adoption, observation binding, re-entry, and publication laws | service `modules/cells/model/policy` |
| `core/capabilities.ts` | delete; normal oRPC procedures and typed resource ports replace it |
| `core/reentry.ts`, `core/terminal-sink.ts`, effectful residue ports | service procedure flow plus a durable cell-state resource/provider |
| `contracts/schema.ts` | delete outright; use ordinary TypeBox schemas, native checks, and the Habitat-admitted alias to the canonical `@rawr/hq-sdk` Standard Schema bridge |
| `contracts/config.ts` | split into service request/config schemas and resource-owned configuration |
| `runtime/command.ts` | command resource contract plus concrete provider |
| `runtime/managed-runtime.ts` | delete; the process runtime provisions provider resources |
| `adapters/git-bun` Git behavior | Git-artifact resource/provider |
| `adapters/git-bun` package behavior | BUILD compatibility tooling outside the running service |
| package barrels, adapter registry shape, package protocol identity | delete |

The only manual TypeBox-adjacent behavior that MAY survive is a private,
service-owned total check for the exact
finite plain JSON-data identity used by durable hashing. It must reject cycles,
accessors, symbols, non-enumerable properties, non-plain prototypes, nonfinite
numbers, functions, and sparse arrays. TypeBox `Value.Check`/`Value.Errors`
still owns structural validation. There is no public portability framework,
schema traversal, custom decoder, clone/freeze subsystem, or duplicate error
model, and no research-local Standard Schema bridge.

`@rawr/research-sdk` is removed after the accepted behavior has moved and both
lane compatibility checks pass. If BUILD discovers a genuinely
runtime-agnostic helper with a non-service consumer, that one helper may move to
an existing appropriate package or a separately justified package. Discovery
does not preserve the current package by default.

## Service Boundary

### Public Domain

The initial service has one semantic module, `cells`, and one public procedure,
`cells.run`. This is an ordinary oRPC procedure, not a generic stage facade.
Its TypeBox input identifies one exact frozen cell invocation and its
lane-owned policy references. Its output is a tagged result describing the
adopted or newly completed solver terminal, evaluation, observation
projection, and any incomplete downstream boundary.

The service keeps Prepare, Execute, Observe, and Evaluate as named internal
domain operations inside the cells module. They are private Effect functions
and policy modules used by `run.router.ts`, not public TypeScript capability
interfaces and not lane-callable workflow steps.

The service owns frozen-input preparation and deterministic/blind evaluation as
internal domain operations. Lanes supply TypeBox data, configuration, policy,
rubric/verifier inputs, and evidence references, never executable preparation
or evaluation callbacks. Those operations consume provisioned resource ports
for:

- atomic attempt, terminal, evaluation, orphan, and residue persistence;
- Git artifact materialization/capture/apply;
- sandbox acquisition and release;
- agent execution;
- observation acquisition, settlement, and score projection;
- operational events.

The service imports resource contracts only. It never imports concrete
providers. Lane bindings invoke the service contract/client and never call
providers as a shadow orchestration path.

### Cell Flow

```text
lane schedules exact cell
  -> cells.run
     -> prepare and validate frozen input
     -> attempt exact SolverTerminal adoption
          hit  -> recover terminal-bound observation handle
          miss -> atomically admit exact ExecutionAttemptFence
                    Admitted -> acquire observation
                              -> acquire sandbox / invoke agent
                              -> parent-owned Git artifact capture
                              -> publish SolverTerminal write-once
                    terminal surfaced -> validate and adopt
                    Occupied | Conflict | Unknown -> stop without effects
     -> settle exact observation handle
     -> adopt or evaluate exact terminal
     -> publish EvaluationResult write-once
     -> project scores to the exact observation subject
  -> lane interprets and aggregates result
```

The service owns this ordering. It does not own a worker, queue, DAG,
scheduler, database, generic CAS, receipt graph, or evidence store.

### Identity And Continuation

The service domain retains these entities:

- `StudyIdentity`
- `CellKey`, including a lane-supplied instance/replicate identity
- `FrozenInput`, including the admitted Git substrate when applicable
- `ExecutionAttemptFence`
- `ObservationHandle`
- `SubmittedArtifact`
- `SolverTerminal`
- `EvaluationResult`
- `UnresolvedExecutionResidue`

Durable values bind the exact cell, frozen input, implementation revision,
predecessor closure, value digest, and stage. `SolverTerminal` also binds the
admitted attempt and observation handle. `EvaluationResult` binds the exact
terminal. The durable cell-state resource exposes atomic create-if-absent,
read-after-unknown, and exact residue-reconciliation mechanics through an
injected port. Resource-local providers own concrete persistence and runtime
owns their provisioning. The service alone owns experiment-domain identity
checks, write ordering, adoption, and interpretation; lanes supply study data
and policy, not persistence implementations.

The semantic laws are:

- exact terminal adoption precedes every execution effect;
- only exact `Admitted` attempt authority permits observation, sandbox, or
  process acquisition;
- identical `Occupied`, `Conflict`, and `Unknown` all fail closed;
- the terminal is write-once and absorbing for the exact cell instance;
- a downstream failure resumes only the incomplete boundary;
- a blind or nondeterministic evaluation is published before projection and is
  adopted on re-entry;
- unconfirmed process termination records exact residue and sandbox locator,
  blocking same-instance re-entry until exact reconciliation;
- retries keep the same instance; only explicit lane authority creates a new
  replicate/replay with lineage and reason;
- agent noncompletion, empty artifacts, compilation failure, policy violation,
  and low scores remain study outcomes rather than infrastructure retries.

## Resource And Provider Boundary

The initial resources are:

| Resource | Service-facing capability | Concrete provider ownership |
| --- | --- | --- |
| durable cell state | atomic read/create-if-absent/read-after-unknown/reconcile mechanics | concrete terminal, evaluation, orphan, attempt, and residue persistence |
| research command | bounded structured process execution and termination evidence | Bun/host process implementation |
| Git artifacts | materialize, capture, apply | exact Git substrate and parent-owned workspaces |
| sandbox | acquire, execute/transfer, release or retain residue | OpenShell |
| agent | invoke, cancel, decode session/rollout evidence | Codex |
| observation | acquire root, carry context, settle, score, read back | Langfuse/OTel |
| operational events | bounded non-authoritative wide events | EVLog |

Each resource follows the current Template pattern:

```text
resources/<resource>/
  contract.ts
  providers/<provider>/
    index.ts
    project.json
    test/
```

Resource contracts define stable typed capabilities. Providers own
configuration validation, acquisition, implementation, release, and exact
vendor or persistence mechanics. The process runtime selects and provisions
providers. Service `base.ts` depends on those provisioned resource ports; module
context narrows them for procedure handlers.
The cell-state provider supplies atomic persistence mechanics only. The service
owns which records may be written, in what order, and how returned states affect
the experiment.

Immutable package build and verification is compatibility tooling outside the
running research service. Its exact Bun mechanics may remain resource/provider
owned, but the service MUST NOT depend on that capability.

Codex-OpenShell and Codex-Langfuse remain named, bounded compositions, not a
provider registry. OpenShell remains ignorant of Codex semantics. Codex remains
ignorant of OpenShell and Langfuse. The composition providers own only the
proved auth/profile or W3C carrier/projection crossings.

## Study Ownership

Each lane retains its cases, prompts, treatments, profile allocation, rubrics,
hidden checks, historical comparison artifacts, results, evidence, and
history. A lane binding supplies:

- exact path mapping and frozen identities;
- service input, configuration, policy, rubric/verifier inputs, and evidence
  references;
- resource requirements consumed by the runtime-owned provider selection;
- scheduling, interpretation, aggregation, and reporting.

The service never scans a vault, discovers a study by directory convention, or
relocates evidence. The lane does not inject executable orchestration callbacks
or sequence service resources directly.

## Vendor Closure

BUILD uses the exact current service closure from Template commit `3beb4936`
and rechecks every pin after the mandatory pre-landing restack:

| Boundary | BUILD identity |
| --- | --- |
| oRPC | `@orpc/*@1.14.8` |
| TypeBox | `typebox@1.3.6` |
| Effect | `effect@4.0.0-beta.100` |
| effect-oRPC | `effect-orpc@1.0.0-effect-v4.8` |
| Bun | `1.3.14` |
| Git | resolved exact binary, admitted at `>=2.48.0` |
| OpenShell | `0.0.89` |
| Codex CLI | `0.144.6` |
| Langfuse | `@langfuse/{client,otel,tracing}@5.9.1` |
| OpenTelemetry | API `1.9.1`; core/resources/trace SDK `2.9.0`; OTLP HTTP `0.220.0` |
| EVLog | `2.22.3` |

The service does not create another Effect or TypeScript realm. It follows the
accepted Template service closure. Resource providers use the exact compatible
Effect/platform closure selected by Template and do not export live runtime
values through service contracts.

Additional fixed vendor laws remain:

- Codex admission combines process truth with version-bound rollout evidence;
  requested flags, public JSONL, and telemetry are not effective-model proof.
- Codex cancellation completes before outer sandbox release. Unconfirmed exit
  preserves exact process and sandbox residue.
- Langfuse scores target the exact experiment-item root trace and observation.
  Flush is not ingestion proof; bounded readback is required.
- Codex-Langfuse uses one full W3C carrier and cannot create a second
  application root. Legacy trace-seed mode is rejected.
- Codex-Langfuse projects the supplied decoded turn set without selecting it,
  including incomplete/interrupted turns.
- EVLog is diagnostic, initialized once per process, uses public APIs only,
  redacts before drain, and cannot alter study truth.
- OpenShell consumes an explicitly selected running gateway but never owns its
  lifecycle.

## Artifact And Cross-Repository Boundary

The accepted Git behavior moves intact into the Git-artifact resource/provider:

- history-free exact materialization;
- exact resolved Git substrate returned to the lane and bound in `FrozenInput`;
- parent-owned full-index binary patch capture;
- forced inclusion of submitted files with only lane-declared exclusions;
- neutralized repository attributes/config;
- fresh apply-check/apply/regeneration against the same substrate;
- exact patch bytes, SHA-256, and product-tree equality.

The accepted Bun behavior moves intact into the immutable-package
resource/provider:

- adapter-owned staged build;
- `bun pm pack --ignore-scripts`;
- exact tarball bytes and embedded manifest;
- rooted runtime dependency graph from the admitted Bun v1 lock closure;
- actual installed content/mode identity;
- immutable publication and isolated consumer verification;
- explicit rejection of unsupported or ambiguous lock forms.

Git and Bun admission and artifact epochs remain independent.

Cross-repository compatibility consumes immutable locally packed Template
service/resource packages. The current package-artifact operation is not yet
that boundary: it hard-codes `@rawr/research-sdk`, embeds an SDK-specific
manifest path, and rejects the workspace edges present in a service/resource
closure. BUILD MUST treat support for one explicit root plus its exact declared
local workspace closure as a separately reviewed closure-admission slice, not a
rename-only edit. It retains staging, script suppression, content/mode
verification, and fail-closed lock admission without implementing general
workspace resolution. This change adds no artifact aggregator, bundle format,
registry, release plane, package manager, or source checkout dependency.

## Testing Strategy

### Service

- apply every `.habitat/blueprints/service` packet to
  `services/research-experiment`;
- compile the exact oRPC contract/router/client types;
- test the `cells.run` procedure through the real effect-oRPC implementer with
  injected resource ports;
- test adoption-before-effects, concurrent attempt admission, terminal races,
  unknown writes, evaluation resumption, orphan observation handling,
  unresolved residue blocking, instance rotation, and failure separation;
- test TypeBox request/output/error contracts behaviorally, not with source
  string assertions.

### Resources And Providers

- use real temporary roots and fixture processes for filesystem/process
  guarantees;
- prove interruption, cleanup, retained residue, and primary/secondary failure
  ordering;
- preserve the accepted Git/Bun deterministic suite;
- use local fixture servers and captured Codex/Langfuse data rather than model
  calls or provider mutation;
- enforce service-to-resource and resource-to-provider dependency direction
  with Habitat/GritQL.

### Lane Compatibility

- oRPC: one retained model-free cell through the service;
- Inngest: retained S09 through the service, with the seven-file seed view,
  lane-owned control overlay, `src/**`, `test/**`, and `REENTRY.md` product
  mapping, exact Git substrate, and existing hidden verification;
- both lanes consume the same immutable Template closure while retaining their
  own fixtures and evidence.

## Migration

1. Commit and accept this deletion-first ownership checkpoint.
2. Restack onto the authoritative Template commit containing the current
   service/vendor closure and legal process-runtime provider provisioning.
3. Scaffold `services/research-experiment` by applying the existing service
   blueprint and current `agent-plugin-lifecycle` pattern.
4. Move service-domain DTOs and pure laws from `packages/research-sdk` into the
   cells module; replace custom schemas/decoders with TypeBox.
5. Move command, Git, and vendor behavior behind resource contracts/providers;
   move durable state behind a cell-state resource/provider while keeping
   experiment write ordering in the service; and correct the Bun compatibility
   operation only enough to pack/verify the declared service/resource closure.
6. Delete package runtime, custom capabilities, barrels, and the
   `@rawr/research-sdk` package identity.
7. Bind and pass the two model-free lane compatibility cells.
8. Remove superseded active lane machinery, preserving frozen evidence.
9. Restack again, re-admit exact vendors, run the full deterministic gate, and
   obtain exact-commit acceptance from both directors.

## Falsifiers

The design is wrong if any of these occur:

- experiment semantics or executable flow remain in a shared package;
- the service defines its own contract/router/schema/Effect abstraction instead
  of using the existing Habitat/oRPC/TypeBox/effect-oRPC stack;
- the service imports a concrete provider or acquires/releases a resource;
- a lane calls providers directly, injects executable stage callbacks, or
  reconstructs the per-cell flow;
- a provider decides study correctness, retry policy, or rubric semantics;
- adding a third study requires service edits for subject-specific behavior;
- downstream failure can erase or rerun a valid solver terminal;
- unresolved process residue permits same-instance execution;
- Git/Bun behavior loses an already accepted safety or identity guarantee;
- frozen evidence must be relocated to use the service;
- a new package, scheduler, controller, receipt graph, store, package manager,
  or distribution plane appears without an independently proved need.
