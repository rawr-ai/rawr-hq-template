# Inngest Vendor Evidence

## Map

| Need | Answer |
| --- | --- |
| What RAWR relies on | Inngest client/function/Bun serve handoff and `step.run(...)` boundary crossing |
| Current lab evidence | Vendor handoff shape plus contained request/function/step passage |
| System impact | Async host boundary, step identity, failure/status observation |
| Proof ceiling | No durable scheduling, retry, replay, idempotency, or run history proof |

## Current Vendor Facts

- Installed package: `inngest` `3.51.0`.
- The boundary probe constructs an `Inngest` client, a `createFunction(...)`
  step callback, and the `inngest/bun` `serve({ client, functions })` handoff
  shape.

## Current Lab Evidence

- Phase Two exercises a contained Inngest-facing boundary through a real
  `inngest/bun` Fetch handler, absolute function-id routing, and `step.run(...)`
  before delegating to the RAWR Oracle async harness.
- Phase Three started-passage proof records that a stopped async harness
  rejection surfaces through Inngest as a protocol-native `StepError` operation
  inside a `206` step response.
- The contained boundary classifies that response as failure in its own
  observation record after inspecting the protocol body. HTTP status alone is
  not enough.
- Phase Three layer-disagreement proof records that a `StepRun` operation can
  carry a RAWR async-step payload whose `status` is `failure`; the lab records
  this as `protocolPayloadRuntimeStatus`, not Inngest protocol status or
  durable Inngest run status.
- Child 7 reuses existing contained Inngest behavior in the integrated
  rehearsal and observes provider resource `requireResource` calls through the
  async invocation context. It adds composition evidence, not new durable
  Inngest vendor semantics.

## Evidence Pointers

| Topic | Manifest entries | Primary phase/source pointers |
| --- | --- | --- |
| Vendor handoff shape | `vendor.boundary.inngest-handoff-shape` | `../../test/vendor/boundary-shapes.test.ts` |
| Phase Two contained async boundary | `audit.p2.async-inngest-function-step-boundary` | `../../phases/phase-two/workstreams/workstream-2026-04-30-phase-two-async-inngest-boundary.md`, `../../test/oracle/harness/inngest-async-boundary.test.ts` |
| Started passage and post-stop failure | `audit.p3.started-process-assembly-stop-finalization-passage` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md` |
| Layer disagreement | `audit.p3.layer-disagreement-failure-observation-proof` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-layer-disagreement-failure-observation-proof.md` |
| Integrated rehearsal | `audit.p3.integrated-live-passage-rehearsal-closeout` | `../../phases/phase-three/workstreams/workstream-2026-05-01-phase-three-integrated-live-passage-rehearsal-and-closeout.md` |

## Not Proven

The lab does not prove durable scheduling, retries, replay, idempotency, run
history, production worker topology, final async membership syntax, dispatcher
public DX, product async policy, or Parent-Repo Migration authorization.

## Future Official-Docs Requirement

Any future Inngest work that models durable semantics, function registration,
serve grammar, step behavior, retry/replay/idempotency, events, run history, or
product observability must run a dedicated official-doc pass before becoming
normative integration guidance.
