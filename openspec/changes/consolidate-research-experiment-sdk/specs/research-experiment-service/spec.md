## ADDED Requirements

### Requirement: Full Habitat-law research-experiment service
RAWR HQ-Template MUST own the shared research operational plane as
`services/research-experiment`. The implementation MUST apply
`.habitat/blueprints/service` rather than define another service abstraction.
The current `services/agent-plugin-lifecycle` is dependency-closure,
behavior, and resource/provider evidence only where it conforms to the
blueprint; it is not oRPC relationship authority. The submitted Habitat source
law at Template commit `faa320f1da03d83432d09c06c7445b1ae9a21679`
governs structure and relationships. Its root MUST use the standard `base.ts`,
`contract.ts`, `impl.ts`, `router.ts`, and module shell. Root/module files MUST
directly export their required `base`, `contract`, `service`, `module`, and
`router` anchors. The cells module MUST use its single `router.ts` boundary
rather than add a second router container.
Module contracts MUST import `eoc` directly, attach private
`ORPCTaggedError`s, and adapt TypeBox at input/output. As research-service
composition choices inside that Habitat shell, the root contract MUST use
`eoc.router`, the root router MUST use `service.router`, and the cells router
MUST implement `cells.run` with effect-oRPC `.effect(...)`. `base.ts` MUST
directly export `base = implementEffect(contract, Layer.empty)` exactly once,
and that standalone root implementer MUST NOT call `.$context(...)`. `impl.ts`
MUST import `base` and directly export/configure `service` from it; module
`module.ts` MUST derive `module` from the matching `service.cells` branch.
Independently decorated native context middleware remains legal and MUST
project runtime-provisioned dependencies into narrow module/leaf execution
context. TypeScript and behavior tests, not Habitat syntax rules, MUST prove
router assignability/completeness, context narrowing, and request isolation.
Habitat has no service generator, so BUILD MUST apply the blueprint manually
and MUST also apply the agent-router placement and shape rules.

The service MUST own cell identity, preparation, execution, observation,
evaluation, re-entry, and authoritative write ordering. It MUST NOT encode oRPC
or Inngest as research subjects, nor contain skill-efficacy, challenge, corpus,
rubric, model-catalog, scheduling-policy, or release semantics.

The ordinary service package shell MUST expose governed router, contract, and
client surfaces through `src/router.ts`, `src/client.ts`, `src/index.ts`, and
explicit `package.json` exports. The client MUST use the existing Template
service-package boundary. These public surfaces MUST NOT acquire resources,
select providers, construct a runtime, or expose service internals.

The service MUST NOT introduce a custom `ProcedureContract`, capability
registry, router, decoder, schema facade, `Context.Service`, `ManagedRuntime`,
provider selector, or package-shaped execution facade.

#### Scenario: A third study uses the existing service kind
- **WHEN** a third investigation supplies its lane-owned cases, policies,
  durable-data configuration, and service binding
- **THEN** it invokes the existing TypeBox/oRPC service contract without
  changing the service for subject-specific behavior
- **AND** it does not import or sequence concrete providers

### Requirement: Local deployment law bounds correctness
The operational plane MUST target one trusted local operator and one locally
provisioned service/runtime. It MUST permit distinct cells to run concurrently
subject to provider capacity and MUST tolerate ordinary interruption, crash,
and restart. Optional Railway deployment MUST NOT introduce an adversarial
local-host or multi-tenant threat model. Solver/evaluator separation MUST
protect benchmark validity, while the host repository, Git/Bun installation,
configuration, package store, and installed dependencies remain trusted
operating inputs.
Cell-state coordination MUST be keyed by cell and MUST NOT impose a
process-wide duplicate guard that serializes unrelated cells; provider capacity
MAY still bound total concurrency.

#### Scenario: Ambient tools are ordinary inputs
- **WHEN** the service runs a local or Railway-backed study
- **THEN** it uses native Git/Bun and repository semantics
- **AND** it does not install a hostile-local policy or supply-chain attestation
  layer

### Requirement: Deletion-first package repartition
The current `packages/research-sdk` implementation MUST be treated as
transitional source material. Direct experiment-domain identities, terminal
adoption, observation binding, local re-entry, and publication ordering MUST
move into the research-experiment service. Distributed attempt fences, stage
envelopes, predecessor/digest graphs, orphan/residue DAGs, and custom Bun
lock/runtime graphs MUST be deleted. Command, Git, Bun, and vendor mechanics
MUST move into resource contracts and resource-local providers or ordinary
BUILD compatibility tooling.
Package-owned runtime acquisition, custom capability interfaces, manual JSON
decoding, schema-language traversal, clone/freeze machinery, public portability
errors, adapter barrels, and package protocol identity MUST be deleted.

No current whole module is presumed to qualify as runtime-agnostic
cross-service package support. A shared package MAY survive only for a helper
with a proved non-service consumer and an independently valid package
responsibility. After both lane compatibility checks pass, the
`@rawr/research-sdk` package identity MUST be removed unless that proof exists.

#### Scenario: Package code is reclassified by authority
- **WHEN** the accepted package behavior is migrated
- **THEN** experiment semantics live in the service and live mechanics live in
  resources/providers
- **AND** no executable research flow remains in `packages/`

### Requirement: TypeBox owns service and resource data contracts
TypeBox MUST be the schema, inferred-type, and structural-validation authority
for service requests, results, public failures, service-domain DTOs, and
resource configuration. In accordance with the Habitat contract packet,
service contracts MUST import `standard` from `#adapters/typebox`. That alias
MUST resolve to the repository's existing TypeBox-to-Standard-Schema adapter in
`packages/hq-sdk/src/orpc/schema.ts`; the research service MUST NOT copy or
reimplement it. If the authoritative restack still exports only
`schema`/`typeBoxStandardSchema`, BUILD MUST add only the missing canonical
`standard` alias/export and package import mapping before creating service
contracts. Because TypeBox `1.3.6` does not expose Standard Schema directly,
that canonical bridge delegates validation and translates issues. Before the
research service consumes it, the primary Template owner MUST align the bridge
with the official `Schema.Validator` Check/Errors structure. Because every
native TypeBox `1.3.6` error surface exposes only the same raw, lossy
`instancePath`, the bridge MUST emit message-only Standard Schema issues and
MUST omit `Issue.path` for every error. It MUST delete URI decoding and all
custom path parsing/traversal. Exact paths MAY return only after a later
admitted TypeBox exposes escaped pointers or structured segments. Behavioral
admission MUST cover `%`, `%2F`, `/`, `~`, `~0`, `~1`, nested objects, numeric
object keys, and arrays, and MUST prove total validation and message fidelity
with path absent. The bridge MUST preserve `__typebox` only if the existing
OpenAPI projection has a demonstrated consumer.
`packages/research-sdk/src/contracts/schema.ts` MUST delete outright. External
data MUST use the admitted TypeBox `Schema.Validator` Check/Errors path; the
platform MUST NOT retain a second generic decoder, issue model, transform,
clone, freeze, normalization, or schema-composition layer.

Ordinary closed objects MUST use native `Type.Object` with
`additionalProperties: false`. Reusable property maps MUST be merged before the
final object is closed, with compile-time and runtime key-collision rejection.
The service MUST NOT add a private portable-object traversal or durable hashing
schema beside the admitted TypeBox/oRPC data contract.

Provider secrets MUST enter through environment/runtime configuration and MUST
NOT appear in committed files, prompts, service inputs, artifacts, metadata, or
results.

#### Scenario: Service input is validated without a second decoder
- **WHEN** a lane invokes `cells.run`
- **THEN** oRPC validates the TypeBox-backed contract
- **AND** semantic cross-field validation occurs in the service without custom
  JSON decoding or corrective parsing

### Requirement: One semantic cell procedure owns the per-cell flow
The initial service MUST expose one `cells` module with one ordinary oRPC
procedure, `cells.run`. Prepare, Execute, Observe, and Evaluate MUST remain
named internal domain operations used by that procedure, not public generic
capability interfaces and not lane-callable workflow steps.

`cells.run` MUST own the ordering of frozen-input validation, terminal
adoption, unique local begin, observation acquisition, sandbox/agent execution,
host artifact capture, terminal persistence, observation settlement, evaluation
adoption/persistence, and score projection for exactly one cell.
Preparation and evaluation MUST be service-owned internal operations that
consume TypeBox lane data/configuration/policy and provisioned resource ports.
Lanes MUST NOT inject executable preparation/evaluation callbacks.
The service MUST own the experiment-domain transitions and interpretation used
by that flow while consuming an injected durable cell-state resource port. The
resource contract and its resource-local providers MUST own persistence
mechanics for one per-cell `Running -> SolverTerminal -> Evaluated` record. The
lane MUST own cell scheduling, study data and policy, interpretation,
aggregation, reporting, and evidence, but MUST NOT implement the persistence
port.

#### Scenario: Lane requests one cell without shadow orchestration
- **WHEN** a lane schedules an exact cell and invokes `cells.run`
- **THEN** the service performs the complete reusable per-cell flow through
  provisioned resource ports
- **AND** the lane does not call those providers in parallel or sequence the
  same stages itself

### Requirement: Local per-cell continuation preserves completed work
The service MUST read the one per-cell record before any execution effect.
`Evaluated` adopts the terminal and evaluation. `SolverTerminal` adopts the
terminal and resumes only incomplete evaluation or projection. A missing record
MUST transition uniquely to `Running` before observation, sandbox, or process
acquisition so accidental duplicate calls cannot start the same cell twice.

`Running` MUST bind the cell, frozen inputs, implementation revision, attempt
ID, and any acquired observation and sandbox/process locator. A retry MUST ask
the owning provider to inspect and settle the recorded locator. It MUST return
already-running while the subject is live, retain the same incomplete record
while termination or cleanup is unconfirmed, and MAY resume only after the old
subject is absent or settled. A persistence error stops that call; the next call
reads the current record instead of interpreting an acknowledgement protocol.

`SolverTerminal` MUST bind the direct cell/frozen-input/implementation identity,
observation, agent outcome, and submitted artifact. It MUST become durable
before deterministic or blind evaluation and MUST NOT change afterward.
`EvaluationResult` MUST refer directly to that terminal and become durable
before telemetry projection. Re-entry MUST adopt each completed boundary rather
than rerun it.

#### Scenario: Local duplicate or restart targets one cell
- **WHEN** another invocation finds `Running` for the same cell
- **THEN** it inspects the recorded locator and starts no replacement while the
  subject is live or cleanup is unconfirmed
- **AND** after a restart it resumes only the first incomplete boundary

#### Scenario: Distinct cells overlap
- **WHEN** two distinct cell keys are ready and provider capacity is available
- **THEN** their local state transitions may proceed independently
- **AND** same-cell duplicate prevention does not serialize them

#### Scenario: Verification fails after solver completion
- **WHEN** a persisted terminal exists but deterministic or blind evaluation
  infrastructure fails
- **THEN** the next invocation adopts the terminal
- **AND** only evaluation and later boundaries resume

### Requirement: Observation and process cleanup remain correlated
The observation resource MUST acquire one trace and observation subject before
execution. The service MUST keep that handle in the running record and terminal,
settle the same handle, and project the persisted evaluation to that subject.

Cancellation MUST complete before sandbox release. If bounded termination
escalation cannot confirm process exit, the owning resources MUST return
`ProcessTerminationUnconfirmed` with the process and sandbox locator. The
service MUST leave the cell `Running` with that locator and return an incomplete
result. A later call MUST inspect and settle that locator before observation
reacquisition or replacement execution.

Missing or uncorrelated required evidence MAY fail the observation boundary.
Cosmetic topology or global namespace cleanliness MUST NOT determine product
correctness. The service MUST record local projection success or failure.
Remote score readback MAY run when lane policy requests it or during run-level
reconciliation; it MUST NOT be an unconditional per-cell correctness gate and
MUST NOT override the local terminal or evaluation.

#### Scenario: Telemetry projection fails after valid evaluation
- **WHEN** the terminal and evaluation are durable but projection or remote
  readback fails
- **THEN** the local result remains valid and telemetry remains independently
  resumable
- **AND** neither solver execution nor evaluation reruns

#### Scenario: Termination remains unconfirmed
- **WHEN** process exit cannot be confirmed after bounded escalation
- **THEN** the exact process and sandbox locator remains visible in `Running`
- **AND** the same cell cannot execute again until the locator is settled

### Requirement: Resources and providers own live capabilities
Template MUST declare separate resource contracts for command execution, Git
artifacts, sandbox, agent, observation, operational events, and durable cell
state. Concrete Bun, Git, OpenShell, Codex, Langfuse/OTel, Codex-Langfuse,
Codex-OpenShell, EVLog, and persistence behavior MUST live only under
resource-local providers. The durable cell-state resource MUST own the read and
unique local begin/update mechanics for one
`Running -> SolverTerminal -> Evaluated` record, and its providers MUST own
concrete external state. The service MUST own authoritative experiment
transition ordering, identity checks, adoption, and interpretation while
consuming that port. Lanes MUST NOT implement the persistence resource.

The service MUST depend on resource contracts/ports, never concrete providers.
Each provider MUST remain cold until the process runtime selects and provisions
it. Providers MUST own acquisition, implementation, release, and exact vendor
mechanics. They MUST NOT own study policy, rubric, product correctness, cell
scheduling, or durable-result interpretation.

The Git-artifact resource MUST expose exactly materialize, capture, and apply.
Ordinary package pack/install/smoke is BUILD compatibility tooling outside the
running service. Codex-OpenShell and Codex-Langfuse MAY compose only the already
proved auth/profile or W3C carrier/projection crossings; no provider registry
or arbitrary sibling provider imports are permitted.

#### Scenario: Runtime provisions a service without provider leakage
- **WHEN** application composition selects concrete providers
- **THEN** the runtime provisions their resource ports into the service
- **AND** neither the service contract nor lane imports those provider modules

### Requirement: Canonical submitted artifact and ordinary package boundary
The Git provider MUST use native Git behavior: history-free materialization of
the exact commit/tree/subtree into a clean parent-owned workspace; lane-declared
product paths and exclusions; `git add -A` under native Git ignore semantics;
cached diff capture with `--binary --full-index --no-ext-diff --no-textconv`;
patch SHA-256; fresh pristine apply; and reconstructed product-tree equality.

`FrozenInput` MUST persist the base commit/tree, Git version, and path mapping
needed to repeat the operation. Capture/apply MUST reject a mismatched base,
version, or mapping. The provider MUST NOT neutralize or reinterpret Git
attributes, configuration, hooks, filters, package state, or installed state,
and MUST NOT add a provider-envelope, hostile-policy, secure-mode, or
regenerated-patch-byte authority.

Cross-repository lane compatibility MUST use ordinary Bun package behavior:
clean adapter-owned staging that leaves caller source and lockfiles unchanged;
the repository's ordinary package build in staging;
`bun pm pack --ignore-scripts`; atomic tarball publication with SHA-256 and byte
length; clean consumer `bun install --frozen-lockfile --ignore-scripts`; lane
import/type/model-free smoke checks; and cleanup without partial publication on
interruption.

Standard Bun workspace/package/lock behavior MUST be authority. BUILD MUST NOT
port the `ce282cb0` embedded runtime manifest, custom Bun-v1 lock/placement or
installed content/mode graphs, ambiguous-form classifiers, collision machinery,
concurrency stress system, or special closure-admission protocol.
`installed-package.ts`, `package-materialization.ts`, and related graph/manifest
code are historical source-quarry evidence only. This change MUST NOT add an
artifact aggregator, bundle format, registry, release plane, custom package
manager, compatibility abstraction, direct Template source import, or second
composition mechanism.

#### Scenario: Patch reconstructs the submitted product tree
- **WHEN** native Git stages lane-allowed added, deleted, renamed, mode-changed,
  binary, and text product files
- **THEN** a fresh verifier reconstructs exactly the submitted bytes
- **AND** the captured patch SHA-256 identifies the submitted artifact

#### Scenario: Packed service is consumed normally
- **WHEN** BUILD packs the staged service/resource packages
- **THEN** the tarball is published atomically with SHA-256 and byte length
- **AND** a clean frozen consumer install passes its import, type, and model-free
  smoke checks without changing caller source or lockfiles

### Requirement: Direct vendor baseline remains reproducible
The BUILD service MUST start from the direct versions proved by Template commit
`3beb49360968ba7f1ebec1bfe89f572972026306`: oRPC `1.14.8`, TypeBox `1.3.6`,
Effect `4.0.0-beta.100`, `effect-orpc@1.0.0-effect-v4.8`, Bun `1.3.14`, Git
`>=2.48.0`, OpenShell `0.0.89`, Codex CLI `0.144.6`, Langfuse `5.9.1`,
OpenTelemetry `1.9.1`/`2.9.0`/`0.220.0`, and EVLog `2.22.3`. The checked-in
lockfile, frozen install, and behavior tests MUST be dependency authority.
After the mandatory restack, BUILD MUST align direct pins with the accepted
Template closure and rerun those checks; it MUST NOT create another transitive
admission or attestation system.

Codex effective-envelope admission MUST combine process truth with
version-bound rollout evidence. Langfuse MUST use one full W3C parent carrier,
reject legacy trace-seed mode, preserve one application root, project the
supplied decoded turn set without selecting it, target the recorded score
subject, and support policy-requested or run-level readback. EVLog MUST remain
diagnostic and use its public process-global API. OpenShell MUST consume but not
start or own the selected gateway.

#### Scenario: Direct dependency input drifts
- **WHEN** a direct tool version or checked-in lock differs from the frozen BUILD
  input
- **THEN** frozen install or the owning behavior check fails
- **AND** the service does not invent a second dependency authority

### Requirement: Lane ownership and deterministic verification
Each investigation MUST retain its cases, inputs, prompts, treatments, profile
allocation, rubrics, checks, results, evidence, history, path mapping, runtime
provider requirements, persistence configuration, scheduling, interpretation,
aggregation, and reporting. Template runtime owns provider selection and
provisioning; Template MUST own the generic service and resource/provider
implementations. Lanes MUST supply data/configuration/policy/results rather
than executable stage callbacks or persistence implementations. The service
MUST NOT scan or relocate a vault.

Template Habitat MUST apply the complete service blueprint and enforce
service-to-resource and resource-to-provider direction. Behavioral tests MUST
cover TypeBox contracts, local duplicate/restart/resume, terminal adoption,
observation identity, durable evaluation, recorded-locator cleanup, resource
release, Git base/version/mapping mismatch, artifact round-trip, Codex envelope
admission, Langfuse score subjects and local projection truth, EVLog lifecycle,
and clean package installation/smoke. Tests MUST not assert source strings or
helper counts.

All BUILD checks MUST be model-free. They MUST use injected ports, fixture
processes, local fixture servers, captured sessions, and in-memory telemetry.
No model, provider/profile, gateway configuration, image, or remote Langfuse
mutation is permitted.

#### Scenario: Both lanes pass the same service boundary
- **WHEN** one retained oRPC cell and Inngest S09 run through the packed
  research-experiment service with injected model-free agent evidence
- **THEN** both complete their deterministic preparation/evaluation paths
- **AND** each lane retains its own fixtures, policies, and evidence

### Requirement: Current-upstream integration and no second control plane
The branch MUST restack onto the accepted Template commit containing the
current service/vendor closure and legal process-runtime provider provisioning
before implementation, and again immediately before landing if upstream
changes. Commit `3beb49360968ba7f1ebec1bfe89f572972026306` is closure/behavior
evidence, not runtime-provisioning authority. Final checks MUST prove no
dependency on the retiring lifecycle/controller system and no direct host/lane
provider binding.

The change MUST NOT add a generic scheduler, controller, workflow engine,
receipt graph, service-owned general CAS or database, daemon, hosted control
plane, package manager, release plane, evidence authority, or provider registry.

#### Scenario: Consolidation remains an ordinary Template service
- **WHEN** a study invokes `cells.run`
- **THEN** the existing oRPC/effect-oRPC service performs one cell through
  provisioned resource ports
- **AND** no parallel framework or control plane participates
