## ADDED Requirements

### Requirement: One Template-owned generic research SDK
RAWR HQ-Template MUST own one buildable `@rawr/research-sdk` package containing
generic research execution contracts and named vendor adapters. SDK core MUST
NOT contain oRPC, Inngest, skill-efficacy, challenge, corpus, rubric, or
individual-study semantics. The package MUST isolate its dependency closure and
MUST NOT require or perform a Template root Effect upgrade from this lane. The
package MUST NOT import or depend on Template lifecycle/controller packages. Its standalone
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
The composition helper MUST make generic and subject property-key overlap
unrepresentable at the type level and MUST reject any dynamically supplied
overlap before merging properties or constructing the final `Type.Object`.

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
- **AND** the SDK does not schedule the composition or infer ordering beyond
  exact predecessor identities and execution-attempt admission laws

### Requirement: Exact attempt admission precedes execution effects
Lane composition MUST attempt exact solver-terminal adoption first. After an
adoption miss, it MUST construct an execution-attempt fence binding the exact
expected `SolverTerminal` key, a lane-supplied attempt ID, and its attempt
digest. A lane-owned durable port MUST atomically persist that fence only when
the same terminal key has neither a published terminal, active attempt, nor
unresolved execution residue. This admission MUST complete before observation
acquisition, sandbox acquisition, process launch, or any other execution
effect. Only an exact `Admitted` result MAY authorize those effects. `Occupied`,
`Conflict`, and `Unknown` MUST fail closed without effects; an identical
occupied fence MUST still block. If atomic admission surfaces a terminal
published after the initial adoption read, composition MUST validate and adopt
that terminal rather than execute. The resulting `SolverTerminal` MUST carry
the exact admitted attempt identity, and its publication MUST reject any
candidate whose outer terminal key or carried attempt differs from that fence.

Core MUST own only the typed admission port and pure identity, digest,
admit-or-block, and reconciliation laws. The lane MUST own atomic durability
and reconciliation. An attempt or residue MAY be cleared only with exact
lane-produced quiescence or process-termination evidence for that same
identity. Expiry, elapsed time, stealing, heartbeats, or lease semantics MUST
NOT authorize clearing or re-entry. After reconciliation, composition MUST
restart with exact terminal adoption and a new explicit admission decision;
reconciliation itself MUST NOT authorize execution effects.

#### Scenario: Concurrent invocations target one terminal
- **WHEN** two invocations concurrently seek execution authority for the same
  expected solver-terminal key
- **THEN** at most one receives exact `Admitted` authority
- **AND** every occupied, conflicting, or uncertain invocation performs no
  observation, sandbox, or process effect

#### Scenario: A process starts before residue or terminal publication
- **WHEN** an admitted attempt may still own a live process but interruption
  occurs before a terminal or unresolved-residue record is published
- **THEN** the durable attempt fence blocks observation reacquisition and rerun
- **AND** re-entry remains blocked until exact quiescence or termination
  evidence reconciles that attempt and a later invocation passes admission
  again

#### Scenario: A terminal appears between adoption and admission
- **WHEN** the initial terminal read is absent but atomic attempt admission finds
  a terminal published for that exact key
- **THEN** composition validates and adopts that terminal
- **AND** it does not acquire an observation, sandbox, or process for a second
  execution

### Requirement: Observation scopes execution without owning correctness
Lane composition MUST attempt exact solver-terminal adoption before acquiring a
new observation. On a hit it MUST recover the persisted handle and skip both
acquisition and solver execution. On a miss, observation acquisition remains
forbidden until the exact attempt-admission requirement returns `Admitted`.
Execute MUST persist that exact observation handle in the solver terminal
beside the agent outcome and artifact. An acquired handle without a published
terminal is a non-authoritative orphan: the lane MUST preserve or settle it when
observable, MUST NOT adopt it as the trial subject, and MAY replace that
pre-terminal execution under the same instance only after confirmed quiescence
or process termination plus exact attempt and residue reconciliation. Observe
MUST settle against the exact terminal-bound handle and MUST project later
evaluation scores against that same handle. The exact `EvaluationResult` used
for projection MUST first be published as a lane-declared durable `StageOutput`;
its predecessor set MUST bind the exact `SolverTerminal`. Projection resumption
MUST adopt it rather than silently reevaluate. Settlement or projection failure
MAY resume independently and MUST NOT change a solver or evaluation outcome.
Missing or uncorrelated required evidence MUST fail the observation boundary,
while cosmetic topology and provider namespace cleanliness MUST NOT be
admissibility criteria. The Langfuse trial subject MUST be the experiment-item root
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
key MUST reject without overwrite. The terminal sink port MUST require each
lane-owned implementation to provide atomic create-if-absent publication and
read-after-unknown reconciliation for commit-before-ack ambiguity.
`SolverTerminal` MUST be a lane-declared durable `StageOutput`, so that key MUST
bind the exact cell and instance, frozen-input digest, implementation revision,
and declared predecessor identities. The terminal value MUST carry the exact
admitted execution-attempt identity. A core-owned pure solver-terminal
publication classifier MUST compare the candidate outer key and carried attempt
identity with the exact fence that received `Admitted`, including unknown-write
reconciliation, and MUST reject a mismatch before publication. Core MUST own
only the sink port and pure publication/adoption conflict validation; it MUST
NOT own the store, a general CAS, or evidence retention. Solver prose and
telemetry MUST NOT replace the product artifact. The Git/Bun adapter MUST
support full-index binary-capable patches, including added, deleted, renamed,
and binary files.

#### Scenario: Verifier fails after solver completion
- **WHEN** a verifier infrastructure failure occurs after artifact persistence
- **THEN** a later identical invocation adopts the solver terminal and artifact
- **AND** reruns only the incomplete evaluation boundary

#### Scenario: Terminal publication acknowledgement is lost
- **WHEN** create-if-absent may have committed before its acknowledgement failed
- **THEN** the lane-owned sink implementation reads the exact key and adopts an
  identical value
- **AND** an authoritative absent read MAY retry create-if-absent, while an
  unavailable read or conflicting value remains typed uncertainty or conflict
  rather than triggering an unconditional overwrite

### Requirement: Exact stage adoption and disjoint failures
Every lane-declared durable stage output MUST bind its exact cell, including a
stable lane-supplied instance identity, frozen-input digest, implementation
revision, declared predecessor digest set or closure, and output digest.
Adoption MUST reject any mismatch. This typed envelope MUST NOT imply a store,
transition graph, controller, or global continuation authority, and ephemeral
adapter outputs need not use it.
Retries and re-entry for one logical invocation MUST retain the same instance.
Only explicit lane authority MAY create a new replicate or replay instance, and
that decision MUST bind predecessor lineage and a reason without mutating any
prior terminal.
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

#### Scenario: Parented Codex projection preserves the supplied subject
- **WHEN** Codex-Langfuse receives a valid parent carrier and a decoded turn set
- **THEN** it rejects legacy trace-seed mode and cannot create a second
  application root
- **AND** it projects the supplied set without selecting turns, including a
  supplied incomplete or interrupted turn

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
If process exit remains unconfirmed after escalation, Codex MUST return a typed
`ProcessTerminationUnconfirmed` outcome. The Codex-OpenShell or lane composition
MUST bind it to the exact sandbox locator as unresolved residue and MUST NOT
claim release, silently delete, or rerun that subject. It MUST publish that
residue durably before returning. A typed residue port MUST allow the lane to
query and reconcile the exact cell-and-instance record; core MUST own only that
port contract and pure identity law, while the lane owns storage, durability,
and reconciliation. OpenShell MUST finalize the containing sandbox only after
that invocation exits; otherwise scoped release MUST end in explicit retained
residue. Confirmed cleanup or retained residue MUST preserve primary and
secondary failure precedence.
The adapters MUST NOT race to terminate each other's directly owned resource.
The SDK MUST own an exact, independently verified Effect closure. It MUST NOT
export Effect runtime values through its neutral contract or into unrelated
Template packages; only Effect-neutral, TypeBox-decoded data MAY cross that
public package boundary. This law MUST remain invariant if the accepted
Template root later converges on the same Effect major.

#### Scenario: Interrupted sandbox work terminates or retains residue
- **WHEN** an executing stage is interrupted after sandbox registration
- **THEN** the directly owned process reaches confirmed termination and sandbox
  deletion runs, or the result retains typed unresolved residue and its locator
- **AND** cleanup or residue diagnostics never erase the primary cause

#### Scenario: Unconfirmed termination blocks same-instance re-entry
- **WHEN** an exact cell and instance has durable unresolved process residue
- **THEN** a later invocation cannot reacquire observation or execute that cell
- **AND** re-entry becomes legal only after the lane confirms process
  termination and reconciles the exact residue record

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
snapshotting, generic/subject key collision, process
interruption, scoped resource release, artifact round-trip, terminal adoption,
concurrent exact-attempt admission, crash-before-residue fencing,
terminal/admission race adoption, admitted-attempt terminal binding,
unresolved-residue re-entry blocking, failure separation, exact observation
subjects, effective Codex rollout envelopes, deterministic projection, EVLog
lifecycle, and package-local compiler isolation. Tests MUST NOT assert source
strings, helper counts, command spelling, or a preferred internal implementation.
Dependency-direction enforcement MUST use GritQL import patterns rather than
brittle text matching. On the current BUILD base it MUST prove that SDK Effect
4 runtime subpaths do not cross into Effect 3 packages and that only the
designated neutral decoded contract is eligible for cross-major consumption.
This is transitional evidence. After the required pre-landing restack, it MUST
be replaced by same-major or deliberate-isolation checks derived from the
actual accepted Template closure while preserving the neutral boundary.

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
- **AND** historical records with reproduced mismatched upstream hashes are
  retained only as historical evidence, never copied as current authority

### Requirement: Canonical submitted-artifact substrate
The Git/Bun adapter MUST hash durable identities with cryptographic SHA-256 and
MUST produce a staged full-index binary Git patch with external diff and
textconv disabled. `FrozenInput` MUST bind an artifact-substrate identity with
the exact resolved Git binary and version plus a normalized environment and
explicit path-quoting, line-ending, file-mode, rename-detection, prefix,
diff-algorithm, color, and indent-heuristic settings. Generation, apply-check,
apply, and regeneration MUST use that same substrate. Adoption MUST reject a
different Git identity or canonicalization configuration rather than compare
unlike bytes. It MUST apply-check and apply against a fresh exact baseline, then
regenerate and compare canonical bytes and digest. It MUST NOT use
noncryptographic `Bun.hash`, three-way patch inference, or solver-authored tests
as artifact authority.

#### Scenario: Patch substrate identity changes
- **WHEN** an otherwise identical invocation resolves a different Git binary,
  version, normalized environment, or canonical diff configuration
- **THEN** artifact adoption rejects before comparing patch bytes
- **AND** the lane must prepare a new explicitly governed input rather than
  reinterpret old bytes under new Git semantics

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
controller, workflow engine, receipt graph, SDK-owned general CAS, database,
hosted service, package manager, release plane, or evidence authority. Multiple
packages MUST NOT be introduced without a proved dependency or bundle boundary.

#### Scenario: Consolidation remains a library
- **WHEN** a study runs through the SDK
- **THEN** the lane directly composes library capabilities and owns its outputs
- **AND** no SDK daemon, worker queue, lease, receipt, or remote service exists
