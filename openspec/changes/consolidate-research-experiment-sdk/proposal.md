## Why

The oRPC and Inngest investigations independently built nearly identical
Effect-based evaluation platforms for exact-environment commands, OpenShell
resources, Langfuse experiments, Codex tracing, operational events, artifact
capture, and phase-local continuation. The duplicate implementations now
diverge in configuration, vendor pins, tracing features, and recovery behavior.

The subject vaults are the correct authorities for research content and frozen
evidence, but they are the wrong authorities for generic executable tooling.
RAWR HQ-Template explicitly owns generic executable packages, adapters,
schemas, tooling, and validators. Consolidating the proven intersection here
removes duplicate ownership without moving research truth.

## What Changes

- Add one buildable `@rawr/research-sdk` package under
  `packages/research-sdk`.
- Define one vendor-neutral runtime configuration contract and one lane-owned
  study-container topology.
- Expose four generic stage interfaces: Prepare, Execute, Observe, and
  Evaluate. Observe is a scoped correlation boundary around execution, not a
  strictly later phase.
- Publish one write-once solver terminal containing the acquired observation
  handle and submitted artifact before verification, then permit exact-input
  adoption of declared durable downstream outputs.
- Separate scoreable agent outcomes from infrastructure and evaluator failures.
- Extract generic Effect runtime, command, identity, and adoption behavior.
- Add named adapters for OpenShell, Codex, Langfuse, Codex-Langfuse tracing,
  Git/Bun artifacts, and EVLog.
- Add only the Habitat topology and dependency-direction rules that protect
  these actual boundaries.
- Express the retained oRPC and Inngest studies through lane-owned bindings and
  configuration against the same Template-owned SDK adapters and interfaces.
- Remove or archive superseded live SDK copies only after both lane bindings
  pass deterministic compatibility checks.

## Explicitly Outside The Change

- No model, reviewer, calibration, or other usage-consuming trial.
- No provider, gateway, image, skill, Personal RAWR HQ, or release mutation.
- No migration of prompts, rubrics, packets, fixtures, historical results, or
  evidence into Template.
- No generic scheduler around Langfuse Experiments.
- No controller, workflow engine, CAS, evidence authority, receipt graph,
  database, hosted service, package manager, or custom retry control plane.
- No oRPC, Inngest, or skill-efficacy semantics in SDK core.
- No initial package split unless a real dependency or bundle boundary proves
  one package insufficient.

## Impact

- Template gains one independent executable SDK package with an isolated
  dependency closure.
- The oRPC and Inngest vaults retain all research ownership and consume an
  immutable locally packed SDK artifact through explicit bindings and a
  versioned package/protocol interface.
- Frozen historical/runtime bytes remain path-stable provenance and are never
  reinterpreted as current SDK authority.
- The SDK neither imports nor depends on Template lifecycle/controller
  packages. Simplification or deletion of that system remains owned by the
  primary Template lane.
- Template's root Effect 3 dependency closure remains unchanged; the SDK
  isolates its own compatible dependency closure.

## Integration Condition

The primary Template lane is actively replacing the rejected custom
controller/distribution system on a separate Graphite stack. This frame may be
committed independently, but the SDK branch MUST restack onto that accepted
Template architecture before BUILD begins and again before landing if the
upstream stack changes. The SDK does not preserve, replace, or depend on the
retiring controller.

## Capabilities

### New Capabilities

- `research-experiment-sdk`: provides one Template-owned library of typed
  research-stage contracts, scoped runtime behavior, named vendor adapters,
  exact durable-output adoption, and locally packed lane compatibility without
  owning study semantics, evidence, scheduling, or release authority.

## Related

- Target structure and migration: [[design]].
- Normative requirements: [[specs/research-experiment-sdk/spec]].
- Shared progress record: [[README]].
