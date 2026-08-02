## Why

The oRPC and Inngest studies independently built enough execution,
observation, recovery, and evaluation machinery to prove a common product
need: a trusted operator needs to launch, recover, inspect, evaluate, and
preserve research experiment cells without each study becoming its own runtime
or provider integrator.

The preserved implementation at
`223835fccedcb80523b761c571130852bdb106a2` proved useful cell and artifact
behavior, but it placed the operational plane in `@rawr/research-sdk`. That is
the wrong architectural kind. A package cannot own live resources, provider
selection, durable domain state, or application composition. The subsequent
service recut corrected part of that error but still let study consumers shadow
app/profile authority and treated cell persistence as a resource concern.

RAWR already has the right kinds. A service owns domain truth. Resources declare
provisionable capabilities. Providers implement them. An app selects a CLI
projection and runtime profile. Runtime realization validates provider coverage,
provisions the process, binds the service, and supplies the exact invocation
context. This change expresses research experiments through those existing
kinds rather than creating another platform inside a package.

## What Changes

- Add one `research-experiment` service with one `cells` module. It owns cell
  identity, frozen inputs, state schema and migrations, repository semantics,
  transition policy, recovery, submitted artifacts, evaluation, and
  authoritative write ordering.
- Start with two service operations only:
  - `cells.run` launches or resumes one exact cell through every reachable
    incomplete boundary until it is evaluated or reaches the first typed
    refusal or recoverable infrastructure failure.
  - `cells.inspect` reads durable cell truth and correlation identifiers without
    changing the cell.
- Keep preparation, execution, observation, artifact capture, verification, and
  evaluation as internal handler sequencing, policies, repositories, and ports,
  not public stage APIs.
- Add one CLI command plugin that projects `run` and `inspect` into the existing
  HQ app. The plugin declares service use and owns CLI input/output policy; it
  does not own experiment truth or provider wiring.
- Extend the HQ app composition to select that plugin. An HQ runtime profile
  selects providers and config sources. Runtime compilation validates coverage
  and dependencies; bootgraph and the Effect kernel provision providers; the
  process runtime binds and projects the service; and the CLI adapter mounts the
  handler with the narrowed invocation context.
- Declare only genuine provisionable resources: persistence substrate,
  filesystem, process/Bun execution, native Git, OpenShell sandbox, Codex
  agent, and observation/telemetry. Providers own concrete acquisition,
  release, vendor mechanics, and redacted diagnostics. Only providers that own
  recoverable external subjects expose resource-specific
  create-or-adopt/inspect behavior.
- Keep the cell repository, migrations, and legal transitions in the service.
  A database or filesystem resource provides physical capability only; it does
  not know `Running`, `SolverTerminal`, or `Evaluated`.
- Preserve monotonic local state:
  `Missing -> Running -> SolverTerminal -> Evaluated`. Before subject
  acquisition, persist deterministic lookup identities bound to the cell,
  attempt, resource, and the selected provider's non-secret recovery namespace.
  On re-entry, refuse a recovery-namespace mismatch before effects; otherwise
  the owning provider classifies its subject as live, exited-recoverable, or
  absent so completed recoverable work is never rerun.
- Persist the solver terminal, and the submitted artifact when present, before
  verification or destructive solver-subject release. Persist an evaluator
  lookup before evaluator acquisition, adopt completed evaluator output across
  crashes, and persist evaluation before destructive evaluator release or
  non-authoritative telemetry projection.
- Reconstruct evaluation from the persisted terminal in a fresh
  solver-inaccessible subject/workspace. Hidden verifier and rubric inputs never
  enter the solver context.
- Keep TypeBox as schema/type/validation authority, native oRPC as
  contract/router/context/error authority, Effect as execution and resource
  safety authority, and effect-oRPC only as their adaptation boundary. Use the
  canonical Template schema bridge; add no research-local decoder or bridge.
- Re-derive the surviving behavior from `packages/research-sdk` into the
  service and resources, then delete that package and its identity after both
  study compatibility cells pass. No current production file survives
  whole-file as a justified cold shared package.
- Keep oRPC and Inngest studies outside Template. Study owners retain cases,
  prompts, treatments, agent/model allocation, schedules, rubrics, hidden
  checks, aggregates, evidence, interpretation, and history.

## Explicitly Outside The Change

- No model, reviewer, calibration, or other usage-consuming trial.
- No provider account, auth home, gateway, image, skill, Personal RAWR HQ, or
  study evidence mutation.
- No research-specific app, scheduler, gateway, server surface, provider
  registry, evidence store, hosted control plane, package manager, workflow
  engine, receipt graph, or distributed coordination protocol.
- No study-owned provider selection, persistence implementation, runtime
  composition, or shadow provider calls.
- No package-owned runtime, managed runtime, live service facade, callback
  capability registry, manual schema decoding, portability layer, or
  research-local TypeBox bridge.
- No public Prepare/Execute/Observe/Evaluate stage API.
- No automatic Inngest/async projection merely because one consumer studies
  Inngest. A durable async surface must earn its own product requirement.
- No composite Codex-OpenShell or Codex-observation provider unless a single
  inseparable native lifecycle/auth transaction is independently proved.
- No migration or relocation of study cases, prompts, rubrics, results, or
  frozen evidence.
- No source implementation before the complete activated Habitat service
  packet and production app-profile/runtime provisioning are both canonical.

## Impact

- Template gains one ordinary service, one CLI projection, app/profile
  selection facts, and the minimum generic resource/provider implementations
  required by the service.
- Study owners call the service through the HQ projection or generated service
  boundary and retain all research meaning. They do not install a custom
  research runtime or wire providers.
- `packages/research-sdk` becomes source-quarry evidence and is deleted after
  behaviorally equivalent service/resource slices and both model-free study
  checks are green.
- The canonical oRPC self-contained evaluator transitions to the service and is
  deleted; the current Inngest authority has no runnable consumer to migrate,
  only one broken launcher to delete. Older runners remain historical and
  operationally unreachable/non-authoritative; study content and evidence stay
  with their owners.
- Optional Railway deployment changes process placement only. It does not
  introduce a second semantic app or an adversarial local-host threat model.

## Implementation Gate

The docs checkpoint may be reviewed and preserved before source. Source remains
held until both prerequisites are present in named canonical Template commits:

1. the complete Habitat service packet is activated in the repository source
   law and proves the current service spine, model ownership, router
   authorship, context funnel, contract, error, and module-isolation rules;
2. production app/profile provider selection, provider coverage/dependency
   validation, bootgraph provisioning, process-runtime service binding, and
   CLI invocation context are implemented and green.

Canonical Template already contains the corrected TypeBox bridge and the
admitted oRPC/TypeBox/Effect/effect-oRPC dependency closure. Active Habitat
branches and merged runtime-realization simulations are design evidence only;
they do not satisfy either production prerequisite. The preserved draft PR
#531 is history and source quarry, not a landing vehicle.

## Capabilities

### New Capabilities

- `research-experiment-service`: provides the HQ-composed service capability
  for running and inspecting monotonic research cells through
  runtime-provisioned generic resources, without owning study content,
  schedules, evidence, provider selection, or application runtime.

## Related

- System design and transition: [[design]].
- Normative requirements: [[specs/research-experiment-service/spec]].
- Coordination record: [[README]].
