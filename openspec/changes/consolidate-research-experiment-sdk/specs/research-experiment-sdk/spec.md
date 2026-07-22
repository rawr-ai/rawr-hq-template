## ADDED Requirements

### Requirement: One Template-owned generic research SDK
RAWR HQ-Template MUST own one buildable `@rawr/research-sdk` package containing
generic research execution contracts and named vendor adapters. SDK core MUST
NOT contain oRPC, Inngest, skill-efficacy, challenge, corpus, rubric, or
individual-study semantics. The package MUST isolate its dependency closure and
MUST NOT require upgrading Template's root Effect 3 runtime. The package MUST
NOT import or depend on Template lifecycle/controller packages. Its standalone
TypeScript 7 configuration MUST NOT extend Template's root TypeScript config or
load TypeScript 7 through the Nx API.

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
schemas MUST compose the generic definition explicitly rather than through an
untyped extension bag. Reusable generic property fragments MUST NOT be decoded
as independent public objects: lanes MUST merge generic and subject properties
and close the final public object once, never intersect separately closed
objects. Structural checking MUST use a noncorrective path independent of
TypeBox's process-global corrective setting. Semantic validation and the
clone/freeze snapshot MUST remain explicit later steps, and callback-bearing
refinements MUST NOT be exported as portable schemas.

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
criteria. The Langfuse trial subject MUST be the experiment-item root
observation. Scores for a trial MUST target its exact trace and observation IDs;
trace-summary I/O and run-level scores MUST NOT substitute for that subject. A
full W3C carrier MUST preserve `traceparent`, optional `tracestate`, and exactly
one matching Langfuse trace ID in baggage beneath the provider-owned root.

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
Codex-Langfuse, Codex-OpenShell, Git/Bun, and EVLog. OpenShell MUST own sandbox
lifecycle only. Codex MUST own agent invocation and session decoding. Langfuse
MUST own experiment/trace/score projection only. Codex-Langfuse MUST own its
maintained plugin source/build/configuration, carrier propagation,
decoded-session projection, supplied per-turn prompt linkage, and observation
parenting only; it MUST NOT select turns or own study/failure policy.
Codex-OpenShell MUST own only the reusable provider/auth/profile bridge and MUST
NOT persist secrets or own study policy. Git/Bun MUST own materialization and
submitted artifacts. EVLog MUST own non-authoritative operational events.

#### Scenario: Vendor behavior cannot decide study policy
- **WHEN** an adapter returns a typed vendor result or failure
- **THEN** lane code interprets that result under its own study contract
- **AND** the adapter does not select a rubric, retry product work, or declare
  correctness

### Requirement: Concrete adapter composition
Core configuration MUST NOT contain selected adapter names, an adapter registry,
or string-based vendor dispatch. Each adapter MUST own a TypeBox configuration
schema and expose an Effect Layer. Lane code MUST import concrete adapter
subpaths and compose those Layers directly. The only legal adapter crossings
MUST be `codex-langfuse -> codex + langfuse` and
`codex-openshell -> codex + openshell`.

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
If graceful interruption does not terminate within its declared deadline, Codex
MUST escalate to a bounded forced termination and retain that outcome as
evidence.
OpenShell MUST finalize the containing sandbox only after that invocation exits.
The adapters MUST NOT race to terminate each other's directly owned resource.
The SDK MUST own an exact Effect 4 closure. Effect 3 Template packages MUST NOT
import or re-export SDK Effect runtime values; only Effect-neutral,
TypeBox-decoded data MAY cross the major-version boundary.

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
explicit study mapping. Deterministic tests MUST probe TypeBox checking and
snapshotting, process
interruption, scoped resource release, artifact round-trip, terminal adoption,
failure separation, exact observation subjects, effective Codex rollout
envelopes, deterministic projection, EVLog lifecycle, and package-local
compiler isolation. Tests MUST NOT assert source strings, helper counts, command
spelling, or a preferred internal implementation.
Dependency-direction enforcement MUST use GritQL import patterns rather than
brittle text matching. It MUST also prove that SDK Effect 4 runtime subpaths do
not cross into Effect 3 packages and that only the designated neutral decoded
contract is eligible for cross-major consumption.

All automated BUILD checks MUST be model-free. They MUST use captured rollouts,
local fixture servers, and injected command/provider boundaries rather than
invoking a model, changing a provider/profile, starting or reconfiguring a
gateway, mutating an image, or writing remote Langfuse resources. A model-free
OpenShell lifecycle check MAY acquire and delete one explicitly named,
provider-free sandbox against a caller-supplied running gateway.

#### Scenario: Both lanes pass model-free compatibility
- **WHEN** the SDK and lane bindings are ready for cutover
- **THEN** one retained oRPC cell and one retained Inngest cell complete their
  deterministic preparation/evaluation paths without model or provider mutation
- **AND** SDK lint, typecheck, tests, build, Nx checks, Habitat, and bounded
  vendor reviews are green

### Requirement: Immutable local package compatibility
Lane compatibility MUST consume an immutable locally packed SDK artifact that
is built before `bun pm pack --ignore-scripts` and binds package version,
protocol version, content digest, and a resolution/integrity manifest for the
SDK's complete runtime dependency closure derived from the frozen workspace
lock. Each isolated lane consumer MUST use a frozen owner-local lock that
resolves exactly that manifest and MUST compare its resolved lock and installed
graph to the embedded manifest before any SDK adapter import. A Template Git
SHA MAY provide provenance but MUST NOT
be the cross-repository package interface. This change MUST NOT introduce
registry publication, a release plane, artifact service, custom package
manager, or direct cross-repository source dependency. The OpenSpec change MUST
remain the sole shared design and coordination record; each repository's branch
and checks own its local mutations.

#### Scenario: Both lanes test the same package bytes
- **WHEN** oRPC and Inngest run their model-free compatibility checks
- **THEN** both consume the same locally packed artifact identity and protocol
- **AND** both installed dependency graphs match its exact resolution/integrity
  manifest
- **AND** neither imports the Template source checkout or relocates evidence

### Requirement: Verified exact vendor closure
The SDK MUST use the exact package/dependency closure accepted in the DESIGN
disposition. External executables MUST satisfy their admitted version
constraints, and their resolved paths and versions MUST be recorded and
preflighted before resource acquisition.
OpenShell operations MUST name an explicit gateway or endpoint and workspace;
the SDK MUST consume but MUST NOT start or own gateway lifecycle. Codex
admission MUST combine process truth with its version-bound rollout evidence and
MUST NOT treat requested flags, public JSONL, or telemetry as effective-model
proof. Langfuse readback MUST verify exact score subjects and MUST NOT treat
flush as ingestion proof. EVLog MUST use one public process-global
initialization and MUST remain diagnostic.

#### Scenario: Historical qualified versions do not silently become current
- **WHEN** a lane attempts to run with an old OpenShell, Codex, dependency lock,
plugin provenance manifest, or other mismatched closure identity
- **THEN** preparation fails before sandbox or provider acquisition
- **AND** no historical receipt is reinterpreted as qualification of new bytes

#### Scenario: Patched plugin provenance is rebuilt from authority
- **WHEN** Codex-Langfuse source is frozen for BUILD
- **THEN** its upstream digest manifest is derived from the named official Git
  objects and the deterministic bundle is rebuilt from maintained source
- **AND** the two historical manifests with mismatched upstream hashes are
  retained only as historical evidence, never copied as current authority

### Requirement: Canonical submitted-artifact substrate
The Git/Bun adapter MUST hash durable identities with cryptographic SHA-256 and
MUST produce a staged full-index binary Git patch with external diff and
textconv disabled. It MUST apply-check and apply against a fresh exact baseline,
then regenerate and compare canonical bytes and digest. It MUST NOT use
noncryptographic `Bun.hash`, three-way patch inference, or solver-authored tests
as artifact authority.

#### Scenario: Patch contains every product change
- **WHEN** a solver adds, deletes, renames, changes mode, or modifies binary and
  text files
- **THEN** the fresh verifier reconstructs exactly those bytes from the patch
- **AND** regenerated canonical patch bytes and SHA-256 match the submission

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
