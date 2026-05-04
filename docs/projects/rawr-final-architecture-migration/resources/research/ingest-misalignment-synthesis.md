# Inngest Misalignment Synthesis

Status: current synthesis / informative / not a spec edit.

This document consolidates only the three overlapping Inngest findings from the current research reports. It does not start architecture-spec edits, runtime-async spec edits, or implementation design.

## Source Inputs

| Source | Inngest Point Used Here |
| --- | --- |
| `spec-landscape-audit.md` | Inngest is used at its vendor strength, but the RAWR event/interface boundary is only partially specified. |
| `runtime-architecture-alignment-plan.md` | Inngest harness mode is an architecture/runtime alignment issue because serve-mode and connect-worker mode imply different process topology. |
| `inngest-durable-workflow-findings.source-report.md` | Durable workflow semantics require runtime-owned infrastructure and stable plugin declarations; the current proof evidence is bounded and does not prove production durability. |

## Consolidated Misalignment

The overlap is not that "Inngest is broken." The overlap is that Inngest appears in three different roles across the research set, and those roles need to be kept distinct before spec edits begin.

1. Event/interface contract gap.

   The landscape audit identifies Inngest as a good vendor fit for durable orchestration, retry, replay, history, schedules, and durable queues. The weak point is RAWR's side of the event boundary: auth-on-emit, signing-key rotation, idempotency-key conventions, dead-letter or poison-event handling, event-payload schema evolution, and trace propagation across the emit boundary are not yet fully specified.

2. Harness topology alignment gap.

   The architecture/runtime alignment report treats Inngest mode choice as architecture-visible vocabulary. Serve-mode requires inbound HTTP ingress; connect-worker mode requires an outbound persistent connection and long-running worker posture. The architecture spec should name the integration-mode boundary clearly, while the runtime realization spec should own the mechanical contract inside the selected mode.

3. Durable workflow proof-boundary gap.

   The Inngest source report says plugin workflow declarations should compile into runtime-owned Inngest functions, not plugin-local scripts. It also limits the proof claim: existing RAWR evidence supports boundary direction around `serve()`, `createFunction`, and `step.run`, but it does not prove memoized resume, retry replay, event-wait resumption, run history, production signing, or production topology.

## Working Synthesis

The current spec update work should treat Inngest as one vendor/integration family with three follow-up surfaces:

- event/interface discipline for emitted durable events;
- architecture-visible harness mode vocabulary;
- durable workflow declaration and proof boundaries.

Those surfaces should remain linked, but they should not be collapsed into one immediate spec edit. The architecture alignment pass can name the mode boundary. A later async/vendor spec pass can decide the event-interface and durable-workflow contract details against the broader vendor/spec backlog.

## Non-Claims

- This document does not choose serve-mode or connect-worker mode.
- This document does not define the event schema registry.
- This document does not promote local Hyperresearch proof to production readiness.
- This document does not prioritize Inngest ahead of other vendor/spec updates.
