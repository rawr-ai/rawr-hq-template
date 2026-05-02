# Phase Three Started Passage Vendor Integration Reference

Status: reference only / non-authoritative / not proof.
Owner: Phase Three DRA.
Workstream:
`workstream-2026-05-01-phase-three-started-process-assembly-stop-finalization-passage.md`.

This artifact preserves useful vendor and local-integration findings for the
started-process passage and later Phase Three children. It does not override the
manifest-pinned runtime spec, does not promote any proof category, and does not
claim Lab-Production Proof.

## Authority Ceiling

This document may support:

- `vendor-proof` reasoning about documented or installed vendor shape;
- `simulation-proof` design when a RAWR-owned oracle adapter consumes the
  shape under a gate;
- later vendor-integration planning when paired with fresh official-docs review.

This document cannot prove:

- Lab-Production Proof;
- production HTTP or worker lifecycle;
- durable Inngest scheduling, retry, replay, idempotency, or run history;
- HyperDX dashboard, query, retention, alerting, or product visibility;
- native host telemetry/error mapping;
- RuntimeCatalog persistence;
- public API/DX law;
- Parent-Repo Migration authorization.

## Official Vendor Sources

Sources checked by the official-docs lane:

- oRPC docs hub and navigation: <https://orpc.dev/docs>
- oRPC RPC handler: <https://orpc.dev/docs/rpc-handler>
- oRPC HTTP adapter: <https://orpc.dev/docs/adapters/http>
- oRPC OpenTelemetry integration: <https://orpc.dev/docs/integrations/opentelemetry>
- Inngest docs home: <https://www.inngest.com/docs>
- Inngest serving functions: <https://www.inngest.com/docs/learn/serving-inngest-functions>
- Inngest v3 `createFunction`: <https://www.inngest.com/docs/reference/typescript/v3/functions/create>
- Inngest v3 `step.run`: <https://www.inngest.com/docs/reference/typescript/v3/functions/step-run>
- Effect API docs index: <https://effect-ts.github.io/effect/>
- Effect runtime API: <https://effect-ts.github.io/effect/effect/Runtime.ts.html>
- Effect scope API: <https://effect-ts.github.io/effect/effect/Scope.ts.html>
- OpenTelemetry JavaScript docs: <https://opentelemetry.io/docs/languages/js/>
- OpenTelemetry JavaScript exporters: <https://opentelemetry.io/docs/languages/js/exporters/>
- HyperDX docs: <https://www.hyperdx.io/docs>
- HyperDX OpenTelemetry install: <https://www.hyperdx.io/docs/install/opentelemetry>

Version caveat:

- The lab uses `inngest@3.51.0`; later Inngest docs now foreground v4. Child
  proofs that use installed v3 package behavior must not silently mix v4
  signatures into v3 gates.

## Local Integration Sources

Sources mined as evidence, not runtime authority:

- `docs/projects/orpc-ingest-domain-packages/resources/spec/TELEMETRY_DESIGN.md`
- `docs/projects/orpc-ingest-domain-packages/resources/spec/DECISIONS.md`
- `docs/projects/orpc-ingest-domain-packages/resources/spec/guidance.md`
- `docs/system/quarantine/TELEMETRY.md`
- `docs/system/quarantine/telemetry/orpc.md`
- `docs/system/quarantine/telemetry/hyperdx.md`
- `docs/system/quarantine/telemetry/hq-runtime.md`
- `docs/projects/rawr-final-architecture-migration/resources/research/service-package-effect-orpc-integration-snapshot.md`
- `tools/runtime-realization-type-env/src/oracle/telemetry-export.ts`
- `tools/runtime-realization-type-env/src/oracle/catalog.ts`
- `tools/runtime-realization-type-env/evidence/vendors/README.md`

Important drift:

- Some older telemetry docs mention `packages/core/src/orpc/telemetry.ts`.
  Current source evidence points to `packages/core/src/telemetry.ts`. Do not
  copy the stale path into new canonical language without re-verifying the
  parent-app topology.

## Vendor Findings

oRPC:

- Official docs support a Fetch/HTTP handler shape through `RPCHandler` and a
  request handler boundary.
- In the lab, this can support the contained oRPC Fetch boundary only after the
  RAWR oracle harness delegates to `ProcessExecutionRuntime`.
- It does not prove Elysia mount, OpenAPI publication, auth/logging policy,
  production HTTP serving, or product API topology.

Inngest:

- Official docs and installed behavior support `Inngest`, `createFunction`,
  Bun `serve({ client, functions })`, and `step.run(...)`.
- In the lab, this supports a contained serve/function/step passage into the
  async harness.
- A stopped async harness rejection is represented by Inngest as a `StepError`
  operation inside a `206` step response, not necessarily as an HTTP failure.
  The correct child oracle is the `StepError` plus stopped harness record plus
  unchanged runtime-invocation count.
- This does not prove durable scheduling, replay, retry policy, idempotency, run
  history, hosted worker lifecycle, or product async policy.

Effect:

- Official docs and installed vendor probes support runtime execution,
  `ManagedRuntime`, `Scope`, finalizers, `Exit`, and disposal mechanics.
- Runtime authority still belongs to the manifest-pinned RAWR runtime spec.
  Vendor Effect mechanics become runtime passage only where RAWR-owned
  process/runtime/provider code consumes them under gates.

OpenTelemetry / HyperDX:

- OTel JavaScript docs support JS tracing/exporter setup and OTLP exporter
  concepts.
- HyperDX docs support OTLP destination configuration.
- The Runtime Realization Lab currently proves deterministic OTLP-shaped trace payload
  construction and injected-fetch export shape only. It does not prove product
  HyperDX visibility, query semantics, dashboards, retention, alerting, or
  production OpenTelemetry bootstrap.

## Golden Integration Pattern

The service-package Effect/oRPC snapshot is useful because it separates native
surface feel from runtime ownership:

- let the author-facing surface use native, familiar vendor grammar;
- keep RAWR ownership at lifecycle, runtime construction, import law,
  diagnostics, telemetry correlation, policy, context projection, and
  finalization seams;
- avoid a custom RAWR private RAWR language where a vendor already has a strong native
  idiom;
- distinguish service/package author DX from runtime operational reality;
- re-validate every borrowed pattern against current runtime authority and
  vendor docs before claiming it.

Apply that pattern to future Inngest work by asking:

- what should authors write in a way that feels like Inngest;
- what must RAWR own under the hood so workflow, step, lifecycle, telemetry,
  policy, and runtime passage stay deterministic;
- what is only vendor constructibility and what becomes RAWR runtime passage
  only after a contained gate crosses it.

Known stale detail:

- The service-package snapshot contains an older `.handler(...)` /
  `.effect(...)` terminal split. Current runtime authority keeps RAWR
  `.effect(...)` as the canonical execution terminal and rejects public
  `.handler(...)` / Promise branches for canonical service/plugin authoring.
  Preserve the native-fit pattern; do not preserve that old terminal split.

## Child 2 Implications

Accepted for this child:

- Use official docs as vendor-shape support only.
- Use the local telemetry docs to mine ownership/ordering/redaction intent.
- Keep parent-app telemetry and oracle telemetry separate.
- Treat the new test as contained `simulation-proof` only after gates pass.
- Record Inngest post-stop rejection by StepError/body semantics plus unchanged
  runtime invocation count.

Fenced for later:

- Native host telemetry/error mapping across oRPC, Inngest, and OTel.
- Production OTel bootstrap and SDK lifecycle.
- HyperDX product visibility.
- Public service-package or Inngest author DX.
- Durable async semantics.

## Pattern Decision

Pattern:

- Vendor protocols can encode expected failures in protocol-native success-ish
  envelopes, as with Inngest `StepError` under HTTP `206`.

Recommended structural remediation:

- Future vendor-boundary children must define failure oracles in vendor-native
  terms before implementation. Do not assume HTTP status alone proves failure.

Passive absorption target:

- Add this to child opening `Vendor / Integration Inheritance` and vendor
  fidelity review when a child crosses a vendor protocol boundary.

DRA disposition:

- Accepted by child 2 DRA closeout. Future vendor-boundary children must define
  failure oracles in vendor-native terms before implementation, then pair those
  oracles with RAWR runtime-delegation and observation evidence.
