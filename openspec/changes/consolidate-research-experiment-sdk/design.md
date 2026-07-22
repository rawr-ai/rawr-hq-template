## Frame

### Objective

Create the smallest reusable research SDK that lets multiple investigations
prepare isolated cells, execute agents, correlate observations, and evaluate
submitted artifacts without duplicating vendor runtimes or surrendering
study-specific judgment.

### Hard Core

1. Local frozen study material owns input truth.
2. A submitted artifact, not solver prose or telemetry, is the product output.
3. Solver execution, artifact capture, verification, observation, and judgment
   are separate authorities.
4. Agent failure is ordinary study data. Infrastructure failure is a typed
   failure of the owning boundary.
5. A valid solver terminal cannot be erased or rerun by a later verifier,
   reviewer, or telemetry failure.
6. Vendor adapters translate capabilities; they do not decide study policy.
7. The SDK owns generic execution behavior, never research evidence or release
   disposition.

### Exterior

The SDK does not own subject corpora, prompts, treatments, profile allocation,
rubrics, behavioral oracles, result interpretation, evidence retention,
provider deployment, or model scheduling policy.

### Structural Alternative Considered

A standalone SDK repository would isolate dependencies but contradicts the
current repository authority split: Template owns generic executable tooling
and adapters. A subject vault would preserve proven code locality but make one
study the accidental generic owner. Template is selected because a single
isolated package can test the historically exercised Effect 4 candidate closure
without upgrading Template's root closure or importing Template
lifecycle/controller packages.

### Reframe Trigger

Reconsider the repository or package boundary only if an independent public
consumer requires a separately released product, Template cannot isolate the
required dependency closure, or a third study cannot integrate without core
subject changes.

## Current-State Classification

| Class | oRPC | Inngest | Target disposition |
| --- | --- | --- | --- |
| Shared core | Effect runtime, exact command execution, config, stage identities, adoption, artifact primitives | Same platform plus explicit solver-terminal continuation | Normalize into one package |
| Vendor adapters | OpenShell, Langfuse/OTel, Codex, Codex-Langfuse plugin, Git/Bun, EVLog | Same adapters with richer multi-turn prompt linkage | Named SDK adapters; union of proved behavior |
| Study-owned | Real-repository corpus, treatments, prompts, rubrics, historical comparisons, checks | 44 packets, temporal fixtures and faults, profiles, conditions, graders, release gates | Remain in each vault |
| Historical evidence | All results, transcripts, patches, frozen bundles and V7 lineage | All runs, attestations, reviews, locks, frozen bundles and protected commits | Remain immutable and path-stable |
| Superseded live machinery | Legacy Promise bridge, duplicate OpenShell client, parity/qualification helpers | Monolithic worker/controller, projection locks, qualification graph, duplicated execution paths | Do not migrate; archive or remove from active reachability after compatibility |

## Domain Boundaries

| Domain | Single authority | Owns | Must not own |
| --- | --- | --- | --- |
| Core | `@rawr/research-sdk/core` | identities, TypeBox contracts, four stage interfaces, typed stage outputs, adopt-or-reject logic | vendor clients, study policy, persistence controller |
| Runtime | `@rawr/research-sdk/runtime` | one Effect `ManagedRuntime`, exact host command capability, resource composition | sandbox command transport, study topology, global scheduling, evidence disposition |
| Adapter | named adapter module | translation to one vendor or artifact substrate | rubric, product correctness, cross-stage orchestration |
| Study | lane vault | cases, prompts, treatment, verification, evaluation, aggregation, outputs | generic vendor implementation |
| Evidence | lane vault | immutable run artifacts and historical interpretation | SDK continuation authority |

The seam is language and authority: the SDK knows cells, stage inputs, artifacts,
observations, and typed failures. A study knows what those values mean.

## Entities And Identity

The accepted core entities are deliberately few:

- `StudyIdentity`: stable study ID and revision.
- `CellKey`: study, case, condition, and profile identity.
- `FrozenInput`: canonical input hash plus declared authorities.
- `StageOutput<S, V>`: stage, cell, predecessor hash, output hash, and value.
- `PreparedCell`: materialized input ready for execution.
- `ObservationScope`: correlation carrier established before execution and
  settled independently afterward.
- `AgentExecution`: terminal agent response/workspace diagnostics.
- `SubmittedArtifact`: host-owned `Captured` or scoreable `Empty` product
  submission and digest.
- `SolverTerminal`: atomically persisted execution result containing the agent
  outcome, submitted artifact, and both digests.
- `EvaluationResult`: deterministic and/or judged study result.

Raw evidence, accepted stage output, remote telemetry, and historical claims
remain distinguishable. Matching names do not imply matching identity; hashes
and exact predecessors do.

## Stage Interfaces And Flow

```text
StudyDefinition
  -> Prepare -> PreparedCell
  -> Observe.acquire -> ObservationScope
       -> Execute -> AgentExecution -> host artifact capture
          -> SolverTerminal (agent outcome + artifact, atomically persisted)
     Observe.settle (independent result)
  -> Evaluate -> EvaluationResult
  -> lane-owned pure aggregation and reporting
```

The public interfaces are capabilities, not a workflow graph:

```ts
interface Prepare<I, O, E, R> {
  prepare(input: I): Effect.Effect<O, E, R>
}

interface Execute<I, O, E, R> {
  execute(input: I): Effect.Effect<O, E, R>
}

interface Observe<C, AcquireE, SettleE, R> {
  scope<A, E2, R2>(
    context: C,
    use: (scope: ObservationScope) => Effect.Effect<A, E2, R2>,
  ): Effect.Effect<
    {
      execution: Exit.Exit<A, E2>
      handle: ObservationHandle
      settlement: Exit.Exit<ObservationResult, SettleE>
    },
    AcquireE,
    R | R2
  >

  project(
    input: ObservationProjection,
  ): Effect.Effect<ObservationProjectionResult, ObservationProjectionError, R>
}

interface Evaluate<I, O, E, R> {
  evaluate(input: I): Effect.Effect<O, E, R>
}
```

Studies compose these interfaces directly with Effect. The SDK does not expose
a phase registry, DAG, generic worker, or global state machine.

Observation acquisition may prevent execution when correlation cannot be
established. After acquisition, `scope` captures the execution `Exit`, runs
settlement on every exit, and returns the correlation handle plus both exits as
values. Settlement failure therefore cannot erase a successful execution or
its terminal artifact. The handle remains available to project evaluation
scores later; projection is independently resumable and is not ordered ahead of
Evaluate by the SDK.

## Continuation And Failure Law

```text
Declared -> Prepared -> Executing -> SolverTerminal -> Evaluated -> Finalized
```

This is a reasoning model, not a controller implementation.

- `SolverTerminal` is absorbing for an exact frozen tuple.
- Host artifact capture and the agent outcome form one `SolverTerminal` with an
  explicit `Captured` or `Empty` artifact variant. A lane-provided durable sink
  persists that complete value atomically before it becomes adoptable or any
  verifier starts. Core validates identity and adoption; it owns no store or
  evidence retention.
- A stage output is adoptable only when cell, frozen input, predecessor, and
  implementation revision match exactly.
- A mismatched or corrupt output blocks adoption; it is not silently repaired.
- Pre-terminal infrastructure interruption may replace only that execution.
- Post-terminal evaluation or observation failure resumes only the incomplete
  boundary and cannot rerun the solver.
- Product noncompletion, empty patches, compile failures, policy violations,
  and low scores are terminal study values.
- Transport, containment, corrupt transfer, frozen-input mismatch, malformed
  reviewer output, and missing correlation are typed evaluator failures.
- Langfuse grouping is never a recovery transaction.

## Configuration Contract

TypeBox is the sole SDK schema engine. Effect owns configuration acquisition,
redaction, dependency provision, and failure semantics.

`RuntimeBaseConfig` contains:

- SDK identity and revision;
- non-temporary runtime and output roots;
- exact command environment and deadlines;
- operational event service/environment identity.

Each adapter owns its own TypeBox config schema and exposes an Effect Layer.
Lane code imports concrete adapter subpaths and composes those Layers directly;
core has no adapter registry, string dispatch, or selected-adapter field.
Secrets enter through environment-backed Effect configuration and never appear
in committed config, prompts, artifacts, telemetry metadata, or results.

`StudyDefinition` contains only generic identity and cell topology. Each lane
intersects it with its own TypeBox schema for cases, treatments, prompts,
rubrics, checks, and output interpretation. No `unknown` extension bag is added
to core.

Exact dependency pins remain unresolved until bounded vendor verifiers compare
the proposed closure with current official documentation/source. The package
may isolate Effect 4 without changing Template's root Effect 3 closure.

## Study Directory Topology

Lane vaults expose the same vendor-neutral logical roles. These names are the
minimum common shape, not an exhaustive directory whitelist:

```text
studies/<study-id>/
  study.ts          # identity, cells, concrete imports, stage composition
  cases/            # lane-owned case definitions
  inputs/           # frozen source/config authority
  bindings/         # thin lane bindings to generic stages
  prompts/          # optional lane-owned prompt material
  rubrics/          # optional lane-owned evaluation material
  checks/           # optional lane-owned behavioral oracles
  results/          # current interpreted outputs
  evidence/         # immutable run evidence
  history/          # superseded studies and frozen provenance
```

The study explicitly imports active lane-owned inputs; the SDK never discovers
them by scanning directories. It never scans or interprets `results/`,
`evidence/`, or `history/`.

## Package Topology And Legal Crossings

```text
packages/research-sdk/
  src/
    core/           # config, identity, stages, adoption, errors
    runtime/        # command capability and ManagedRuntime composition
    adapters/
      openshell/
      codex/
      langfuse/
      codex-langfuse/
      git-bun/
      evlog/
  test/             # behavior and adapter boundary probes
```

Dependency direction:

```text
core <- runtime
core <- adapter
core + selected adapters <- lane study
```

Core imports no runtime, adapter, vendor, or study module. Runtime depends only
on core ports and Effect. Adapters depend on core contracts and one vendor
surface. Adapters do not import each other except the explicit
`codex-langfuse -> codex + langfuse` composition boundary. Lane studies select
adapters and own orchestration policy.

One package with explicit subpath exports is the default. A second package is
allowed only when dependency or bundle isolation cannot be enforced inside the
package.

## Adapter Responsibilities

- `openshell`: gateway access, sandbox acquire/use/delete, transfer, command
  execution, and cleanup visibility.
- `codex`: profile selection, model-envelope admission, agent invocation, exec
  JSONL decoding, session/rollout capture, and terminal response extraction.
- `langfuse`: experiment item context, trace identity, dataset/run membership,
  score projection, flush, and bounded readback. It never decides correctness.
- `codex-langfuse`: W3C carrier propagation and patched Codex plugin build,
  configuration, and observation linkage. Zod may remain private here only if
  exact qualified plugin compatibility requires it.
- `git-bun`: history-free materialization, safe tree transfer, full-index
  binary patch capture, patch application, and artifact hashing.
- `evlog`: bounded host-side phase/failure events. Drain failure is diagnostic
  and cannot reclassify study outcomes.

Cancellation has one owner at each nesting level. Codex cancels or terminates
the active agent invocation and waits for it to exit. OpenShell finalizes the
containing sandbox only after that invocation has exited. Sandbox cleanup
failure remains secondary and visible; neither adapter races to terminate the
other's directly owned resource.

Reviewer behavior remains lane-owned and receives a generic agent capability;
there is no reviewer adapter until a second genuinely different provider proves
one useful.

## Vendor Verification Before Build

One bounded standing verifier is assigned to each selected dependency closure:

| Verifier | Checks |
| --- | --- |
| Effect | current scoped resource, Layer, Config, interruption, and ManagedRuntime APIs |
| TypeBox | current schema compilation/decoding and static type APIs |
| OpenShell | current gateway, policy, transfer, exec, deletion, and image contract |
| Codex | current CLI/profile/JSONL/auth/session behavior and model envelope |
| Langfuse/OTel | Experiments, W3C parent context, trace subjects, scores, flush/readback |
| EVLog | wide-event construction, drains, lifecycle, and failure isolation |
| Bun/Git | exact spawn, hashing, archive, binary patch, and package build behavior |

Each returns required boundaries, exact compatible versions, and tests. These
roles review vendor usage only; they do not redesign the SDK or import vendor
documentation as runtime authority.

## Testing Strategy

Tests target persistent behavioral guarantees, not implementation text:

1. TypeBox decode rejects malformed identity, temporary roots, mixed secret
   config, and invalid deadlines.
2. Command interruption terminates the owned child and preserves bounded
   output.
3. Sandbox release runs after success, typed failure, interruption, and partial
   acquisition; cleanup failure remains visible.
4. Codex invocation cancellation completes before OpenShell sandbox release;
   each adapter terminates only its directly owned resource.
5. Submitted artifact round-trips added, deleted, renamed, and binary files.
6. Agent outcome and artifact persist atomically as one solver terminal, which
   is adopted after downstream failure without rerunning execution.
7. Product failure and infrastructure failure remain disjoint.
8. Observation settlement failure preserves the execution exit and correlation
   handle; later score projection validates the exact trace subject without
   imposing cosmetic topology or global namespace cleanliness.
9. Each lane supplies one model-free compatibility cell proving its retained
   study can bind the same interfaces and topology.
10. Habitat proves package shape, study-container shape, and dependency
   direction. It does not test runtime behavior.

Mocks may isolate a vendor port, but the SDK's anchors remain real TypeBox
decoding, Effect scopes, Git patches, Bun processes, and adapter contract tests.
No test asserts source-code strings, helper counts, or a preferred internal
implementation.

## Migration

1. Accept this exact frame commit.
2. Restack onto the primary Template lane's accepted controller simplification,
   confirming that the SDK imports no lifecycle/controller package.
3. Run and disposition the bounded vendor verifiers; freeze exact versions.
4. Generate one buildable Nx package and minimal Habitat rules.
5. Extract only the near-identical proven oRPC/Inngest behavior. Keep lane
   names, path conventions, service identities, and study pins in lane-owned
   configuration or bindings.
6. Merge the union of adapter behavior, including Inngest multi-turn prompt
   linkage and oRPC plugin source ownership, without importing study policy.
7. Implement and test terminal-before-evaluation continuation.
8. Bind the oRPC study through a lane-owned adapter and pass a model-free cell.
9. Bind the Inngest study through a lane-owned adapter and pass a model-free
   cell.
10. Review dependency direction, vendor correctness, deterministic tests, Nx,
   and Habitat.
11. Remove or archive only the superseded active SDK copies; never move frozen
    evidence or historical runtime bytes.
12. Both directors accept the same exact Template commit and leave all three
    repositories clean.

## Falsifiers

The design is wrong or too elaborate if any of these become true:

- Core names oRPC, Inngest, skill efficacy, a challenge, an individual study,
  or subject semantics.
- A third study requires editing core rather than adding lane config/bindings.
- A vendor adapter owns a rubric, product decision, retry policy, or result
  interpretation.
- Per-cell execution regenerates corpus qualification or unrelated proofs.
- A downstream failure can erase or rerun an exact valid solver terminal.
- Telemetry availability becomes correctness authority.
- Using the SDK requires moving historical evidence.
- The package adds a controller, scheduler, workflow graph, receipt/CAS
  authority, database, hosted service, or release plane.
- Multiple packages appear without a proved dependency or bundle boundary.
- Template root dependencies must be upgraded to host the package.
