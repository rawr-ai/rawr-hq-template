# Phase Two Grounding Frame

Status: grounding frame only. Not a phase-two program plan.
Branch observed during grounding: `codex/runtime-lessons-preservation`.

This document records the current frame for the next runtime-realization proof
program. It is persisted so a future session can recover the intended direction
without replaying chat. It does not authorize implementation, production app
migration, branch submission, or phase-three topology/Nx work.

## Authority Read

Runtime authority:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- Manifest-pinned SHA-256 observed during grounding:
  `483044fa2082b75a89bc2a9da086e35a9fdd9cb91fd582415d8b3744f3e4f94b`

Architecture authority:

- `docs/projects/rawr-final-architecture-migration/resources/spec/RAWR_Canonical_Architecture_Spec.md`

Lab operating and evidence authority:

- `tools/runtime-realization-type-env/README.md`
- `tools/runtime-realization-type-env/AGENTS.md`
- `tools/runtime-realization-type-env/RUNBOOK.md`
- `tools/runtime-realization-type-env/evidence/design-guardrails.md`
- `tools/runtime-realization-type-env/evidence/proof-manifest.json`
- `tools/runtime-realization-type-env/evidence/runtime-spine-verification-diagnostic.md`
- `tools/runtime-realization-type-env/evidence/spine-audit-map.md`
- `tools/runtime-realization-type-env/evidence/focus-log.md`
- `tools/runtime-realization-type-env/evidence/vendor-fidelity.md`
- `tools/runtime-realization-type-env/evidence/runtime-realization-research-program.md`
- `tools/runtime-realization-type-env/evidence/dra-runtime-research-program-workflow.md`
- `tools/runtime-realization-type-env/evidence/phased-agent-verification-workflow.md`
- `tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-runtime-research-program-closeout.md`
- `tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-runtime-telemetry-hyperdx-observation.md`
- `tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-migration-control-plane-observation.md`
- `tools/runtime-realization-type-env/evidence/workstreams/2026-04-30-runtime-prod-contamination-lessons.md`

The runtime realization spec wins for runtime mechanics. The architecture spec
is authoritative for the integrated system vocabulary and ownership model, but
it stays above detailed runtime proof unless a runtime detail must be expressed
as architecture-level law.

## Current Lab State

The mini runtime lab is a contained spec-conformance laboratory under
`tools/runtime-realization-type-env/**`. It is not production SDK/runtime code
and it must not import production `apps/*`, `packages/*`, `resources/*`,
`services/*`, or `plugins/*` code while proving the lab.

The prior bounded runtime research program is closed as contained-lab
coordination and proof. It produced real value, but it did not make the system
production ready.

Current earned proof includes:

- type and negative-fixture proof for accepted public authoring laws such as
  discriminated descriptor refs, Effect-only terminals, refs-only portable
  artifacts, provider-not-execution-plan separation, and important forbidden
  patterns;
- vendor proof for real Effect `3.21.2`, TypeBox, native oRPC shape, and
  Inngest handoff shape, with vendor behavior kept distinct from RAWR runtime
  integration;
- contained mini-runtime proof for descriptor table and registry identity,
  real Effect execution through a runtime-owned path, provider acquire/release
  lowering, config validation and redaction, bootgraph rollback/finalization,
  runtime access and service-binding DAG behavior, adapter callback and async
  bridge delegation, first contained server/async harnesses, deployment
  handoff boundaries, telemetry export, and migration/control-plane observation
  packets;
- contained HyperDX/OTLP observation proof that already-redacted mini-runtime
  records can be projected into stable OTLP trace payloads and accepted by the
  local HyperDX/OTLP ingest path.

The proof categories still matter. `vendor-proof` is not RAWR runtime proof.
`simulation-proof` is not production readiness. Closeout is explicitly
`out-of-scope` coordination, not runtime behavior.

## What Phase Two Is For

Phase two should be a new contained proof program inside the mini runtime lab.
Its goal is production-level contained proof of the runtime-critical spine.

In practical terms, phase two is the program that should move us from:

```text
the lab proves many internal shapes and contained simulations
```

to:

```text
the lab proves that the production-critical runtime spine can cross the real
vendor and observability boundaries we will rely on, while preserving the
runtime realization lifecycle and proof labels honestly
```

The central phase-two target is live, observable vendor integration across:

- Effect: runtime-owned execution, provider acquisition/release,
  interruption/finalization/error classification, and boundary policy through
  real Effect behavior;
- oRPC/Elysia: contained real request path proof where feasible, not only
  constructible contract/router/handler shape;
- Inngest: contained real function/serve/step or handoff path proof where
  feasible, with durable scheduling/retry/idempotency claims either proven
  through the real boundary or kept fenced;
- telemetry/logging/HyperDX: redacted runtime records emitted through the
  actual local OTLP/HyperDX path, with query/dashboard/retention/product
  semantics proven only if explicitly scoped and honestly gated.

Phase two should also burn down the critical production-readiness spine implied
by the runtime spec:

- representative provider/resource/config/secret behavior;
- runtime access and service binding under realistic process execution;
- server route readiness through adapter and harness delegation;
- async route/workflow readiness through dispatcher, async bridge, and
  Inngest-facing boundaries;
- diagnostics, telemetry, logging, catalog, and control-plane observation that
  remain redacted and inspectable;
- focused and composed gates that would fail if a promoted claim regressed.

## What Phase Two Is Not

Phase two is not production app migration.

It should not mutate production `apps/*`, `packages/*`, `resources/*`,
`services/*`, `plugins/*`, repo-wide package exports, root workspace wiring, or
production-facing topology.

Phase two is also not the final architecture re-layout and Nx ratchet. That is
phase three.

Specifically, phase two should not:

- move the lab into the final production file structure;
- enable final Nx module-boundary enforcement for the production architecture;
- create production foundry packages or root Nx generators;
- ratchet the repo around generated services/plugins/resources;
- treat a lab-local generator, if any exists, as production generator authority.

If generator or topology mechanics are useful during phase two, they should be
lab-contained proof aids only, and their proof strength must be limited to the
mechanics actually tested.

## End-Of-Phase-Two Delta

By the end of phase two, we should be able to say things we cannot honestly say
right now:

- The critical runtime spine has crossed the real vendor boundaries inside the
  lab, not just vendor shape probes or fake-harness simulation.
- A representative oRPC/Elysia route path is live in the contained environment,
  delegates through the runtime-owned process execution path, and emits
  observable diagnostics/telemetry without leaking forbidden values.
- A representative Inngest-facing path is live or explicitly fenced at the
  precise boundary where real durable semantics cannot be proven in the lab.
- Effect execution is not merely vendor-compatible; it is exercised through the
  runtime's provider/provisioning/execution/boundary-policy paths with useful
  failure, interruption, rollback, and finalization evidence.
- Provider/resource/config/secret behavior is representative enough to inform
  production migration planning, including validation, redaction, acquire,
  release, rollback, dependency matching, and catalog-safe output.
- HyperDX/logging observability is not just "OTLP accepted once"; the lab has a
  named, repeatable observation lane for redacted runtime records and whatever
  query or provider proof phase two explicitly chooses to own.
- The key server and async readiness claims have named gates, fixtures, and
  residuals. A green claim has a regression gate. A yellow/red claim has an
  authority home, unblock condition, and re-entry trigger.
- The runtime realization lifecycle remains coherent end to end:
  definition -> selection -> derivation -> compilation -> provisioning ->
  mounting -> observation.

That delta matters because production migration planning needs more than
"types compile" and more than "the mini runtime simulation works." It needs to
know that the runtime spine can meet the real vendor and observability seams
that production will depend on, and it needs to know exactly which claims are
still policy, topology, durability, persistence, or product-observability
decisions rather than engineering proof.

## Transition Into Phase Three

Phase three should start only after phase two produces a closeout packet strong
enough to guide final structure work.

The phase-two closeout should make it clear:

- which runtime spine claims are green at the required proof strength;
- which residuals remain and whether they are spec, lab, migration, policy, or
  product decisions;
- which vendor boundaries are live and working in the lab;
- which observability/logging claims are proven against HyperDX/OTLP and which
  are still product/query/retention policy;
- which server, async, provider, config/secret, telemetry, catalog, and
  control-plane claims can be used as migration decision inputs;
- which evidence should be carried into phase three and which lab-only helpers
  must remain behind.

Phase three then remains inside the mini runtime container but changes the
question from "is the runtime spine production-ready enough to plan from?" to
"can this proven spine be arranged in the exact structure the production
codebase expects and locked with Nx?"

Phase three is where final topology, Nx enforcement boundaries, Nx generators,
and ratchet/lock mechanics become first-class proof targets.

## Uncertainty To Preserve

The existing evidence should be treated as valuable but reviewable. Phase two
probably needs an initial evidence audit before program design:

- re-check the manifest-pinned runtime spec hash;
- confirm the current branch/Graphite state after the scrubbed stack reset;
- recertify proof counts and current diagnostic status;
- identify whether any existing workstream evidence overstates vendor,
  HyperDX, route, async, or production-readiness claims;
- decide whether prior local HyperDX evidence, migration/control-plane packet
  evidence, or contamination lessons need revision before they can be used as
  phase-two inputs.

The aborted runtime-prod direction is cautionary context only. Its lessons may
pressure gate shape and anti-theater review, but its production code, generated
syntax, package topology, Effect version pins, and branch claims are not target
authority.
