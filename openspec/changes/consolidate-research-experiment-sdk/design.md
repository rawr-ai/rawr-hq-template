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

### Deployment Law

The normal deployment is one trusted local operator and one locally provisioned
service/runtime. It may run distinct cells concurrently and must tolerate
ordinary process interruption, crash, and restart. Optional Railway deployment
does not imply a hostile local host or multi-tenant control plane.

Solver and evaluator separation protects benchmark validity. The repository,
Git/Bun installation, configuration, package store, and installed dependencies
are trusted operating inputs. Re-entry prevents accidental duplicate execution
of one cell and resumes completed boundaries; it is not distributed consensus,
supply-chain attestation, or a multi-writer protocol.

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

- Habitat service source law: `.habitat/blueprints/service` at Template commit
  `faa320f1da03d83432d09c06c7445b1ae9a21679`
- current closure/behavior reference:
  `services/agent-plugin-lifecycle` at Template commit
  `3beb49360968ba7f1ebec1bfe89f572972026306`
- exact service closure at that commit: oRPC `1.14.8`, TypeBox `1.3.6`,
  Effect `4.0.0-beta.100`, and `effect-orpc@1.0.0-effect-v4.8`
- current resource/provider reference:
  `resources/agent-plugin-package-output`

The ordinary project shell requires `AGENTS.md`, package/Nx/TypeScript/test
configuration, and public `src/{index,client,router}.ts` surfaces. Those files
are project requirements, not part of Habitat's closed service-spine scope.
Inside that shell, Habitat requires the generic root and module shells:

```text
services/research-experiment/src/service/
  base.ts
  contract.ts
  impl.ts
  router.ts
  modules/
    <module>/
      contract.ts
      module.ts
      router.ts
```

The research service selects one `cells` module within that legal shell and
uses its allowed `model/dto` and `model/policy` directories for the run-cell,
terminal, evaluation, observation, and pure policy authorities.

The source law owns these direct anchors and first-hop relations:

- `base.ts` is the standalone root implementer and directly exports
  `base = implementEffect(contract, Layer.empty)`. The `Layer.empty` choice and
  one-root-implementer invariant are research-service behavior requirements;
  the source law proves the visible `base` anchor and native constructor. This
  standalone root implementer MUST NOT use `.$context(...)`.
- root and module `contract.ts` directly export `contract`; the root imports
  module contracts only at that composition point.
- `impl.ts` imports `base` and directly exports `service = base` or
  `service = base.use(...)`, attaching independently decorated native
  middleware rather than creating a second implementer.
- module `module.ts` imports the root `service` and directly exports
  `module = service.cells` or a native `.use(...)` continuation from it.
- root and module `router.ts` directly export `router`; the root imports module
  routers only at that composition point.
- native middleware projects runtime-provisioned dependencies into the narrow
  module/leaf execution context before `.effect(...)` handlers consume them;
  the source law permits native context middleware, while leaf handlers do not
  reach through a root `context.deps` bag. Lane data/configuration/policy enters
  through the TypeBox service boundary, not executable context hooks.
- modules inherit the root through the `service`/`module` anchors and do not
  import current-owner root `base`, context, or root middleware aliases;
  middleware is a named direct native `const`, never a default export.

Within that lawful shell, the research service deliberately composes the root
contract with `eoc.router`, the root router with `service.router(...)`, and the
single cells-module router with `module.run.effect(...)`. TypeScript and
behavioral tests own assignability, completeness, context narrowing, and
request isolation; Habitat does not simulate those relations.

The remaining contract and package decisions are:

- module `contract.ts` imports `eoc` directly, attaches private
  `ORPCTaggedError` classes, and adapts ordinary TypeBox schemas with the
  Habitat-required `standard` import from `#adapters/typebox`. That import MUST
  resolve to the canonical Template bridge already implemented in
  `packages/hq-sdk/src/orpc/schema.ts`, never to a research-local adapter.
  TypeBox `1.3.6` does not supply Standard Schema itself. If the authoritative
  restack still exposes only `schema`/`typeBoxStandardSchema`, BUILD may add only
  the missing canonical `standard` alias/export and package import mapping at
  the existing Template authority before scaffolding the service. Before any
  research contract consumes it, the primary Template owner MUST also correct
  and behaviorally admit the bridge. At admitted TypeBox `1.3.6`, every native
  error surface exposes the same raw, lossy `instancePath`; the canonical
  adapter therefore follows the official `Schema.Validator` Check/Errors
  structure but emits message-only Standard Schema issues and omits
  `Issue.path` for every error. It deletes URI decoding and all custom path
  parsing/traversal. Exact paths may return only when a later admitted upstream
  exposes escaped pointers or structured segments. Tests cover `%`, `%2F`, `/`,
  `~`, `~0`, `~1`, nested objects, numeric object keys, and arrays, proving
  total validation and message fidelity with path absent. The bridge delegates
  validation and translates issues; it does not decode, transform, clone,
  freeze, normalize, or compose schemas. It preserves `__typebox` only if the
  existing OpenAPI projection has a proved consumer.
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
- `require_service_anchor_exports`
- `require_service_context_boundaries`
- `require_service_contract_authority`
- `require_service_module_isolation`
- `require_service_orpc_composition`
- `require_orpc_error_authority`
- the existing agent-router placement and shape rules

The current `agent-plugin-lifecycle` service proves the exact dependency
closure and selected behavior/resource patterns, but it is not relationship or
structural authority: its older layout and `.$context(...)` implementation
conflict with the submitted source law. Commit `faa320f1` governs structure and
oRPC relationships only; it does not prove process-runtime provider
provisioning.

## Deletion-First Repartition

The current `packages/research-sdk` tree is a source quarry, not the destination.
No current production module qualifies whole-file as runtime-agnostic
cross-service package support.

| Current surface | Destination |
| --- | --- |
| direct cell, input, terminal, evaluation, and observation identities | service-owned TypeBox DTO schemas and inferred types |
| terminal adoption, local re-entry, and publication ordering | service `modules/cells/model/policy` |
| `core/capabilities.ts` | delete; normal oRPC procedures and typed resource ports replace it |
| distributed attempt fences, stage envelopes, predecessor/digest graphs, orphan/residue DAGs | delete; one local per-cell record replaces them |
| terminal/evaluation persistence | service procedure flow plus a durable cell-state resource/provider |
| `contracts/schema.ts` | delete outright; use ordinary TypeBox schemas, native checks, and the Habitat-admitted alias to the canonical `@rawr/hq-sdk` Standard Schema bridge |
| `contracts/config.ts` | split into service request/config schemas and resource-owned configuration |
| `runtime/command.ts` | command resource contract plus concrete provider |
| `runtime/managed-runtime.ts` | delete; the process runtime provisions provider resources |
| native Git materialize/capture/apply behavior | Git-artifact resource/provider |
| ordinary Bun pack/install/smoke behavior | BUILD compatibility tooling outside the running service |
| `installed-package.ts`, `package-materialization.ts`, embedded manifests, custom Bun lock/runtime graphs | delete; historical source-quarry code only |
| package barrels, adapter registry shape, package protocol identity | delete |

TypeBox and oRPC own admitted JSON data. There is no public or private
portability traversal, schema traversal, custom decoder, clone/freeze
subsystem, duplicate error model, or research-local Standard Schema bridge.

`@rawr/research-sdk` is removed after the accepted behavior has moved and both
lane compatibility checks pass. If BUILD discovers a genuinely
runtime-agnostic helper with a non-service consumer, that one helper may move to
an existing appropriate package or a separately justified package. Discovery
does not preserve the current package by default.

### Local Deployment Disposition

| Area | Preserve | Delete |
| --- | --- | --- |
| cell state | one local `Running -> SolverTerminal -> Evaluated` record; terminal/evaluation adoption | attempt fences, stage/predecessor graphs, orphan/residue DAGs, distributed acknowledgement states |
| Git | native revision/subtree materialization, patch SHA, fresh apply, product-tree equality | hostile config/attribute policy, provider envelopes, regenerated-patch authority |
| Bun | clean staging, pack, atomic tarball SHA/length, frozen consumer smoke, cleanup | embedded manifests, custom lock/placement/content graphs, collision and closure-admission protocols |
| observation | one recorded trace/observation subject, local projection status, optional/run-level readback | global namespace cleanup and unconditional remote-readback correctness gates |
| vendors | direct pins, checked-in lockfile, frozen install, behavior tests | bespoke transitive re-admission and upstream Git-object provenance manifests |

Commit `ce282cb062f0d4bdeb80117a021aa0c766537991` remains historical
source-quarry and behavior evidence only. No row above is a mandate to port its
implementation or test suite wholesale.

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
and policy modules used by the single module `router.ts`, not public TypeScript
capability interfaces and not lane-callable workflow steps.

The service owns frozen-input preparation and deterministic/blind evaluation as
internal domain operations. Lanes supply TypeBox data, configuration, policy,
rubric/verifier inputs, and evidence references, never executable preparation
or evaluation callbacks. Those operations consume provisioned resource ports
for:

- one local per-cell running, terminal, and evaluation record;
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
     -> read one per-cell record
          SolverTerminal | Evaluated -> adopt completed boundaries
          Running -> inspect deterministic provider lookup identities
                     live -> return already-running
                     exited with recoverable workspace/outcome -> resume capture
                     absent or settled -> clean up and resume execution
          missing -> derive provider lookup identities from cell + attempt
                     -> uniquely begin Running with those identities
                     -> providers create or adopt observation and sandbox/process
                     -> record concrete handles and locator details
                     -> invoke agent
                     -> parent-owned Git artifact capture
                     -> persist SolverTerminal before verification
     -> settle the recorded observation
     -> adopt or evaluate the terminal
     -> persist Evaluated before telemetry projection
     -> project scores to the recorded observation subject
     -> optionally read back now or reconcile at run level
  -> lane interprets and aggregates result
```

The service owns this ordering. It does not own a worker, queue, DAG,
scheduler, database, generic CAS, receipt graph, or evidence store.

### Identity And Continuation

The service domain retains these entities:

- `StudyIdentity`
- `CellKey`, including a lane-supplied instance/replicate identity
- `FrozenInput`, including the Git base commit/tree and lane path mapping when
  applicable
- `RunningCell`, including an attempt ID, deterministic provider lookup
  identities, and any acquired observation or concrete sandbox/process details
- `ObservationHandle`
- `SubmittedArtifact`
- `SolverTerminal`
- `EvaluationResult`

One resource-owned record follows the local transitions
`Running -> SolverTerminal -> Evaluated`. The record binds the cell, frozen
inputs, and implementation; the terminal adds the submitted artifact and agent
outcome; the evaluation refers directly to that terminal. A unique local begin
and update prevents accidental duplicate same-cell execution. Storage failure
stops the current call; the next call reads the record rather than interpreting
an acknowledgement protocol. Resource-local providers own concrete
persistence, and runtime owns their provisioning. The service owns
experiment-domain identity checks, ordering, adoption, and interpretation;
lanes supply study data and policy, not persistence implementations.

The semantic laws are:

- exact terminal adoption precedes every execution effect;
- only a successful unique local transition to `Running`, with deterministic
  provider lookup identities derived from the exact cell and attempt, permits
  observation, sandbox, or process acquisition;
- the terminal payload is immutable once recorded; later transitions only add
  evaluation or projection state;
- a downstream failure resumes only the incomplete boundary;
- a blind or nondeterministic evaluation is published before projection and is
  adopted on re-entry;
- a `Running` record retains provider lookup identities even before concrete
  locator details are recorded; providers create or adopt subjects under those
  identities so re-entry can recover across both ordinary crash windows;
- provider inspection distinguishes a live subject, an exited subject with a
  recoverable workspace or outcome, and an absent subject. A live subject
  returns already-running; an exited recoverable subject resumes artifact
  capture without rerunning the solver; an absent subject is reconciled before
  execution resumes; no replacement starts while termination or cleanup is
  unconfirmed;
- local coordination is keyed by cell; distinct cells may overlap and no
  process-wide duplicate guard serializes them;
- lanes assign distinct instance identities when a study intentionally repeats
  a cell; the service does not maintain replicate lineage;
- agent noncompletion, empty artifacts, compilation failure, policy violation,
  and low scores remain study outcomes rather than infrastructure retries.

## Resource And Provider Boundary

The initial resources are:

| Resource | Service-facing capability | Concrete provider ownership |
| --- | --- | --- |
| durable cell state | read and unique local `Running -> SolverTerminal -> Evaluated` transitions | concrete per-cell record persistence |
| research command | bounded structured process execution and termination evidence | Bun/host process implementation |
| Git artifacts | materialize, capture, apply | native Git base/mapping, supported-version preflight, and parent-owned workspaces |
| sandbox | acquire, execute/transfer, release or retain an unconfirmed locator | OpenShell |
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
The cell-state provider supplies local persistence mechanics only. The service
owns which transitions are legal, their order, and how returned states affect
the experiment.

Package build and verification is ordinary compatibility tooling outside the
running research service. Its Bun mechanics may remain resource/provider owned,
but the service MUST NOT depend on that capability.

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

## Vendor Baseline

BUILD starts from the directly pinned service/provider versions proved at
Template commit `3beb4936`. The repository lockfile, frozen install, and
behavioral tests are dependency authority. After the mandatory pre-landing
restack, this lane aligns the direct pins with the accepted Template closure and
reruns those checks; it does not build a second transitive-admission system.

| Boundary | BUILD identity |
| --- | --- |
| oRPC | `@orpc/*@1.14.8` |
| TypeBox | `typebox@1.3.6` |
| Effect | `effect@4.0.0-beta.100` |
| effect-oRPC | `effect-orpc@1.0.0-effect-v4.8` |
| Bun | `1.3.14` |
| Git | admitted at `>=2.48.0`; resolved version recorded diagnostically |
| OpenShell | `0.0.89` |
| Codex CLI | `0.144.6` |
| Langfuse | `@langfuse/{client,otel,tracing}@5.9.1` |
| OpenTelemetry | API `1.9.1`; core/resources/trace SDK `2.9.0`; OTLP HTTP `0.220.0` |
| EVLog | `2.22.3` |

The service does not create another Effect or TypeScript realm. It follows the
accepted Template service closure. Resource providers use the compatible
Effect/platform closure selected by Template and do not export live runtime
values through service contracts.

Additional fixed vendor laws remain:

- Codex admission combines process truth with version-bound rollout evidence;
  requested flags, public JSONL, and telemetry are not effective-model proof.
- Codex cancellation completes before outer sandbox release. Unconfirmed exit
  leaves the running cell's exact process and sandbox locator incomplete.
- Langfuse scores target the recorded experiment-item root trace and
  observation. Local projection status is recorded; remote readback is
  policy-requested per cell or reconciled at run level and never determines
  local terminal/evaluation correctness.
- Codex-Langfuse uses one full W3C carrier and cannot create a second
  application root. Legacy trace-seed mode is rejected.
- Codex-Langfuse projects the supplied decoded turn set without selecting it,
  including incomplete/interrupted turns.
- EVLog is diagnostic, initialized once per process, uses public APIs only,
  redacts before drain, and cannot alter study truth.
- OpenShell consumes an explicitly selected running gateway but never owns its
  lifecycle.

## Artifact And Cross-Repository Boundary

The Git-artifact provider is deliberately native and narrow:

- history-free materialization of the exact commit/tree/subtree into a clean
  parent-owned workspace;
- the base commit/tree and lane path mapping required to repeat the operation
  are persisted in `FrozenInput`;
- the provider rejects Git below `2.48.0` and records the resolved version
  diagnostically; an exact supported-version change does not invalidate the
  frozen input or patch;
- `git add -A` stages changes within the lane-declared product paths under native
  Git ignore semantics, then the cached diff uses
  `--binary --full-index --no-ext-diff --no-textconv`;
- patch SHA-256 identifies the submitted artifact;
- a fresh pristine workspace applies that patch and must reconstruct the same
  product tree.

The provider does not neutralize or reinterpret Git attributes, configuration,
hooks, filters, or installed state. Native Git semantics are the authority.
There is no provider-envelope protocol, hostile-policy mode, or regenerated
patch-byte authority.

Cross-repository compatibility uses ordinary Bun package behavior outside the
running service:

- copy the selected service/resource packages to clean adapter-owned staging
  without changing caller source or lockfiles;
- run the repository's ordinary package build in staging;
- run `bun pm pack --ignore-scripts`;
- atomically publish the resulting tarball with SHA-256 and byte length;
- install it into a clean consumer with
  `bun install --frozen-lockfile --ignore-scripts`;
- run the lane's import, type, and model-free smoke checks;
- clean staging and avoid partial publication on interruption.

Standard Bun workspace, package, and lock behavior is authority. The embedded
runtime manifest, custom Bun-v1 lock/placement graph, installed content/mode
attestation, collision classifiers, and special closure-admission protocol from
`ce282cb0` are not migrated. `installed-package.ts`,
`package-materialization.ts`, and related graph/manifest code remain historical
source-quarry evidence only.

This change adds no artifact aggregator, bundle format, registry, release
plane, package manager, compatibility abstraction, or source checkout
dependency.

## Testing Strategy

### Service

- apply every `.habitat/blueprints/service` packet to
  `services/research-experiment`;
- compile the exact oRPC contract/router/client types;
- test the `cells.run` procedure through the real effect-oRPC implementer with
  injected resource ports;
- test local duplicate prevention, restart/resume, terminal and evaluation
  adoption, distinct-cell overlap, running-locator inspection/cleanup, and
  failure separation;
- test TypeBox request/output/error contracts behaviorally, not with source
  string assertions.

### Resources And Providers

- use real temporary roots and fixture processes for filesystem/process
  guarantees;
- prove cancellation before sandbox release, interruption cleanup, retained
  unconfirmed locator, and primary/secondary failure ordering;
- prove recovery when a process dies after provider acquisition but before
  concrete locator update, and when a solver exits before artifact capture;
  the latter resumes capture from the retained workspace/outcome without
  rerunning the solver;
- prove exact revision/subtree materialization, base/mapping mismatch, allowed
  patch add/delete/rename/mode/binary/text behavior, empty patch, Git
  minimum-version failure, fresh apply, and reconstructed product-tree equality;
- prove staged package source/lock immutability, tarball SHA/length and atomic
  publication, clean frozen consumer import/type/smoke, and interruption cleanup;
- use local fixture servers and captured Codex/Langfuse data rather than model
  calls or provider mutation;
- enforce service-to-resource and resource-to-provider dependency direction
  with Habitat/GritQL.

### Lane Compatibility

- oRPC: one retained model-free cell through the service;
- Inngest: retained S09 through the service, with the seven-file seed view,
  lane-owned control overlay, `src/**`, `test/**`, and `REENTRY.md` product
  mapping, service-owned Git base/mapping, and existing hidden
  verification;
- both lanes consume the same ordinary packed Template closure while retaining
  their own fixtures and evidence.

## Migration

1. Commit and accept this deletion-first ownership checkpoint.
2. Restack onto the authoritative Template commit containing the current
   service/vendor closure and legal process-runtime provider provisioning.
3. Scaffold `services/research-experiment` by applying the existing service
   blueprint and current `agent-plugin-lifecycle` pattern.
4. Move service-domain DTOs and pure laws from `packages/research-sdk` into the
   cells module, collapsing distributed attempt/stage/residue machinery into one
   local per-cell record; replace custom schemas/decoders with TypeBox.
5. Move command, Git, and vendor behavior behind resource contracts/providers;
   move durable state behind a cell-state resource/provider while keeping
   experiment write ordering in the service; retain only native Git patching and
   ordinary Bun pack/install/smoke behavior.
6. Delete package runtime, custom capabilities, barrels, and the
   `@rawr/research-sdk` package identity.
7. Bind and pass the two model-free lane compatibility cells.
8. Remove superseded active lane machinery, preserving frozen evidence.
9. Restack again, align direct pins, run the frozen install and deterministic
   gate, and obtain exact-commit acceptance from both directors.

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
- a live or unconfirmed recorded process permits same-cell replacement;
- Git patch capture cannot reconstruct the submitted product tree;
- Bun packaging mutates caller source/lock state or cannot pass a clean frozen
  consumer smoke check;
- frozen evidence must be relocated to use the service;
- a new package, scheduler, controller, receipt graph, store, package manager,
  or distribution plane appears without an independently proved need.
