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
Observe MUST acquire experiment and trace correlation before Execute. Execute
MUST persist that exact observation handle in the solver terminal beside the
agent outcome and artifact. Observe MUST settle against the exact handle and
execution exit, and MUST project later evaluation scores against that same
handle. Settlement or projection failure MAY resume independently from the
persisted handle and MUST NOT change a solver or evaluation outcome. Missing or
uncorrelated required evidence MUST fail the observation boundary, while
cosmetic topology and provider namespace cleanliness MUST NOT be admissibility
criteria.

#### Scenario: Telemetry settlement fails after a valid artifact
- **WHEN** execution produces a persisted solver terminal and submitted artifact
  but remote score or trace readback is temporarily unavailable
- **THEN** the observation boundary remains incomplete and rerunnable
- **AND** the solver terminal and artifact remain valid and are not rerun

### Requirement: Terminal artifact precedes evaluation
The public lane-bound Execute capability MUST return one already-persisted exact
solver terminal containing the observation handle, agent outcome, and a
host-owned `Captured` or scoreable `Empty` submitted artifact. Its lane
composition MUST use the Codex and Git/Bun capabilities plus a lane-owned
durable sink internally. Publication MUST be write-once and put-if-absent:
identical existing values MAY be adopted, while a conflicting value at the same
key MUST reject without overwrite. `SolverTerminal` MUST be a lane-declared
durable `StageOutput`, so that key MUST bind the exact cell and instance,
frozen-input digest, implementation revision, and declared predecessor
identities. Core MUST own only the sink port and pure publication/adoption
conflict validation; it MUST NOT own the store or evidence retention. Solver
prose and telemetry MUST NOT replace the product artifact. The Git/Bun adapter
MUST support full-index binary-capable patches, including added, deleted,
renamed, and binary files.

#### Scenario: Verifier fails after solver completion
- **WHEN** a verifier infrastructure failure occurs after artifact persistence
- **THEN** a later identical invocation adopts the solver terminal and artifact
- **AND** reruns only the incomplete evaluation boundary

### Requirement: Exact stage adoption and disjoint failures
Every lane-declared durable stage output MUST bind its exact cell, including a
stable lane-supplied instance identity, frozen-input digest, implementation
revision, declared predecessor digest set or closure, and output digest.
Adoption MUST reject any mismatch. This typed envelope MUST NOT imply a store,
transition graph, controller, or global continuation authority, and ephemeral
adapter outputs need not use it.
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
Each investigation MUST retain its study definitions, cases, inputs,
configuration, bindings, results, evidence, and history in its own vault.
Template SDK MUST be the sole owner of the named vendor adapters. Logical study
roles MUST be supplied through an explicit lane-owned path mapping rather than
mandatory directory names. The SDK MUST NOT scan across repositories,
interpret, relocate, or become authority for frozen evidence. Both lanes MUST
be able to bind a retained study through the same generic stage interfaces.

#### Scenario: Historical evidence stays path-stable
- **WHEN** the shared SDK replaces an active duplicate runtime
- **THEN** the lane's frozen evidence and embedded historical paths remain
  unchanged
- **AND** only the live adapter binding changes

### Requirement: Structural and behavioral verification
Template Habitat MUST enforce only the SDK package shape and dependency
direction. Each lane MUST own a local compatibility or Habitat check for its
explicit study mapping. Deterministic tests MUST probe TypeBox decoding, process
interruption, scoped resource release, artifact round-trip, terminal adoption,
failure separation, and exact observation subjects. Tests MUST NOT assert source
strings, helper counts, or a preferred internal implementation.

#### Scenario: Both lanes pass model-free compatibility
- **WHEN** the SDK and lane bindings are ready for cutover
- **THEN** one retained oRPC cell and one retained Inngest cell complete their
  deterministic preparation/evaluation paths without model or provider mutation
- **AND** SDK lint, typecheck, tests, build, Nx checks, Habitat, and bounded
  vendor reviews are green

### Requirement: Immutable local package compatibility
Lane compatibility MUST consume an immutable locally packed SDK artifact that
binds package version, protocol version, and content digest. A Template Git SHA
MAY provide provenance but MUST NOT be the cross-repository package interface.
This change MUST NOT introduce registry publication, a release plane, artifact
service, or direct cross-repository source dependency. The OpenSpec change MUST
remain the sole shared design and coordination record; each repository's branch
and checks own its local mutations.

#### Scenario: Both lanes test the same package bytes
- **WHEN** oRPC and Inngest run their model-free compatibility checks
- **THEN** both consume the same locally packed artifact identity and protocol
- **AND** neither imports the Template source checkout or relocates evidence

### Requirement: Current-upstream integration
The SDK branch MUST restack onto the accepted Template simplification before
BUILD and again immediately before landing when upstream changed. Final checks
MUST prove the branch is current, imports no lifecycle/controller package, and
does not preserve the retiring controller as an SDK dependency.

#### Scenario: Upstream architecture changes before landing
- **WHEN** the primary Template simplification advances after SDK BUILD
- **THEN** the SDK branch restacks onto the accepted current commit
- **AND** all deterministic, Nx, Habitat, vendor, and no-controller-dependency
  checks rerun before director acceptance

### Requirement: No second control plane
The SDK MUST NOT add a generic scheduler around Langfuse Experiments, a
controller, workflow engine, receipt graph, CAS, database, hosted service,
package manager, release plane, or evidence authority. Multiple packages MUST
NOT be introduced without a proved dependency or bundle boundary.

#### Scenario: Consolidation remains a library
- **WHEN** a study runs through the SDK
- **THEN** the lane directly composes library capabilities and owns its outputs
- **AND** no SDK daemon, worker queue, lease, receipt, or remote service exists
