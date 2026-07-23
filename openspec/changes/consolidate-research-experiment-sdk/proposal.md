## Why

The oRPC and Inngest investigations independently built nearly identical
Effect-based evaluation platforms for exact-environment commands, OpenShell
resources, Langfuse experiments, Codex tracing, operational events, artifact
capture, and phase-local continuation. The duplicate implementations now
diverge in configuration, vendor pins, tracing features, and recovery behavior.

The subject vaults are the correct authorities for research content and frozen
evidence, but they are the wrong authorities for a reusable operational plane.
RAWR HQ-Template already defines the service, resource, provider, runtime, and
package kinds needed to own that plane. Consolidating through those existing
kinds removes duplicate ownership without moving research truth or creating a
second framework.

The deployment is primarily one trusted local operator running one locally
provisioned service/runtime, with concurrent distinct cells and ordinary
process crash, interruption, and restart. Optional Railway deployment does not
turn the local host, repository, Git/Bun installation, configuration, package
store, or installed dependencies into adversarial or multi-tenant subjects.
Solver/evaluator isolation still protects benchmark validity; the platform does
not defend against a malicious operator or ambient toolchain.

## What Changes

- Add one full Habitat-law `research-experiment` service under `services/`.
  Apply the existing service blueprint for structure and oRPC relationships:
  TypeBox schemas, oRPC contracts and routers, and effect-oRPC implementation.
  Use current `services/agent-plugin-lifecycle` only as vendor-closure,
  behavior, and resource/provider evidence where it conforms to that blueprint.
- Make that service the semantic owner of cell identity, preparation,
  execution, observation, evaluation, re-entry, and authoritative write
  ordering. Lanes select and schedule cells but do not sequence providers.
- Declare command, Git artifact, sandbox, agent, observation, and
  operational-event capabilities, plus durable cell-state persistence, as
  resources. Concrete Bun, Git, OpenShell, Codex, Langfuse,
  Codex-Langfuse, Codex-OpenShell, EVLog, and cell-state implementations live
  under resource-local providers and are provisioned by the process runtime.
  The service owns experiment-domain write ordering and interpretation while
  consuming the injected persistence port; lanes do not implement persistence.
- Keep ordinary package build/verification as compatibility tooling outside
  the running service, using ordinary Bun pack, frozen install, and consumer
  smoke checks rather than a custom dependency or installed-state authority.
- Attempt solver-terminal adoption before observation acquisition. On a miss,
  begin one local per-cell record, persist the submitted artifact and terminal
  before verification, then persist evaluation before telemetry projection.
- Separate scoreable agent outcomes from infrastructure and evaluator failures.
- Keep a running cell's observation and sandbox/process locator in the same
  record. A retry inspects and settles that locator through the owning provider
  before it may resume; unconfirmed cleanup leaves the cell incomplete rather
  than authorizing another execution.
- Repartition the current `packages/research-sdk` implementation. Experiment
  contracts and laws move into the service; live command and Git behavior moves
  into resources/providers; ordinary Bun package compatibility remains outside
  the running service; package-owned runtime acquisition, `Context.Service`,
  `ManagedRuntime`, manual TypeBox decoding, custom capability facades, and
  obsolete barrels are deleted.
- Retain a shared package only for a runtime-agnostic helper with a proved
  non-service consumer. The current tree has no such whole-file survivor, so
  the `@rawr/research-sdk` package identity is removed after relocation.
- Add only the Habitat topology and dependency-direction rules that protect
  these actual boundaries.
- Express the retained oRPC and Inngest studies through lane-owned bindings and
  configuration against the same Template-owned service contract and resource
  ports.
- Remove or archive superseded live SDK copies only after both lane bindings
  pass deterministic compatibility checks.

## Explicitly Outside The Change

- No model, reviewer, calibration, or other usage-consuming trial.
- No provider/profile, gateway lifecycle/configuration, image, skill, Personal
  RAWR HQ, or release mutation. A deterministic OpenShell check may acquire and
  delete one explicitly named, provider-free sandbox against a caller-supplied
  running gateway; it neither configures nor owns that gateway.
- No migration of prompts, rubrics, packets, fixtures, historical results, or
  evidence into Template.
- No generic scheduler around Langfuse Experiments.
- No controller, workflow engine, service-owned general CAS or database,
  evidence authority, receipt graph, hosted control plane, package manager, or
  custom retry control plane.
- No bespoke procedure, router, context, schema, decoder, Effect runtime, or
  provider framework beside the existing Habitat, oRPC, TypeBox, effect-oRPC,
  resource, provider, and runtime stacks.
- No distributed attempt protocol, receipt graph, package attestation system,
  hostile-local Git/Bun policy, secure mode, or deferred hardening profile.
- No oRPC-as-subject, Inngest-as-subject, or skill-efficacy semantics in the
  shared service.
- No new shared package without a proved runtime-agnostic consumer outside the
  service.

## Impact

- Template gains one ordinary service plus the minimum resource/provider
  implementations needed by both studies. The invalid package-shaped runtime
  is removed rather than preserved behind a new facade.
- The oRPC and Inngest vaults retain all research ownership and consume an
  ordinary locally packed service/resource closure through explicit bindings
  and standard package interfaces.
- Frozen historical/runtime bytes remain path-stable provenance and are never
  reinterpreted as current service authority.
- The research-experiment service/resource closure neither imports nor depends
  on Template lifecycle/controller packages. Simplification or deletion of
  that system remains owned by the primary Template lane.
- The service uses the exact accepted oRPC, TypeBox, Effect, and effect-oRPC
  closure. Resource providers and the process runtime own acquisition and
  release; live Effect/resource values are not re-exported into unrelated
  packages.

## Integration Condition

The primary Template lane is actively replacing the rejected custom
controller/distribution system on a separate Graphite stack. The accepted frame
has been restacked onto checkpoint
`911f319c3d3abdab5255d831e8e16ee16543c3bf`; this change branch MUST restack again
before landing if the accepted upstream stack changes. This change does not
preserve, replace, or depend on the retiring controller. The named `3beb4936`
service is not runtime-provisioning authority. Source migration MUST wait for
an exact accepted upstream commit that contains the full service blueprint
realization and a legal process-runtime owner that selects/provisions resource
providers without host or lane shadow wiring. Template's separately owned
Effect/vendor migration is also a pre-landing restack condition: after that
migration becomes authoritative, this change MUST align its direct pins with the
accepted Template closure and pass frozen install plus behavior tests. This lane
does not upgrade Template root dependencies or invent the missing runtime stack.
Commit `faa320f1da03d83432d09c06c7445b1ae9a21679` is the current submitted
Habitat service source law, not a runtime-provisioning restack target.
The accepted upstream MUST also contain the primary-owned canonical TypeBox
bridge correction and behavioral admission before research service contracts
consume that bridge. For admitted TypeBox `1.3.6`, the bridge emits
message-only Standard Schema issues and always omits `Issue.path`; this lane
does not copy or repair it locally.

## Capabilities

### New Capabilities

- `research-experiment-service`: provides one Template-owned Habitat-law
  research-experiment service and its provisioned resource/provider closure,
  with durable local continuation and ordinary packed lane compatibility,
  without owning study content, evidence, scheduling policy, or release
  authority.

## Related

- Target structure and migration: [[design]].
- Normative requirements: [[specs/research-experiment-service/spec]].
- Shared progress record: [[README]].
