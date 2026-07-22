## ADDED Requirements

### Requirement: One Template-owned generic research SDK
RAWR HQ-Template MUST own one buildable `@rawr/research-sdk` package containing
generic research execution contracts and named vendor adapters. SDK core MUST
NOT contain oRPC, Inngest, skill-efficacy, challenge, corpus, rubric, or
individual-study semantics. The package MUST isolate its dependency closure and
MUST NOT require upgrading Template's root Effect 3 runtime. The package MUST
NOT import or depend on Template lifecycle/controller packages.

#### Scenario: A third study integrates without core modification
- **WHEN** a new investigation supplies its own TypeBox study schema, stage
  bindings, cases, and concrete adapter imports
- **THEN** it compiles against the existing core interfaces without editing core
- **AND** its subject content remains outside Template

### Requirement: Vendor-neutral typed configuration
The SDK MUST use TypeBox as its external schema engine for runtime identity,
paths, deadlines, stage identities, and adapter public configuration. Adapter
secrets MUST enter through environment-backed Effect configuration and MUST NOT
appear in committed files, prompts, artifacts, metadata, or results. Lane study
schemas MUST extend the generic definition explicitly rather than through an
untyped extension bag.

#### Scenario: Subject and secret configuration stay outside core
- **WHEN** oRPC and Inngest decode their retained study definitions
- **THEN** both reuse the same generic identity and topology contracts
- **AND** subject fields and credentials remain owned by their lane and adapter

### Requirement: Four stage capability interfaces
The SDK MUST expose Prepare, Execute, Observe, and Evaluate as independent
generic capabilities. It MUST NOT expose a generic phase graph, controller,
worker, DAG, or scheduler. Study-owned code MUST compose the capabilities and
own aggregation and reporting.

#### Scenario: Study chooses its own composition
- **WHEN** a lane binds its preparation, execution, observation, and evaluation
  functions
- **THEN** each function receives only its declared capability dependencies
- **AND** the SDK does not infer ordering beyond exact predecessor identities

### Requirement: Observation scopes execution without owning correctness
Observe MUST establish experiment and trace correlation before Execute, scope
that correlation across execution, and attempt settlement on every execution
exit. Its scoped result MUST preserve the execution exit, correlation handle,
and settlement exit independently. The handle MUST remain usable for later
score projection after Evaluate. Settlement or projection failure MAY resume
independently and MUST NOT change a solver or evaluation outcome. Missing or
uncorrelated required evidence MUST fail the observation boundary, while
cosmetic topology and provider namespace cleanliness MUST NOT be admissibility
criteria.

#### Scenario: Telemetry settlement fails after a valid artifact
- **WHEN** execution produces a persisted solver terminal and submitted artifact
  but remote score or trace readback is temporarily unavailable
- **THEN** the observation boundary remains incomplete and rerunnable
- **AND** the solver terminal and artifact remain valid and are not rerun

### Requirement: Terminal artifact precedes evaluation
Execute MUST produce one exact solver terminal containing the agent outcome and
a host-owned `Captured` or scoreable `Empty` submitted artifact. A lane-provided
durable sink MUST persist that complete value atomically before it becomes
adoptable or Evaluate begins. Core MUST validate adoption but MUST NOT own the
store or evidence retention. Solver prose and telemetry MUST NOT replace the
product artifact. The Git/Bun adapter MUST support full-index binary-capable
patches, including added, deleted, renamed, and binary files.

#### Scenario: Verifier fails after solver completion
- **WHEN** a verifier infrastructure failure occurs after artifact persistence
- **THEN** a later identical invocation adopts the solver terminal and artifact
- **AND** reruns only the incomplete evaluation boundary

### Requirement: Exact stage adoption and disjoint failures
Every durable stage output MUST bind its cell, frozen input, predecessor,
implementation revision, and output digest. Adoption MUST reject any mismatch.
Product noncompletion, empty or invalid artifacts, compile/test failure, policy
violation, and low scores MUST remain terminal study values. Transport,
containment, corrupt transfer, input mismatch, malformed external output, and
missing correlation MUST remain typed infrastructure or evaluator failures.

#### Scenario: Weak agent result remains data
- **WHEN** an agent returns an empty artifact without infrastructure failure
- **THEN** Execute completes with a scoreable solver terminal
- **AND** no retry path reclassifies it as an evaluator failure

### Requirement: Named adapter ownership
The package MUST provide named adapter modules for OpenShell, Codex, Langfuse,
Codex-Langfuse, Git/Bun, and EVLog. OpenShell MUST own sandbox lifecycle only.
Codex MUST own agent invocation and session decoding. Langfuse MUST own
experiment/trace/score projection only. Codex-Langfuse MUST own carrier and
plugin instrumentation only. Git/Bun MUST own materialization and submitted
artifacts. EVLog MUST own non-authoritative operational events.

#### Scenario: Vendor behavior cannot decide study policy
- **WHEN** an adapter returns a typed vendor result or failure
- **THEN** lane code interprets that result under its own study contract
- **AND** the adapter does not select a rubric, retry product work, or declare
  correctness

### Requirement: Concrete adapter composition
Core configuration MUST NOT contain selected adapter names, an adapter registry,
or string-based vendor dispatch. Each adapter MUST own a TypeBox configuration
schema and expose an Effect Layer. Lane code MUST import concrete adapter
subpaths and compose those Layers directly.

#### Scenario: A lane selects a vendor without a plugin manager
- **WHEN** a study uses OpenShell and Codex execution with Langfuse observation
- **THEN** its composition imports those concrete adapter modules and decodes
  their schemas
- **AND** core performs no adapter discovery or string dispatch

### Requirement: Scoped Effect resource ownership
The SDK MUST use one Effect `ManagedRuntime` per process composition boundary.
Every acquired sandbox and provider resource MUST have one scoped release path.
Interruption MUST reach the directly owned process, partial acquisition MUST
compensate registered remote resources, and cleanup failure MUST remain visible.
Codex MUST own cancellation and termination of the active agent invocation.
OpenShell MUST finalize the containing sandbox only after that invocation exits.
The adapters MUST NOT race to terminate each other's directly owned resource.

#### Scenario: Interrupted sandbox work releases its resource
- **WHEN** an executing stage is interrupted after sandbox registration
- **THEN** the directly owned process is terminated and sandbox deletion runs
- **AND** any deletion failure is retained without erasing the primary cause

### Requirement: Lane-owned study and evidence topology
Each investigation MUST retain its study definitions, cases, inputs, adapters,
results, evidence, and history in its own vault. The SDK MUST NOT scan,
interpret, relocate, or become authority for frozen evidence. Both lanes MUST
be able to bind a retained study through the same generic directory topology and
stage interfaces.

#### Scenario: Historical evidence stays path-stable
- **WHEN** the shared SDK replaces an active duplicate runtime
- **THEN** the lane's frozen evidence and embedded historical paths remain
  unchanged
- **AND** only the live adapter binding changes

### Requirement: Structural and behavioral verification
Habitat MUST enforce only the SDK package shape, lane study-container shape, and
dependency direction. Deterministic tests MUST probe TypeBox decoding, process
interruption, scoped resource release, artifact round-trip, terminal adoption,
failure separation, and exact observation subjects. Tests MUST NOT assert source
strings, helper counts, or a preferred internal implementation.

#### Scenario: Both lanes pass model-free compatibility
- **WHEN** the SDK and lane adapters are ready for cutover
- **THEN** one retained oRPC cell and one retained Inngest cell complete their
  deterministic preparation/evaluation paths without model or provider mutation
- **AND** SDK lint, typecheck, tests, build, Nx checks, Habitat, and bounded
  vendor reviews are green

### Requirement: No second control plane
The SDK MUST NOT add a generic scheduler around Langfuse Experiments, a
controller, workflow engine, receipt graph, CAS, database, hosted service,
package manager, release plane, or evidence authority. Multiple packages MUST
NOT be introduced without a proved dependency or bundle boundary.

#### Scenario: Consolidation remains a library
- **WHEN** a study runs through the SDK
- **THEN** the lane directly composes library capabilities and owns its outputs
- **AND** no SDK daemon, worker queue, lease, receipt, or remote service exists
