## ADDED Requirements

### Requirement: Research experiments are an HQ-composed service capability

The system MUST implement research experiments as one
`research-experiment` service selected through the existing HQ application,
not as a package runtime or a dedicated research application.

The topology MUST assign:

- experiment domain authority to the service;
- CLI projection authority to one CLI command plugin;
- projection membership, runtime profiles, provider selection, and entrypoints
  to the HQ app;
- provider coverage and dependency validation to runtime compilation;
- provider provisioning and release to bootgraph and the Effect kernel;
- service binding, projection, and client handoff to the process runtime;
- command-handler mounting to the CLI adapter/harness;
- provisionable capability contracts to resources;
- concrete acquisition and implementation to providers;
- study content and interpretation to exterior study owners.

The initial CLI projection MUST declare service use and project `run` and
`inspect`. It MUST NOT import service repositories, resource providers, or
runtime internals.

#### Scenario: Operator invokes a research cell

- **WHEN** the operator invokes the HQ research CLI projection under a selected
  app profile
- **THEN** the app/profile selection determines the provider set
- **AND** bootgraph and the Effect kernel provision that set
- **AND** the process runtime binds and projects the service
- **AND** the CLI adapter mounts the command handler
- **AND** the CLI handler receives only the declared service client and
  invocation context
- **AND** no study consumer or command handler wires a provider.

### Requirement: The context funnel narrows at every boundary

The system MUST preserve this authority flow:

```text
HQ app/profile
  -> runtime compiler/bootgraph/process runtime
  -> research-experiment service context
  -> cells module context
  -> native oRPC handler
```

Each boundary MUST remove unavailable knowledge from its authoring/type view.
Native oRPC context MAY remain additive at runtime; the implementation MUST use
exact service/module views rather than a custom context-stripping wrapper. A
service MUST NOT receive raw app/profile selection. A module MUST NOT reopen
root dependency/config bags. A handler MUST receive only TypeBox-admitted input
and its exact narrowed module context.

Native oRPC MUST own contracts, routers, middleware, request context, declared
errors, transport, and clients. TypeBox MUST own schemas, structural
validation, and inferred types. Effect MUST own typed execution, interruption,
and resource safety. Effect-oRPC MUST own only the adaptation between the
native oRPC handler and Effect execution.

The service MUST use the canonical Template TypeBox bridge. It MUST NOT add a
manual decoder, schema/value traversal, property-map composition layer,
portability layer, Zod bridge, or research-local Standard Schema adapter.

#### Scenario: Handler is constructed

- **WHEN** the runtime binds the service and the cells module
- **THEN** service resource requirements are satisfied through the runtime
  context
- **AND** the module receives only its declared capabilities
- **AND** the native handler remains the visible operation authoring site
- **AND** no detached function reconstructs the handler's input and context as
  a parallel execution authority.

### Requirement: The cells module exposes exactly run and inspect

The initial `cells` service module MUST expose exactly two callable operations:

- `cells.run`;
- `cells.inspect`.

Prepare, execute, observe, artifact capture, verify, and evaluate MUST remain
internal service sequencing, policies, repositories, or outside capability
calls. They MUST NOT become public stage procedures or generic capability
interfaces.

A third public operation MAY be added only after a named operator action proves
independent domain intent, authorization, and outcome that cannot be expressed
truthfully as run/resume or read-only inspect. Exposing an internal stage does
not satisfy this condition.

`cells.run` MUST validate one exact cell request and advance every reachable
incomplete boundary until the cell is `Evaluated` or the call reaches the first
typed domain refusal or recoverable infrastructure failure. It MUST return
durable truth, correlations, typed refusals/failures, and study outcomes.

`cells.inspect` MUST read durable truth and correlation identifiers. It MUST
NOT write state, acquire/release/cancel a provider subject, settle telemetry, or
authorize replacement work.

#### Scenario: Inspection is repeated

- **WHEN** `cells.inspect` is called repeatedly for the same exact identity
- **THEN** each call returns the current durable state without transition
- **AND** no new experiment subject or cleanup operation occurs
- **AND** an inspect-capable runtime closure can bind persistence and the
  service without requiring healthy run-only providers
- **AND** any separately displayed fresh provider status is labeled as
  redacted runtime diagnostics rather than cell truth.

### Requirement: The service owns cell state and persistence semantics

The service MUST own cell record schemas, migrations, repository semantics,
legal transitions, conflict checks, reconciliation policy, terminal and
evaluation immutability, and authoritative write ordering.

The durable state machine MUST be:

```text
Missing -> Running -> SolverTerminal -> Evaluated
```

The direct identity MUST bind the study-supplied cell and instance, frozen
input, and implementation. `Running` MUST add the attempt identifier and
deterministic provider lookup identities, each bound to its resource and the
selected provider's stable, non-secret recovery namespace. `SolverTerminal`
MUST discriminate:

- `Submitted`, which binds the submitted artifact and agent/study outcome;
- `NoSubmission`, which binds a noncompletion or no-valid-submission study
  outcome without inventing an artifact.

Each terminal MUST also bind the evaluator's deterministic lookup identity and
non-secret recovery namespace before evaluator acquisition and MUST retain the
exact solver lookup/locator correlations until solver cleanup is confirmed.
`Evaluated` MUST refer directly to either terminal variant and add only the
evaluation.
Projection/readback and cleanup status are ancillary runtime/observation
diagnostic data and MUST NOT become durable cell truth.

The service MUST require a generic filesystem or database resource for physical
read/write/transaction capability. Its provider MUST NOT define, interpret, or
migrate research cell states. No durable-cell-state resource/provider or
study-supplied persistence implementation is permitted.

#### Scenario: Physical storage changes

- **WHEN** the app profile selects another compatible persistence provider
- **THEN** the service record, migrations, transitions, and write authority
  remain unchanged
- **AND** only physical acquisition and storage mechanics change
- **AND** the study owner supplies no persistence code.

### Requirement: Run is monotonic and idempotent at durable boundaries

`cells.run` MUST read and validate durable state before any new provider effect.
It MUST:

- adopt `Evaluated` without reevaluation, reconcile any recorded postterminal
  cleanup, and perform only explicitly requested ancillary projection/readback;
- adopt `SolverTerminal`, reconcile any recorded postterminal cleanup, and
  perform only missing evaluation/projection work;
- inspect and reconcile `Running`;
- on `Missing`, persist `Running` with deterministic
  cell+attempt+resource+recovery-namespace provider lookup identities before
  observation, sandbox, process, or agent acquisition.

The service MUST persist the `SolverTerminal` variant, and its submitted
artifact when present, together with exact solver correlations before
verification or destructive solver-subject release. It MUST persist
`Evaluated` before destructive evaluator-subject
release or non-authoritative telemetry projection. An unknown terminal or
evaluation write MUST retain the corresponding recoverable subject. A later
failure MUST NOT erase or rerun either durable boundary.

Distinct cells MAY overlap. Same-cell calls MUST converge through the
service-owned repository. The system MUST NOT add a process-wide serializer,
lease, attempt fence protocol, residue/orphan graph, predecessor graph,
receipt graph, or distributed CAS.

#### Scenario: Duplicate call arrives

- **WHEN** two local calls target the same exact cell
- **THEN** at most one call creates the durable `Running` state
- **AND** the other call observes the existing state
- **AND** it either adopts completed work or returns the declared
  `CellRunInProgress` domain refusal
- **AND** that refusal contains the durable cell/attempt identity and only
  permitted correlations
- **AND** that caller may inspect or retry the same cell later, while the
  service does not wait, attach, poll, or retry automatically
- **AND** a later retry rereads the same durable attempt: live returns the same
  refusal, exited-recoverable resumes, and terminal or evaluated state is adopted
- **AND** no second solver is launched.

#### Scenario: Distinct cells run concurrently

- **WHEN** two calls target different exact cells
- **THEN** neither cell's local idempotence rule serializes the other
- **AND** any concurrency limit is ordinary runtime or study scheduling policy,
  not a global correctness lock.

### Requirement: Provider lookup identities close ordinary crash windows

Before any recoverable external subject is acquired, `Running` MUST persist
deterministic lookup identities derived from the exact cell, attempt, resource,
and the selected provider's stable, non-secret recovery namespace. Each
provider that owns such a subject MUST expose that namespace before subject
acquisition plus the resource-specific create-or-adopt and inspection behavior
needed for that subject. Other resources MUST NOT implement a generic
subject-lifecycle protocol.

On re-entry, the service MUST compare the current namespace with the persisted
namespace before any subject effect. A mismatch MUST return a declared domain
refusal and leave the original subject untouched, unless both provider
selections prove one identical cross-selection recovery namespace. The service
MUST NOT persist secrets, raw provider config, or an app-profile/provider
envelope.

Provider inspection MUST distinguish:

- live;
- exited with recoverable workspace or outcome;
- absent.

A live subject MUST NOT be replaced. An exited recoverable solver MUST resume
artifact capture without rerunning the solver. An absent subject MUST be
reconciled before execution resumes. Preterminal unconfirmed termination or
cleanup MUST leave the cell `Running` with its lookup and correlation references
and MUST block replacement. Postterminal cleanup uncertainty MUST preserve
`SolverTerminal` or `Evaluated`; locator/cleanup status remains ancillary
diagnostic data and MUST NOT regress cell state. A later `cells.run` MUST use
the exact retained provider correlation to inspect and retry cleanup before or
alongside remaining evaluation/projection work. Cleanup reconciliation MUST NOT
rerun solver or evaluator work.

No destructive solver-subject release MAY occur until `Submitted` plus its
artifact or `NoSubmission` plus its outcome is known durable. When a
study-declared cancellation, timeout, or noncompletion is confirmed before a
terminal exists, the service MUST recover any valid submission; otherwise it
MUST persist that declared `NoSubmission` outcome before release. Effect
interruption alone MUST NOT invent a study outcome. If interruption prevents
terminal classification, or termination/terminal publication is unconfirmed,
the service MUST retain the stopped subject/workspace as `Running` for re-entry.
Confirmed process termination alone MUST NOT authorize destructive release or
replacement. Process cancellation or termination MAY precede terminal
publication only while the provider retains the exact workspace/outcome for
recovery.

#### Scenario: Crash follows acquisition but precedes locator update

- **WHEN** the process crashes after a provider creates the subject but before
  concrete locator details are written
- **THEN** the next `cells.run` uses the persisted deterministic lookup identity
  to create-or-adopt/inspect that subject
- **AND** it does not launch an uncorrelated replacement.

#### Scenario: Provider recovery namespace changes

- **WHEN** re-entry is bound to a different provider account, region,
  namespace, or other recovery scope than the persisted lookup
- **THEN** `cells.run` returns the declared `RecoveryNamespaceMismatch` refusal
  before a subject effect
- **AND** it does not interpret `absent` in the new scope as permission to
  replace the original subject
- **AND** re-entry under the persisted namespace may recover the original
  subject.

#### Scenario: Crash follows solver exit but precedes artifact capture

- **WHEN** the solver has exited and its provider retains a recoverable
  workspace or outcome
- **THEN** the next `cells.run` recovers that subject
- **AND** captures and persists the submitted artifact
- **AND** never reruns the solver.

#### Scenario: Persistence outcome is unknown

- **WHEN** a service repository write returns an unknown outcome
- **THEN** the current call stops before another provider effect
- **AND** the next call reads durable state before deciding what remains.

#### Scenario: Solver produces no submission

- **WHEN** the solver reaches a declared noncompletion or no-valid-submission
  outcome without an artifact
- **THEN** the service persists `SolverTerminal.NoSubmission`
- **AND** later calls do not rerun that solver
- **AND** evaluation refers directly to that terminal variant.

#### Scenario: Product noncompletion is confirmed before terminal publication

- **WHEN** a study-declared cancellation, timeout, or noncompletion is confirmed
  before a terminal is durable
- **THEN** the service recovers and persists any valid submitted artifact
- **AND** otherwise persists that declared `NoSubmission` outcome
- **AND** only after that durable write may it destructively release the solver
  subject.

#### Scenario: Effect interruption precedes terminal classification

- **WHEN** Effect interruption stops the solver before the service can classify
  a terminal
- **THEN** the stopped subject/workspace remains recoverable under `Running`
- **AND** the next `cells.run` classifies it without rerunning the solver
- **AND** interruption alone does not create a study outcome.

#### Scenario: Cleanup is uncertain after terminal publication

- **WHEN** a terminal or evaluation is durable and later provider cleanup
  cannot be confirmed
- **THEN** the durable state does not regress
- **AND** the exact provider correlation remains available for runtime
  diagnostics
- **AND** no solver replacement is authorized.

#### Scenario: A later run reconciles postterminal cleanup

- **WHEN** a terminal or evaluation is durable and its exact provider
  correlation records unconfirmed cleanup
- **THEN** a later `cells.run` inspects and retries cleanup for that exact
  retained subject
- **AND** it preserves the durable terminal or evaluation
- **AND** it does not rerun solver or evaluator work.

### Requirement: Failures keep their owning authority

The service MUST distinguish:

- domain refusals: identity mismatch, illegal transition, terminal conflict,
  and live replacement;
- recoverable infrastructure failures: provider unavailable, unknown
  persistence outcome, artifact capture failure, observation settlement
  failure, and cleanup uncertainty;
- study outcomes: agent noncompletion, compilation/test failure, policy
  violation, empty/invalid submission, and low score;
- diagnostic failures: telemetry export/readback and wide-event drain failure;
- unexpected defects.

Expected caller-actionable domain refusals MUST be declared native oRPC
errors/results with TypeBox data. Private causes, stacks, prompts,
credentials, and raw provider output MUST NOT cross the boundary. Unknown
defects MUST remain internal. Effect interruption MUST NOT be represented as
product cancellation.

Infrastructure failure MUST preserve durable truth for re-entry. A study
outcome MUST be recorded as terminal/evaluation data rather than converted to
infrastructure retry policy. Diagnostic failure MUST NOT change cell truth.

#### Scenario: Verification fails

- **WHEN** the solver terminal and submitted artifact are durable but
  verification produces a compile or policy failure
- **THEN** the service persists that result as evaluation/study outcome data
- **AND** does not rerun the solver
- **AND** telemetry failure cannot replace that result.

### Requirement: Resources and providers own only live capabilities

The initial service MUST require a persistence substrate. It MUST limit all
other runtime dependencies to genuine provisionable resource families:

- filesystem;
- process/Bun execution;
- native Git;
- OpenShell sandbox;
- Codex agent;
- observation/telemetry.

Resources MUST define stable capability, lifetime, configuration, and
diagnostic-safe contracts. Providers MUST own configuration validation,
acquisition, release, vendor/native mechanics, health, and redacted diagnostics.
Only a provider that owns a recoverable external subject MUST expose that
resource's native create-or-adopt/inspect/reconcile behavior and a stable,
non-secret recovery namespace before subject acquisition. That namespace is
service-owned recovery input, not an app-profile/provider envelope.

The service and CLI plugin MUST declare requirements/use. The HQ runtime
profile MUST select providers and config sources. Runtime compilation MUST
validate coverage and provider dependency closure. Bootgraph/runtime
realization MUST provision and release providers. The process runtime MUST bind
the service.

No study owner, plugin, service, handler, resource, or provider may select or
provision itself. No provider may decide cell transitions, rubric meaning, or
study correctness.

Codex, OpenShell, and observation MUST remain separate resource authorities.
A composite provider MAY be introduced only after proving one inseparable
vendor-native acquisition/release or auth transaction that provider
dependencies and service sequencing cannot represent.

#### Scenario: Service uses a sandboxed agent

- **WHEN** `cells.run` needs an OpenShell workspace and Codex invocation
- **THEN** runtime-provisioned sandbox and agent capabilities remain separately
  identifiable
- **AND** the service sequences them through provider-neutral locators
- **AND** neither provider owns the cell transition.

### Requirement: Submitted artifacts use narrow native Git behavior

The native Git resource/provider MUST support:

- history-free materialization of an exact revision/tree/subtree into a clean
  parent-owned workspace;
- frozen binding of the base revision/tree and study-supplied product path
  mapping;
- full-index binary patch capture from allowed product paths;
- patch SHA-256 as submitted artifact identity;
- fresh pristine apply and reconstructed product-tree equality.

The provider MUST use ordinary native Git semantics. It MUST NOT restore
hostile config/attribute neutralization, exact supported-version identity,
provider envelopes, regenerated-patch byte authority, or adversarial ambient
toolchain tests.

The process/Bun resource MUST remain limited to structured cell and verifier
commands. Package build/pack/install compatibility machinery from the SDK
quarry MUST be deleted. Ordinary workspace build and dependency install checks
remain repository gates rather than product capabilities.

#### Scenario: Solver submits a changed product tree

- **WHEN** the solver finishes with allowed text, binary, add, delete, rename,
  or mode changes
- **THEN** the parent captures one full-index binary patch
- **AND** a fresh pristine tree applies it
- **AND** the reconstructed allowed product tree equals the solver product tree
- **AND** the service persists the patch identity before verification.

### Requirement: Evaluation is fresh and solver-inaccessible

The service MUST own evaluation sequencing and durable evaluation semantics.
Study owners MUST own rubric, hidden-check, and interpretation meaning and MUST
supply those inputs as typed data/references rather than provider callbacks.

After `SolverTerminal` is durable, evaluation MUST create a fresh
solver-inaccessible subject/workspace. For a `Submitted` terminal it MUST start
from the pristine frozen input and apply only the submitted artifact before
running hidden verifier/rubric inputs. For a `NoSubmission` terminal it MUST
evaluate the declared terminal outcome without inventing or recovering solver
state.

Hidden verifier/rubric inputs MUST NOT enter the solver workspace, prompt,
context, or provider subject. Solver process state MUST NOT be reused as
evaluation authority.

Before evaluator acquisition, the terminal MUST contain the deterministic
evaluator lookup and current non-secret provider recovery namespace. A
completed evaluator outcome MUST remain recoverable until `Evaluated` is
durable. If the service crashes after evaluator completion, the next
`cells.run` MUST adopt that outcome without reevaluation. If interruption is
confirmed before any completed recoverable outcome exists, the service MAY
reconcile that stopped/absent subject and rerun the same evaluator attempt from
the exact terminal and frozen evaluator inputs. A live evaluator MUST return
`CellRunInProgress`. If disposition is unknown, or absence could conceal a
completed outcome, the service MUST return a recoverable infrastructure
failure and MUST NOT reevaluate. Namespace mismatch, unknown evaluation write,
or unconfirmed termination MUST fail closed without destructive release.

#### Scenario: Submitted artifact is evaluated

- **WHEN** a submitted terminal is durable
- **THEN** the evaluator receives a fresh pristine subject plus only the
  submitted artifact
- **AND** hidden verifier/rubric inputs are introduced only there
- **AND** the solver cannot read or mutate that evaluation subject
- **AND** the evaluation is persisted before telemetry projection.

#### Scenario: Evaluator exits before evaluation persistence

- **WHEN** the evaluator completes and retains a recoverable outcome before the
  service persists `Evaluated`
- **THEN** the next `cells.run` adopts that exact outcome
- **AND** does not rerun the evaluator
- **AND** persists `Evaluated` before destructive evaluator-subject release.

### Requirement: Observation is correlated but non-authoritative

The service MUST retain one exact observation subject and correlation
identifiers for the cell. It MUST settle observation and project evaluation
only after the corresponding durable boundaries exist.

Remote readback MAY be requested by study/run policy or performed by run-level
reconciliation. It MUST NOT be an unconditional per-cell correctness gate.
Telemetry MUST NOT override local terminal or evaluation truth.

Codex-observation projection MUST use one valid parent context and MUST NOT
create a second application root. It MUST project the supplied decoded agent
events without becoming turn-selection or study policy authority.

Operational events MUST be redacted and diagnostic. They MUST NOT become an
evidence store, transition log, or continuation authority.

#### Scenario: Projection fails after evaluation

- **WHEN** evaluation is durable and telemetry projection fails
- **THEN** the service retains `Evaluated`
- **AND** reports projection status separately
- **AND** a later explicitly requested `cells.run` may retry projection/readback
  without reevaluating.

### Requirement: Study owners remain exterior

Study owners MUST retain cases, prompts, treatments, study-assigned instances,
model/agent allocation, schedules, path mapping authorship, rubrics, verifiers,
hidden checks, results, evidence, aggregation, interpretation, and history.

Study owners MAY supply typed data and references at the service boundary.
They MUST NOT supply executable provider callbacks, persistence
implementations, runtime profiles, raw resource contexts, or service
transition functions.

The service MUST NOT scan a vault, infer a study directory convention,
relocate evidence, or interpret aggregate study meaning.

#### Scenario: A third study adopts the capability

- **WHEN** a third study can express its exact cell and verifier inputs through
  the existing TypeBox boundary
- **THEN** it uses the existing service and HQ composition
- **AND** no provider or core service edit is required for subject-specific
  semantics
- **AND** its evidence remains under its study owner.

### Requirement: The SDK-shaped implementation is deleted, not renamed

The current `packages/research-sdk` tree MUST be treated as source quarry and
historical behavior evidence. Surviving behavior MUST be re-authored under its
semantic owner:

- cell DTOs and state/recovery/evaluation laws in the service;
- process and Git mechanics in resources/providers;
- ordinary repository build/install checks in the existing repository gate.

The change MUST delete the package identity, package runtime, managed runtime,
capability facades, callback ports, schema/portability layer, stage and
predecessor frameworks, attempt/residue protocols, provider envelopes, Bun
runtime/install graphs, embedded manifests, package barrels, exports, project
shell, and package-specific Habitat rules after both study checks are green.

The transition MUST also close the exact external shadow owners and preserve the
closed study/evidence allowlists in the design ledger:

- transition then delete the canonical oRPC real-work evaluator package outside
  `evaluation/{assay/**,contract.ts,contract.test.ts,solver-context/**}`. This
  includes its admission executor and test, platform, runner, execution,
  Langfuse, review, OpenShell, script, package/lock/configuration shell, source
  checkout, and operational tests;
- transition then delete the behavioral-oracle worktree's divergent runner,
  execution, Langfuse, review, admission, platform, OpenShell, script,
  package/lock/configuration, and operational-test copies;
- quarry then delete that worktree's
  `evaluation/codex-langfuse-plugin/**` operational owner while retaining its
  provenance;
- do not remove the behavioral worktree until its study owner independently
  binds every unique prompt, corpus item, contract, rubric, fixture-preparation
  input, result, report, and evidence to a named immutable study-owned Git ref
  or retention ledger. This change MUST NOT copy or relocate that material;
- delete the current Inngest `research/operations/run-s12-current-epoch.ts`
  broken launcher;
- keep older oRPC/Inngest runners and custody-ledger caches historical,
  operationally unreachable, and non-authoritative rather than restoring them.

A cold package survivor requires a second independent non-service consumer and
separate review. No compatibility shim may preserve `@rawr/research-sdk`.

#### Scenario: Consumer transition completes

- **WHEN** the retained oRPC cell and Inngest S09 pass through the service
- **THEN** `@rawr/research-sdk` and superseded active consumer machinery are
  removed
- **AND** the exact active external shadow owners named above are deleted only
  after their unique study/evidence allowlists have an independently durable
  study-owned binding
- **AND** older named historical owners remain operationally unreachable and
  non-authoritative according to their disposition
- **AND** frozen historical evidence remains in place
- **AND** no renamed package facade remains.

### Requirement: Source waits for canonical Habitat and runtime prerequisites

This docs-only design MUST NOT authorize source work.

Source MAY begin only after named canonical Template commits provide:

1. a complete activated Habitat service packet covering current service spine,
   model ownership, router surface/authorship, context funnel, contract/error
   authority, and module isolation;
2. production app/profile provider selection, coverage/dependency validation,
   bootgraph provisioning, process-runtime service binding, and CLI invocation
   context.

Merged architecture specifications and contained simulation labs MAY guide
design but MUST NOT be treated as production implementation. Active unmerged or
unactivated Habitat commits MAY guide the target but MUST NOT authorize source.
The preserved draft PR #531 MUST NOT be restacked or merged as the destination
topology.

#### Scenario: One prerequisite remains simulation-only

- **WHEN** either the service packet is not fully activated or the production
  runtime path is absent
- **THEN** BUILD and source migration remain held
- **AND** only this OpenSpec may be corrected if the target law changes.

### Requirement: Verification is behavioral and independently green by slice

Source implementation MUST proceed through these independently green slices:

1. inspect/store;
2. recovery core;
3. Git/process;
4. sandbox/agent;
5. evaluation/observation;
6. CLI/runtime projection;
7. study consumer transition;
8. SDK/dead-machinery deletion.

Every slice MUST pass its activated Habitat packet, Nx lint, typecheck,
behavior tests, build, and required dependency graph. Tests MUST assert product
behavior rather than source strings or incidental object keys. Habitat and
GritQL MUST own structural source checks.

The deterministic suite MUST include one target-owned exact-tuple
TypeBox/oRPC/effect-oRPC/runtime fixture, local state/recovery/crash proofs,
Submitted/NoSubmission terminals, fresh solver-inaccessible evaluation,
artifact round-trip, resource cleanup, model-free provider fixtures, and the
retained oRPC and S09 model-free cells. No source slice may require a model call,
provider-account mutation, gateway mutation, or evidence relocation.

#### Scenario: A provider implementation is added

- **WHEN** a source slice adds a provider
- **THEN** that same slice closes a reachable service behavior with injected or
  model-free proof
- **AND** no provider-only dead tranche or permanent compatibility shim remains.
