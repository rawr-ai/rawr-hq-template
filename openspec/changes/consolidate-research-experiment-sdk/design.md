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
isolated package can host the verified Effect 4 closure
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
| Study | lane vault | cases, prompts, treatment, configuration, bindings, verification, evaluation, aggregation, outputs | generic vendor implementation or vendor adapters |
| Evidence | lane vault | immutable run artifacts and historical interpretation | SDK continuation authority |

The seam is language and authority: the SDK knows cells, stage inputs, artifacts,
observations, and typed failures. A study knows what those values mean.

## Entities And Identity

The accepted core entities are deliberately few:

- `StudyIdentity`: stable study ID and revision.
- `CellKey`: study, case, condition, profile, and a stable lane-supplied
  instance identity. Retries and re-entry for one logical invocation retain
  that instance. Only explicit lane authority creates a new replicate or
  replay instance, recording its predecessor lineage and reason without
  changing the prior instance.
- `FrozenInput`: canonical input hash plus declared authorities, including the
  artifact-substrate identity whenever the study accepts a Git patch.
- `StageOutput<S, V>`: an envelope for a lane-declared durable output that binds
  its stage, exact cell, frozen-input digest, implementation revision, declared
  predecessor digest set or closure, output digest, and value.
- `PreparedCell`: materialized input ready for execution.
- `ObservationHandle`: acquired correlation carrier established before
  execution, embedded in the solver terminal, and settled or projected against
  that exact subject afterward.
- `AgentExecution`: terminal agent response/workspace diagnostics.
- `SubmittedArtifact`: host-owned `Captured` or scoreable `Empty` product
  submission and digest.
- `SolverTerminal`: write-once execution result containing the exact cell and
  input identities, observation handle, agent outcome, submitted artifact, and
  their digests. It is a lane-declared durable `StageOutput` and therefore its
  publication key also binds frozen input, implementation revision, declared
  predecessor identities, and instance.
- `EvaluationResult`: deterministic and/or judged study result, published as a
  lane-declared durable `StageOutput` whose predecessors bind the exact
  `SolverTerminal` before score projection.

Raw evidence, accepted stage output, remote telemetry, and historical claims
remain distinguishable. Matching names do not imply matching identity; hashes
and exact predecessors do.

## Stage Interfaces And Flow

```text
StudyDefinition
  -> Prepare -> PreparedCell
  -> attempt exact SolverTerminal adoption
       hit  -> recover persisted ObservationHandle; skip acquire and solver
       miss -> Observe.acquire -> ObservationHandle
                 -> Execute (Codex + host artifact capture + terminal sink)
                    -> persisted SolverTerminal
  -> Observe.settle(recovered or acquired handle, execution exit)
  -> adopt or Evaluate -> persist exact EvaluationResult
  -> Observe.project(handle, persisted evaluation) (independently resumable)
  -> lane-owned pure aggregation and reporting
```

The public interfaces are capabilities, not a workflow graph:

```ts
interface Prepare<I, O, E, R> {
  prepare(input: I): Effect.Effect<O, E, R>
}

interface Execute<I, T extends SolverTerminal, E, R> {
  execute(input: I): Effect.Effect<T, E, R>
}

interface Observe<C, AcquireE, SettleE, R> {
  acquire(context: C): Effect.Effect<ObservationHandle, AcquireE, R>

  settle<E2>(input: {
    handle: ObservationHandle
    execution: Exit.Exit<SolverTerminal, E2>
  }): Effect.Effect<ObservationResult, SettleE, R>

  project(
    input: ObservationProjection & { handle: ObservationHandle },
  ): Effect.Effect<ObservationProjectionResult, ObservationProjectionError, R>
}

interface Evaluate<I, O, E, R> {
  evaluate(input: I): Effect.Effect<O, E, R>
}
```

Studies compose these interfaces directly with Effect. The SDK does not expose
a phase registry, DAG, generic worker, or global state machine.

Lane composition attempts exact solver-terminal adoption before observation
acquisition. On an adoption hit it recovers the persisted handle and skips both
acquisition and solver execution. Only a miss may acquire a new handle; failure
to establish required correlation may then prevent execution. After
acquisition, the lane supplies the exact handle to Execute, and the persisted
solver terminal binds that handle to the submitted artifact and agent outcome.
The lane calls settlement with the handle and execution `Exit` on every exit it
can observe. A crash after acquisition but before terminal publication may
leave a non-authoritative orphan observation: the lane preserves or settles it
when discoverable, never adopts it as the trial subject, and may replace that
pre-terminal execution under the same instance. A crash after terminal
publication recovers the same handle and resumes settlement without rerunning
the solver. Evaluation publishes its exact result durably before projection;
later projection adopts that result instead of rerunning a blind or otherwise
nondeterministic evaluation. Settlement and projection failures therefore
cannot erase or change successful execution or evaluation truth.

## Continuation And Failure Law

```text
Declared -> Prepared -> Executing -> SolverTerminal -> Evaluated -> Finalized
```

This is a reasoning model, not a controller implementation.

- `SolverTerminal` is absorbing for an exact frozen tuple, including its
  lane-supplied instance identity.
- Retries and re-entry for the same logical invocation retain that instance.
  Only an explicit lane decision may create a new replicate or replay instance;
  it records predecessor lineage and a reason while leaving every prior
  terminal immutable.
- Host artifact capture and the agent outcome form one `SolverTerminal` with an
  explicit `Captured` or `Empty` artifact variant. A lane-provided durable sink
  publishes that complete value as a lane-declared durable `StageOutput` with
  write-once, put-if-absent semantics before it becomes adoptable or any
  verifier starts. Its key necessarily binds the exact cell and instance,
  frozen-input digest, implementation revision, and declared predecessor
  identities. An identical existing value may be adopted; a conflicting value
  at the same key is rejected and never overwritten. The typed sink port
  requires atomic create-if-absent publication plus read-after-unknown
  reconciliation when a write may have committed before acknowledgement. The
  lane composition behind Execute owns Codex invocation, Git/Bun artifact
  capture, and the sink implementation, store, and durability. Core owns only
  the typed port and pure equality/adoption conflict law; it owns no store,
  general CAS, or evidence retention.
- A lane-declared durable output is adoptable only when its exact cell
  (including instance), frozen-input digest, implementation revision, declared
  predecessor digest set or closure, and output digest match. The `StageOutput`
  envelope provides no store, transition graph, controller, or global
  continuation authority. Ephemeral adapter results need not use it.
- A mismatched or corrupt output blocks adoption; it is not silently repaired.
- Pre-terminal infrastructure interruption may replace only that execution.
- Post-terminal evaluation or observation failure resumes only the incomplete
  boundary and cannot rerun the solver.
- The exact `EvaluationResult` used for projection is itself a lane-declared
  durable `StageOutput` whose predecessor set binds the exact `SolverTerminal`.
  It is published before projection. Re-entry adopts that value; it does not
  silently repeat blind or nondeterministic evaluation.
- Product noncompletion, empty patches, compile failures, policy violations,
  and low scores are terminal study values.
- Transport, containment, corrupt transfer, frozen-input mismatch, malformed
  reviewer output, and missing correlation are typed evaluator failures.
- Langfuse grouping is never a recovery transaction.

## Configuration Contract

TypeBox is the sole SDK schema engine. Effect owns configuration acquisition,
redaction, dependency provision, and failure semantics.

Every final public TypeBox object is closed once with
`additionalProperties: false`. Reusable generic property maps or schema
fragments are not independently decoded public objects: a lane merges its
generic and subject properties first, then constructs one closed final
`Type.Object`. The composition helper makes overlapping generic and subject
property keys unrepresentable in its TypeScript signature and rejects a
runtime-supplied overlap before merging or constructing the object. It MUST NOT
intersect separately closed objects. Boundaries use
noncorrective `Value.Check`/`Value.Errors`, then perform semantic validation and
an explicit clone/freeze snapshot as separate steps. They do not call
`Value.Parse` or depend on process-global `Settings.correctiveParse`.
Literal-tagged unions express variants. Portable schemas do not export
callback-bearing `Type.Refine` values, and static readonly/immutable modifiers
are never mistaken for runtime snapshots. Canonical paths, symlink safety,
cross-field deadlines, secret prohibition, and predecessor ordering are
semantic validation after structural checking.

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

The SDK's reusable study-definition property fragment contains only generic
identity and cell topology. Each lane merges those properties with its own
TypeBox properties for cases, treatments, prompts, rubrics, checks, and output
interpretation, then closes the resulting public object once. No `unknown`
extension bag or intersection of separately closed objects is added to core.

The SDK owns an exact Effect 4 dependency while Template remains on Effect 3.
Effect 4 `Effect`, `Layer`, `Context.Tag`, `Scope`, `Exit`, runtime, and service
values MUST NOT cross into Effect 3 packages or be re-exported through neutral
contracts. Only Effect-neutral, TypeBox-decoded data crosses that boundary.

The SDK also owns a standalone TypeScript 7 configuration and does not extend
Template's root TypeScript configuration. Bun package scripts resolve the
package-local compiler; Nx invokes those scripts without loading TypeScript 7
through the Nx API. Root TypeScript, Nx, and Effect versions remain independent.

## Study Directory Topology

Lane vaults expose the same vendor-neutral logical roles through one explicit
owner-local path mapping. The names below are illustrative roles, not mandatory
directory names, an exhaustive whitelist, or material the migration relocates:

```text
studies/<study-id>/
  study.ts          # identity, cells, concrete imports, stage composition
  cases/            # lane-owned case definitions
  inputs/           # frozen source/config authority
  bindings/         # thin lane bindings/configuration selecting SDK adapters
  prompts/          # optional lane-owned prompt material
  rubrics/          # optional lane-owned evaluation material
  checks/           # optional lane-owned behavioral oracles
  results/          # current interpreted outputs
  evidence/         # immutable run evidence
  history/          # superseded studies and frozen provenance
```

The study mapping explicitly imports active lane-owned material; the SDK never
discovers it by scanning directories and never cross-repository scans. It never
scans or interprets results, evidence, or history. Template Habitat may enforce
the SDK package and dependency structure. Each lane's owner-local compatibility
or Habitat check proves that lane's mapping without granting Template authority
over the vault.

## Package Topology And Legal Crossings

```text
packages/research-sdk/
  AGENTS.md
  package.json
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    core/           # config, identity, stages, adoption, errors
    runtime/        # command capability and ManagedRuntime composition
    adapters/
      openshell/
      codex/
      langfuse/
      codex-langfuse/
      codex-openshell/
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
`codex-langfuse -> codex + langfuse` and
`codex-openshell -> codex + openshell` composition boundaries. Lane studies
select adapters and own orchestration policy.

One package with explicit subpath exports is the default. A second package is
allowed only when dependency or bundle isolation cannot be enforced inside the
package.

Lane compatibility consumes an immutable locally packed SDK artifact. The
artifact binds the package version, protocol version, content digest, and a
machine-readable resolution/integrity manifest for the SDK's complete runtime
dependency closure derived from the frozen workspace lock. A Template Git SHA
remains provenance but is not the package interface. Standard local build
followed by `bun pm pack --ignore-scripts` into an external artifact directory
supplies this boundary. Each lane installs the tarball in an isolated
compatibility consumer under a frozen owner-local lock that resolves exactly
that manifest, then a Bun-native preflight compares the resolved lock and
installed package graph to the embedded manifest before any SDK adapter import.
The root module does not re-export adapters; consumers import explicit package
subpaths. This change adds no registry publication, release plane, artifact
service, custom package manager, or cross-repository source import.

## Adapter Responsibilities

- `openshell`: gateway access, sandbox acquire/use/delete, transfer, command
  execution, workspace-scoped targeting, and cleanup visibility. It consumes an
  explicitly selected gateway but never starts or owns gateway lifecycle.
- `codex`: literal model/effort invocation, model-envelope admission, exec JSONL
  decoding, session/rollout capture, cancellation, and terminal extraction. It
  owns no model catalog or profile matrix.
- `langfuse`: experiment item context, trace identity, dataset/run membership,
  score projection, flush, and bounded readback. It never decides correctness.
- `codex-langfuse`: W3C carrier propagation and patched Codex plugin build,
  configuration, decoded-session projection, per-turn prompt linkage, and
  observation parenting. Its verified replacement uses TypeBox and does not
  retain Zod merely to reproduce historical parsing.
- `codex-openshell`: the namespaced gateway-refresh Codex provider profile,
  ephemeral auth-to-provider setup, profile/refresh qualification,
  placeholder-auth harness, explicit provider attachment, and endpoint
  coverage. It owns no registry, persisted secret, study admission, or retry
  policy.
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

## Vendor Closure Disposition

Bounded verifiers checked official documentation, exact source tags, published
packages, and the behavior already proved by both lanes. Package pins are exact
and their resolved transitive graph is manifest-bound. External executable rows
state admitted version constraints and require the resolved path and version to
be recorded and preflighted for each study:

| Boundary | Accepted identity | Authority and disposition |
| --- | --- | --- |
| Effect | `effect@4.0.0-beta.99` | Annotated ref `refs/tags/effect@4.0.0-beta.99`, tag object `c4f81f1cc9e2bbb18b2722ea6aeb4a76288dc286`, peeled commit `6184a7dc53cb9310e299b65ad6d6c712c2cbf202`; admission-time pin after applying the initiative's 72-hour package-age window on 2026-07-22, not a claim that it remains latest. Recheck immediately before install; a newly admitted beta requires another exact verification rather than a silent float. |
| TypeBox | `typebox@1.3.6` | Tag `41f0b1dd2b5f307c5e889c4463fe48839b8a5aaf`; sole public SDK schema engine. |
| SDK compiler | `typescript@7.0.2`, `@types/bun@1.3.14`, `@types/node@22.20.1` | Package-local CLI and standalone configs; Node types are isolated to the Node 22 projection boundary. |
| Bun / Git | Bun `1.3.14`; Git `>=2.48.0` | Record the resolved binaries and versions. Apple Git `2.39.5` is below the admitted patch substrate. |
| OpenShell | `0.0.89` | Tag `cbdeb4d537ad8b4b8592596b7668b9d03464544c`; workspace scoping, upstream Landlock fix, and deletion-event correction replace historical `0.0.85` patches. |
| Codex CLI | `0.144.6` | Tag commit `5d1fbf26c43abc65a203928b2e31561cb039e06d`; CLI adapter only, not Codex SDK or experimental app-server RPC. |
| Langfuse | `@langfuse/{client,otel,tracing}@5.9.1` | Source `ff6038a361ccda92bd00160bd26c1e11530febec`; the frozen Bun lock binds transitive `@langfuse/core`. |
| OpenTelemetry | API `1.9.1`; core/resources/trace SDK `2.9.0`; OTLP HTTP exporter `0.220.0` | API source `7e74509a4d848e94b2970bb5262dd3e8efeed0a2`; SDK source `40d67b7690a61bd9af0a4e5b5b9f4a14b11fc50e`. |
| Codex-Langfuse | upstream plugin `0.1.0` at `33bc50ba75ef82ed1f3718df6fdd06cdbfc7c02e` plus the required semantic delta | Upstream identity and semantic requirements are accepted DESIGN inputs. Exact maintained-source, patch, lock, and Node 22 ESM bundle identities are BUILD source-freeze outputs derived from authority, never copied from a historical bundle. |
| EVLog | `evlog@2.22.3` | Tag commit `64b0bf067ef94c3e4928ed49e4ddb7208eae5ce3`; npm integrity `sha512-xybbUKtV26ezgyagT0aZ6tigIjwQuc4mI0Fm52goospAdGAA4ApC+keC36Bsxt1Gm7vT8W429T3WIsqMc8nwMQ==`. |

OpenShell binds the macOS arm64 CLI archive
`5f880d1757dcb34382d2235754cae614398a34b908f482efd0cc107598a0bbc4`,
gateway archive
`cf1a2c92edb7a199a7e72cb81455ba7ed9ad01644425e662fe97067a63f69b3b`,
and supervisor OCI index
`sha256:165f2e1e4e2ebaebed47de8acbf5d84cbbcf1bc5cf86f4bf1137f42715e5acbe`.
Study images remain lane-supplied immutable digests.

Authoritative sources are the exact official trees and references, not copied
documentation: [Effect tag](https://github.com/Effect-TS/effect/tree/6184a7dc53cb9310e299b65ad6d6c712c2cbf202),
[TypeBox tag](https://github.com/sinclairzx81/typebox/tree/1.3.6),
[OpenShell release](https://github.com/NVIDIA/OpenShell/releases/tag/v0.0.89),
[Codex source](https://github.com/openai/codex/tree/5d1fbf26c43abc65a203928b2e31561cb039e06d),
[Langfuse JS source](https://github.com/langfuse/langfuse-js/tree/ff6038a361ccda92bd00160bd26c1e11530febec/packages),
[OpenTelemetry source](https://github.com/open-telemetry/opentelemetry-js/tree/40d67b7690a61bd9af0a4e5b5b9f4a14b11fc50e),
[Codex observability plugin](https://github.com/langfuse/codex-observability-plugin/tree/33bc50ba75ef82ed1f3718df6fdd06cdbfc7c02e),
and [EVLog tag](https://github.com/HugoRCD/evlog/tree/evlog%402.22.3).

### Effect And Process Runtime

- One `ManagedRuntime` owns each process composition boundary, not each cell.
- Effect `Config` and `Redacted` acquire secrets; TypeBox owns structural data.
- `Layer` and scoped `acquireRelease` own resources. Cleanup failures remain
  visible secondary diagnostics and never replace the primary solver outcome.
- No Effect source checkout or submodule is required. Exact published package
  types plus the official tag are authority unless BUILD proves a source-asset
  dependency that the package cannot supply.

### OpenShell And Codex

- Every OpenShell operation names the gateway or endpoint and workspace. The
  gateway owner supplies explicit config and database; the SDK never relies on
  XDG defaults, starts the gateway, uses implicit last/default resources, or
  deletes globally.
- Provider v2/profile and image identities are preflight inputs. Landlock uses
  `hard_requirement`; sandbox transfer uses exact archives; cleanup targets only
  the preselected sandbox name and compensates ambiguous partial acquisition.
- Codex receives isolated `HOME`, `CODEX_HOME`, and `CODEX_SQLITE_HOME`, explicit
  model/effort/cwd/config, structured argv, and no ambient user config/rules.
  External-sandbox bypass is legal only beneath the OpenShell confinement
  composition.
- Process exit, signal, timeout, stdout JSONL, stderr, final-message output, and
  rollout files are independent evidence. Unknown JSONL events are preserved.
  Interruption cannot depend on a terminal JSON event.
- Effective model/effort/instruction admission comes from the exact
  version-bound rollout `session_meta` and `turn_context`, not requested flags,
  public JSONL, or telemetry. Resume is by exact thread ID; changed base
  instructions on resume are prohibited or explicitly unproved.
- Codex owns SIGINT and bounded escalation and must reach terminal process state
  before OpenShell releases the sandbox.
- If bounded escalation is sent but process exit cannot be confirmed, Codex
  returns typed `ProcessTerminationUnconfirmed` evidence. The
  Codex-OpenShell/lane composition binds it to the exact sandbox locator as
  unresolved residue. OpenShell does not claim release, silently delete, or
  rerun that subject. Scoped release ends with confirmed cleanup or explicit
  retained residue, preserving the primary failure and any secondary cleanup
  failure.

### Langfuse, OpenTelemetry, And Codex Projection

- The Langfuse experiment item root observation is the trial subject. Acquire
  and retain both trace ID and observation ID synchronously. Item scores target
  that exact trace-and-observation pair; aggregate scores target the dataset run.
  Trace-summary input/output is not authority.
- `experiment.run` may omit rejected tasks or evaluators. Lanes reconcile the
  expected set; Langfuse is not a recovery transaction or correctness oracle.
- Full W3C propagation includes `traceparent`, optional `tracestate`, and exactly
  one matching `langfuse_trace_id` in baggage. Projection runs under the
  extracted context so baggage and the provider-owned root remain intact.
- Codex-Langfuse projects decoded Codex turns, real model generations, tools,
  and subagents below the one provider root. It accepts optional per-turn
  `PromptRef` values and links each only to that turn's first real generation.
  It never chooses turns, episodes, prompt policy, metadata admissibility, or
  failure policy.
- Parented mode rejects legacy trace-seed configuration and cannot create a
  second application root. Projection is selection-neutral over the exact
  decoded turn set supplied by the lane, including an incomplete or interrupted
  turn.
- Score IDs are idempotent update keys, not write-once evidence. BOOLEAN writes
  use numeric `0`/`1`. Flush is not ingestion proof; bounded paginated readback
  verifies exact subject, type, config, value, and metadata.
- One OTel bootstrap owns each projection process. Force-flush and shutdown are
  distinct, idempotent lifecycle steps; use after close rejects.
- Before source freeze, derive the upstream plugin digest manifest directly
  from Git objects. Historical provenance records include three alleged
  upstream hashes that do not match the named official tree, so those records
  cannot be copied as byte-exact authority. At upstream commit `33bc50ba`, the
  official SHA-256 values are
  `67549029a3d3f2c5766432fded11c92c26857911dd7eaa3b194eeef8d92ae9a9`
  for `config.ts`,
  `430bac98eac56c29099d740b211a14c883bf2c53ef3a450e47ac8abc64c9cc51`
  for `instrumentation.ts`, and
  `d26b335955f183da51bb95cb91fdc236b9d3cb252ca7ec70d3366371a0a4359c`
  for `trace.ts`; BUILD derives and verifies rather than hand-copying them.

### EVLog

- Initialize EVLog once per process composition boundary. Its public module has
  no reset/dispose contract and does not support independent concurrent configs.
- Use public `initLogger`, `createLogger`, ordinary `emit`, and independently
  accountable low-level sink pipelines. Do not migrate underscored lifecycle
  options or high-level drains that swallow sender failures.
- Redact after event construction and before console/drains. The lane supplies
  bounded event vocabulary and correlation. Events never contain error causes,
  stacks, prompts, secrets, artifacts, or evidence truth.
- Stop intake before idempotent final flush. Track buffered and in-flight work
  separately; terminal drops remain diagnostics and cannot reclassify product
  or evaluator outcomes.

### Bun And Git Artifacts

- Use `Bun.CryptoHasher("sha256")` for durable identities, never `Bun.hash`.
- `FrozenInput` binds an artifact-substrate identity containing the exact
  resolved Git binary and version plus the normalized environment and diff
  configuration. At minimum that substrate
  fixes `LC_ALL=C`, `LANG=C`, `TZ=UTC`, `GIT_CONFIG_NOSYSTEM=1`, and
  `GIT_CONFIG_GLOBAL` to an empty lane-owned file. It explicitly fixes path
  quoting, line-ending conversion, file-mode handling, rename detection, diff
  prefixes, diff algorithm, color, and the indent heuristic.
- Git creates the submission with that substrate: `git add -A`, then
  `git diff --cached` with config overrides `core.quotePath=true`,
  `core.autocrlf=false`, `core.fileMode=true`, and `color.ui=false`, plus
  `--binary`, `--full-index`, `--no-ext-diff`, `--no-textconv`, `--no-renames`,
  `--src-prefix=a/`, `--dst-prefix=b/`, `--diff-algorithm=myers`, and
  `--no-indent-heuristic`.
  The same binary, environment, and configuration apply-check and apply it to a
  fresh exact baseline, regenerate it, and require identical bytes and digest.
  Adoption rejects a different Git identity or canonicalization configuration
  rather than comparing unlike patch bytes.
- Git archive owns history-free materialization. Bun archive is not assumed
  portable until mode and symlink behavior prove it for the target platform.
- Build before `bun pm pack --ignore-scripts`; inspect the archive, bind package
  version, protocol version, SHA-256, and the resolution/integrity manifest
  derived from the frozen SDK lock. Both lane consumers import the same tarball
  bytes and prove their own frozen locks and installed graphs match that
  manifest before importing an adapter.

## Testing Strategy

Tests target persistent behavioral guarantees, not implementation text:

1. Strict TypeBox checking accepts a merged generic-plus-lane object and rejects
   an additional unknown field, malformed tagged unions, numeric-string
   coercion, default insertion, and unknown-field cleaning even when global
   corrective parsing is enabled. A type fixture makes generic/subject key
   overlap unrepresentable, and a dynamic collision rejects before merge or
   `Type.Object` construction. Semantic validation rejects temporary/symlink
   roots, secrets, invalid deadlines, and noncanonical predecessor sets; the
   explicit snapshot is unchanged by later mutation of the caller's input.
2. One Effect runtime builds/releases once; command success, failure, timeout,
   interruption, and cleanup failure preserve the right primary and secondary
   outcomes without leaking redacted values.
3. OpenShell exact-target preflight, model-free containment/transfer,
   partial-acquisition compensation, dual-failure visibility, and named cleanup
   behave correctly inside one workspace.
4. Codex success/failure/retryable/malformed/unknown JSONL, local fixture-server
   requests, rollout envelope admission, explicit resume, and SIGINT retain all
   evidence. An ignored-SIGINT fixture proves bounded escalation either reaches
   an observed terminal process before OpenShell release or returns typed
   `ProcessTerminationUnconfirmed` with retained sandbox residue; both paths
   preserve termination and cleanup failures under the primary/secondary law.
5. Submitted artifacts round-trip add/delete/rename/binary/mode changes through
   a fresh baseline and regenerate identical canonical patch bytes. A different
   Git binary, version, environment, or diff configuration rejects adoption
   before comparing bytes.
6. Composition attempts exact terminal adoption before observation acquisition.
   On a miss, observation handle, agent outcome, and artifact publish once as
   one solver terminal through atomic create-if-absent; an unknown write outcome
   reconciles by read. Identical retries adopt it, conflicts reject, and a
   pre-terminal orphan observation never becomes the trial subject. The exact
   evaluation result publishes durably before projection and is adopted on
   projection retry.
7. Product failure and infrastructure failure remain disjoint.
8. Full W3C carrier extraction, one provider-owned root, multi-turn Codex
   projection, prompt linkage, exact trace-and-observation score subjects,
   pagination, timeout/abort, weak flush, and bounded readback behave correctly
   without global namespace cleanliness. Parented mode rejects legacy
   trace-seed mode and cannot create a second application root. Projection is
   selection-neutral over the supplied decoded turns, including an incomplete
   or interrupted turn.
9. Codex-Langfuse rebuilds deterministically from a Git-object-derived upstream
   manifest and executes from an arbitrary working directory under Node 22.
10. EVLog proves redaction, correlation, independent sink isolation, overflow
    versus retry-exhaustion drops, in-flight flush, close-before-flush, and
    idempotent disposal without changing study outcomes.
11. Nx package scripts resolve TypeScript `7.0.2` while root TypeScript remains
    unchanged. SDK resolution proves Effect `4.0.0-beta.99`; Template remains on
    Effect `3.21.3`; Habitat/GritQL rejects imports or re-exports of
    Effect-bearing SDK subpaths from Effect-3 packages while permitting the
    designated neutral decoded contract. The packed artifact imports and
    typechecks in both model-free lane consumers, whose frozen locks and
    installed graphs match the same embedded resolution/integrity manifest and
    tarball digest.
12. Template Habitat proves SDK package shape and dependency direction; each
    lane's owner-local check proves its own study mapping. Neither tests runtime
    behavior by scanning another repository.

Habitat dependency-direction checks use GritQL patterns over imports. They are
structural law, not source-string assertions or a second runtime test suite.

Local fixture servers, captured rollouts, and injected command/provider
boundaries force failures, but the SDK's anchors remain real TypeBox checking,
Effect scopes, Git patches, Bun processes, built plugin projection, and
model-free adapter contract probes. Automated BUILD checks MUST NOT invoke a
model, create or change a provider/profile, start or reconfigure a gateway,
mutate an image, or write a remote Langfuse resource. One OpenShell lifecycle
check MAY acquire and delete an explicitly named, provider-free sandbox against
a caller-supplied running gateway; it owns neither gateway lifecycle nor
configuration. No test asserts source-code strings, helper counts, command
spelling, or a preferred internal implementation.

## Migration

1. Accept this exact frame commit.
2. Restack the two accepted frame commits onto exact Template checkpoint
   `911f319c3d3abdab5255d831e8e16ee16543c3bf`, confirming no broader replay and
   no lifecycle/controller dependency.
3. Run and disposition the bounded vendor verifiers; freeze exact versions and
   derive the Codex-Langfuse upstream manifest from official Git objects.
4. Generate one buildable Nx package and minimal Habitat rules.
5. Extract only the near-identical proven oRPC/Inngest behavior. Keep lane
   names, path conventions, service identities, and study pins in lane-owned
   configuration or bindings.
6. Merge the union of adapter behavior, including Inngest multi-turn prompt
   linkage, the Codex-OpenShell provider bridge, and oRPC plugin source
   ownership, without importing study policy.
7. Implement and test terminal-before-evaluation continuation.
8. Pack one immutable local SDK artifact with package/protocol version,
   resolution/integrity manifest, and digest; consume it under frozen
   manifest-matching locks in both lane bindings without a source checkout link.
9. Bind the oRPC study through lane-owned configuration/bindings and pass a
   model-free cell.
10. Bind the Inngest study through lane-owned configuration/bindings and pass a
    model-free cell.
11. Review dependency direction, vendor correctness, deterministic tests, Nx,
   and Habitat.
12. Remove or archive only the superseded active SDK copies; never move frozen
   evidence or historical runtime bytes.
13. Restack onto current accepted Template upstream immediately before landing,
    rerun all checks, and prove no lifecycle/controller dependency entered.
14. Both directors accept the same exact Template commit and leave all three
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
- A score is attached only to a trace summary or dataset run when the trial
  subject is the experiment-item root observation.
- Effect 3 and Effect 4 exchange runtime values rather than neutral decoded
  data.
- OpenShell owns Codex semantics, Codex owns OpenShell lifecycle, or either lane
  duplicates the shared provider bridge.
- Using the SDK requires moving historical evidence.
- The package adds a controller, scheduler, workflow graph, SDK-owned general
  CAS or receipt/evidence authority, database, hosted service, or release plane.
- Multiple packages appear without a proved dependency or bundle boundary.
- Template root dependencies must be upgraded to host the package.
