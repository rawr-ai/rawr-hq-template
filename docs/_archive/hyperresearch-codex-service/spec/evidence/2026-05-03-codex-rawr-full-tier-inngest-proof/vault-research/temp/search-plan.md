# Width-Sweep Search Plan

## Query

For RAWR HQ runtime realization, identify which Inngest primitives and operational semantics the plugin/runtime specs should encode for durable plugin workflows. The sweep must ground the question in existing RAWR runtime-realization evidence and spec-gap findings, then capture official Inngest documentation for vendor authority.

## Local Grounding Posture

Local RAWR evidence is context, not vendor authority. It establishes the current proof ceiling:

- RAWR has a contained Inngest-facing boundary proof through `serve`, `createFunction`, and `step.run`, plus async harness delegation and failure/status observation.
- RAWR has not proven durable scheduling, retry, replay, idempotency, run history, hosted registration, production worker topology, product async policy, or final public async membership syntax.
- Existing spec-gap review already flagged missing local development, retries/error handling, flow control, signing-key ingress, CI/testing, and production-mode guidance.

Use those local findings to decide what official docs to capture and how to score them. Do not cite local evidence as Inngest semantics.

## Source Categories

1. Endpoint and host registration
   - Capture `serve()` reference and serving guides to establish `/api/inngest` as the ingress shape, the `client + functions` bundle, HTTP method behavior, function metadata, invocation, sync/registration, `servePath`, `serveOrigin`, and framework mounting.
   - RAWR mapping: plugin specs should model one runtime-owned Inngest bundle per host/process, route `/api/inngest` as runtime ingress, and keep browser/API workflow trigger surfaces separate from Inngest ingress.

2. Function definition and workflow boundaries
   - Capture `createFunction` reference for stable function IDs, triggers, handler arguments, retries, flow-control options, cancellation, timeouts, batching, and `step` methods.
   - RAWR mapping: plugin workflow specs should distinguish trigger APIs/events from durable function handlers, preserve stable function/step IDs, and constrain durable function authoring through runtime-owned registration rather than arbitrary plugin handlers.

3. Step semantics and durable unit boundaries
   - Capture Inngest steps docs for `step.run`, retriable isolated work, independent step recovery, and testing/debugging at the step level.
   - RAWR mapping: plugin workflow specs should put side effects and provider/resource crossings inside named `step.run` boundaries and treat each step as an idempotent durable unit, not as a generic callback block.

4. Errors, retries, rollbacks, and idempotency
   - Capture errors/retries and rollbacks docs to establish automatic retries, error-vs-failure distinctions, `StepError`, failure bubbling, function failure after exhausted retries, and rollback patterns.
   - RAWR mapping: specs should define how runtime errors differ from transport success, require idempotency for retried steps, and test layer-disagreement paths instead of treating HTTP status as workflow truth.

5. Event waits and long-running workflow coordination
   - Capture `step.waitForEvent` docs for pause/resume, event matching, timeout-to-null behavior, audit trails, and decoupled resume events.
   - RAWR mapping: specs should encode external wait points as explicit durable event waits with correlation expressions and timeout outcomes, not as in-memory promises or direct process state.

6. Flow control and batching
   - Capture flow-control overview and batching docs for concurrency, throttling, rate limiting, debounce, priority, batch sizing, key expressions, incompatibilities, and batch memory/size caveats.
   - RAWR mapping: plugin workflow contracts should declare resource/tenant/account flow-control policies where the plugin can overload providers, third-party APIs, or runtime capacity. Batching should be explicit and tested because it changes handler input from `event` to `events`.

7. Local development and test mode
   - Capture local development docs for Dev Server, `-u http://localhost:3000/api/inngest`, auto-discovery, local event sending, debug `GET /api/inngest`, Docker/CI use, `INNGEST_DEV`, and local signature behavior.
   - RAWR mapping: specs and tests need a dev-server path that proves actual function loading/invocation when durable/dev-server behavior is claimed, while keeping local adapter/request construction labeled as weaker than durable proof.

8. Security, signing keys, and production caveats
   - Capture security, deployment, and connect docs for signing keys, automatic serve-adapter verification, replay protection, event/signing keys, platform durable execution, production syncing, worker lifecycle, graceful shutdown, and long-running worker caveats.
   - RAWR mapping: `/api/inngest` must be treated as signed runtime ingress with gateway/proxy policy, not as a public caller API. Production claims require key management, registration/sync, observability, lifecycle, and shutdown evidence.

## Capture Priority

Primary capture should favor docs that directly answer the named primitives: `serve`, `createFunction`, `step.run`, retries/errors, `step.waitForEvent`, batching, flow control, local development, signing keys, and `/api/inngest` ingress.

Secondary capture should include production/deployment caveats only where they clarify what RAWR must keep fenced until a live/dev-server or production-shaped proof is run.
