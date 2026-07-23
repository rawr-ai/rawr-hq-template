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

### Requirement: Deletion-first package repartition
The current `packages/research-sdk` implementation MUST be treated as
transitional source material. Experiment-domain identities, stage envelopes,
adoption, observation binding, re-entry, residue, and publication laws MUST
move into the research-experiment service. Command, Git, Bun, and vendor
mechanics MUST move into resource contracts and resource-local providers.
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
The service MAY retain one private total guard only for the exact finite plain
JSON-data identity required by durable hashing, because TypeBox `1.3.6` alone
does not reject cycles, non-plain prototypes, accessors, symbols, or
non-enumerable properties. That guard MUST NOT become a public portability
framework or inspect TypeBox schema internals.

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
adoption, attempt admission, observation acquisition, sandbox/agent execution,
host artifact capture, terminal publication, observation settlement,
evaluation adoption/publication, and score projection for exactly one cell.
Preparation and evaluation MUST be service-owned internal operations that
consume TypeBox lane data/configuration/policy and provisioned resource ports.
Lanes MUST NOT inject executable preparation/evaluation callbacks.
The service MUST own the experiment-domain write ordering and interpretation
used by that flow while consuming an injected durable cell-state resource port.
The resource contract and its resource-local providers MUST own persistence
mechanics. The lane MUST own cell scheduling, study data and policy,
interpretation, aggregation, reporting, and evidence, but MUST NOT implement
the persistence port.

#### Scenario: Lane requests one cell without shadow orchestration
- **WHEN** a lane schedules an exact cell and invokes `cells.run`
- **THEN** the service performs the complete reusable per-cell flow through
  provisioned resource ports
- **AND** the lane does not call those providers in parallel or sequence the
  same stages itself

### Requirement: Exact attempt and terminal continuation
The service MUST attempt exact `SolverTerminal` adoption before any execution
effect. On a miss it MUST construct an `ExecutionAttemptFence` binding the
exact expected terminal key, lane-supplied attempt ID, and attempt digest. Under
service-owned ordering and admission semantics, the injected durable cell-state
resource MUST atomically persist that fence only when the same terminal key has
no published terminal, active attempt, or unresolved residue.

Only exact `Admitted` authority MAY permit observation, sandbox, or process
acquisition. `Occupied`, `Conflict`, and `Unknown` MUST fail closed, including
an identical occupied fence. If admission surfaces a terminal published after
the initial read, the service MUST validate and adopt it instead of executing.
The terminal MUST carry the exact admitted attempt identity.

`SolverTerminal` MUST be write-once and create-if-absent. Its identity MUST bind
the exact cell and instance, frozen input, implementation revision,
predecessors, observation handle, agent outcome, and submitted artifact.
Identical existing values MAY be adopted; conflicting values MUST reject
without overwrite. Commit-before-ack uncertainty MUST use exact
read-after-unknown reconciliation.

The exact `EvaluationResult` MUST be durably published before observation score
projection and MUST bind the exact terminal. Re-entry MUST adopt it rather than
repeat blind or nondeterministic evaluation.

#### Scenario: Concurrent invocations target one terminal
- **WHEN** two invocations seek execution authority for the same terminal
- **THEN** at most one receives `Admitted`
- **AND** every occupied, conflicting, or uncertain invocation performs no
  observation, sandbox, or process effect

#### Scenario: Verification fails after solver completion
- **WHEN** a persisted terminal exists but deterministic or blind evaluation
  infrastructure fails
- **THEN** the next invocation adopts the exact terminal
- **AND** only the incomplete downstream boundary resumes

### Requirement: Observation and process residue remain exact
The observation resource MUST acquire one exact subject after attempt admission
and before execution. The service MUST persist that handle in the terminal,
settle the same handle, and project the persisted evaluation to the same trace
and observation subject.

An acquired handle without a published terminal is a non-authoritative orphan.
The service MUST durably record and settle it when observable, but MUST NOT
adopt it as the trial subject. Replacement under the same instance is legal
only after the owning agent/sandbox resource provider produces exact process
quiescence/termination evidence, the service validates it, and the attempt plus
any residue is reconciled.

If bounded termination escalation cannot confirm process exit, the agent and
sandbox resources MUST return `ProcessTerminationUnconfirmed` with the exact
process and sandbox locator. The service MUST persist
`UnresolvedExecutionResidue` before returning. Same-instance observation
reacquisition and execution MUST remain blocked until the owning provider
produces exact containment evidence and the service validates that fact before
reconciling the durable residue. A lane MAY retain or reference the resulting
fact but MUST NOT mint the operational authority for re-entry. Time, expiry,
stealing, heartbeats, or leases MUST NOT authorize re-entry.

Missing or uncorrelated required evidence MAY fail the observation boundary.
Cosmetic topology or global namespace cleanliness MUST NOT determine product
correctness. Langfuse trial scores MUST target the experiment-item root trace
and observation; flush or trace-summary I/O MUST NOT substitute for bounded
readback of that exact subject.

#### Scenario: Telemetry projection fails after valid evaluation
- **WHEN** the terminal and evaluation are durable but score projection or
  readback fails
- **THEN** observation remains independently resumable
- **AND** neither solver execution nor evaluation reruns

#### Scenario: Termination remains unconfirmed
- **WHEN** process exit cannot be confirmed after bounded escalation
- **THEN** exact residue and sandbox location remain durable and visible
- **AND** the same cell instance cannot execute again until reconciled

### Requirement: Resources and providers own live capabilities
Template MUST declare separate resource contracts for command execution, Git
artifacts, sandbox, agent, observation, operational events, and durable cell
state. Concrete Bun, Git, OpenShell, Codex, Langfuse/OTel, Codex-Langfuse,
Codex-OpenShell, EVLog, and persistence behavior MUST live only under
resource-local providers. The durable cell-state resource MUST own the atomic
read/create-if-absent/read-after-unknown/reconcile persistence port and its
providers MUST own concrete external state. The service MUST own authoritative
experiment write ordering, identity checks, adoption, and interpretation while
consuming that port. Lanes MUST NOT implement the persistence resource.

The service MUST depend on resource contracts/ports, never concrete providers.
Each provider MUST remain cold until the process runtime selects and provisions
it. Providers MUST own acquisition, implementation, release, and exact vendor
mechanics. They MUST NOT own study policy, rubric, product correctness, cell
scheduling, or durable-result interpretation.

The Git-artifact resource MUST expose exactly materialize, capture, and apply.
Immutable package pack/verify is BUILD compatibility tooling outside the
running service. Git and Bun MUST retain independent admission and artifact
epochs. Codex-OpenShell and Codex-Langfuse MAY compose only the already proved
auth/profile or W3C carrier/projection crossings; no provider registry or
arbitrary sibling provider imports are permitted.

#### Scenario: Runtime provisions a service without provider leakage
- **WHEN** application composition selects concrete providers
- **THEN** the runtime provisions their resource ports into the service
- **AND** neither the service contract nor lane imports those provider modules

### Requirement: Canonical submitted artifact and immutable package boundary
The Git provider MUST preserve the accepted canonical artifact behavior:
history-free materialization; exact resolved Git substrate; parent-owned
full-index binary patch capture; hostile Git config/attribute neutralization;
fresh apply-check/apply/regeneration; product-tree equality; and exact SHA-256.
The provider MUST return the exact materialization substrate to service-owned
preparation. The service MUST bind and persist it in `FrozenInput` and supply
that exact bound substrate to capture/apply; capture MUST reject a different
substrate before reading product trees. A lane MAY supply revision and path
mapping data and retain a digest/reference in its result, but MUST NOT carry the
provider envelope as execution authority.

The Bun provider MUST preserve the accepted immutable package behavior:
adapter-owned staged build, `bun pm pack --ignore-scripts`, exact tarball and
embedded manifest, admitted Bun-v1 rooted runtime graph, actual installed
content/mode identity, immutable publication, isolated verification, and
fail-closed rejection of unsupported or ambiguous lock forms.

Cross-repository lane compatibility MUST use the accepted immutable local
package behavior for the Template service/resource closure. The current
operation hard-codes `@rawr/research-sdk`, an SDK-specific embedded-manifest
path, and a closure that rejects workspace edges. BUILD MUST replace those
invalid identity assumptions and admit one explicit immutable local
service/resource closure as a separately reviewed closure-admission slice, not
a rename-only edit. It MUST preserve staged build, lifecycle-script
suppression, content/mode verification, and fail-closed lock validation while
rejecting unsupported or ambiguous local-edge forms rather than implementing
general workspace resolution. This change MUST NOT add an artifact aggregator,
bundle format, registry, release plane, custom package manager, direct Template
source import, or second composition mechanism.

#### Scenario: Patch contains every product change
- **WHEN** a solver adds, deletes, renames, changes mode, or modifies binary and
  text files
- **THEN** a fresh verifier reconstructs exactly those submitted bytes
- **AND** regenerated patch bytes and SHA-256 match

#### Scenario: Installed package closure drifts
- **WHEN** an installed dependency's content or mode, lock identity, tarball,
  embedded manifest, or publication boundary differs
- **THEN** compatibility fails before provider provisioning or service
  invocation
- **AND** no outside path is overwritten

### Requirement: Exact current vendor closure
The BUILD service MUST use the exact closure proved by Template commit
`3beb49360968ba7f1ebec1bfe89f572972026306`: oRPC `1.14.8`, TypeBox `1.3.6`,
Effect `4.0.0-beta.100`, and `effect-orpc@1.0.0-effect-v4.8`. Provider
implementations MUST use the exact admitted Bun `1.3.14`, Git `>=2.48.0`,
OpenShell `0.0.89`, Codex CLI `0.144.6`, Langfuse `5.9.1`, OpenTelemetry
`1.9.1`/`2.9.0`/`0.220.0`, and EVLog `2.22.3` identities. Every pin and
transitive closure MUST be re-admitted after the mandatory pre-landing restack;
no dependency may silently float.

Codex effective-envelope admission MUST combine process truth with
version-bound rollout evidence. Langfuse MUST use one full W3C parent carrier,
reject legacy trace-seed mode, preserve one application root, project the
supplied decoded turn set without selecting it, and read back exact score
subjects. EVLog MUST remain diagnostic and use its public process-global API.
OpenShell MUST consume but not start or own the selected gateway.

#### Scenario: Historical vendor identity is presented as current
- **WHEN** a lane supplies a historical OpenShell, Codex, plugin, dependency
  lock, or other mismatched identity
- **THEN** preparation fails before resource acquisition
- **AND** historical evidence is not reinterpreted as qualification

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
cover TypeBox contracts, terminal adoption, concurrent attempt admission,
unknown writes, observation identity, durable evaluation, unresolved residue,
provider-produced containment evidence with service validation, resource
release, service-bound Git substrate before tree access, artifact round-trip,
Codex envelope admission, Langfuse score subjects, EVLog lifecycle, and package
installation. Tests MUST not assert source strings or helper counts.

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
receipt graph, service-owned general CAS, database, daemon, hosted service, package
manager, release plane, evidence authority, or provider registry.

#### Scenario: Consolidation remains an ordinary Template service
- **WHEN** a study invokes `cells.run`
- **THEN** the existing oRPC/effect-oRPC service performs one cell through
  provisioned resource ports
- **AND** no parallel framework or control plane participates
