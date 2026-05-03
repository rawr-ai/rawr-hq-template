# Search Plan: RAWR Durable Plugin Workflows And Inngest Semantics

## Grounding Frame

The local RAWR runtime-realization evidence proves only a contained Inngest-facing boundary: `serve(...)`, `createFunction(...)`, and `step.run(...)` can be crossed through the Oracle async harness, and some failures can surface through Inngest protocol bodies such as `StepError`. It explicitly does not prove durable scheduling, retries, replay, idempotency, hosted run history, production worker topology, final async membership syntax, or production `/api/inngest` ingress policy.

The archived oRPC/Inngest workflow-spec assessment adds the target spec pressure: workflow contracts should be plugin-owned, durable functions should be distinct from caller-facing trigger APIs, `/api/inngest` should be runtime ingress only, browser/API callers should not hit it, and host composition should mount/control runtime ingress deliberately rather than treating it as a normal public API route.

## Source Category Map

| RAWR gap or spec pressure | Official Inngest source category | What to extract |
| --- | --- | --- |
| Runtime-owned ingress and function registration at `/api/inngest` | `serve()` reference, security, connect/deployment setup | `serve({ client, functions })`, recommended serve path, GET/POST/PUT behavior, signing-key verification, app sync, environment keys, app version, worker instance identity. |
| Plugin-owned durable function declaration | `createFunction()` reference | Stable function `id`, triggers, per-function retries, idempotency, batching, flow-control knobs, cancellation/failure hooks, and which options belong in plugin workflow specs versus runtime host policy. |
| Step boundary and side-effect discipline | Inngest steps and durable execution model | Stable step IDs, step memoization, `step.run` as a code-level transaction, independently retried/recovered steps, persisted step output, and idempotency requirements for retried side effects. |
| Error and status disagreement | Error handling and rollbacks | Difference between retriable errors, exhausted step failures, `StepError`, function failure, failure handlers, rollback steps, and why RAWR specs must preserve layer-specific status rather than collapse HTTP success into runtime success. |
| Event-driven waits and human/external joins | `step.waitForEvent()` | Event name, timeout, match/if expression, `null` on timeout, and decoupled event audit trail semantics for workflow continuation boundaries. |
| Batch-triggered plugin workflows | Batching guide | `batchEvents` shape, `events` handler argument, max size/timeout/key/if behavior, 10 MiB safety limit, incompatible features, and caveats when combining batching with keyed concurrency. |
| Backpressure and operational limits | Flow-control overview, with throttling/rate limiting as follow-up if needed | Distinguish concurrency, throttling, rate limiting, debounce, singleton, and priority; decide which controls are plugin-declared workflow semantics and which are platform/operator policy. |
| Local proof versus production proof | Local development, connect, security | Dev Server auto-discovery and explicit `-u` URLs are local test harnesses, not production proof; production requires signing/event keys, app sync/versioning, and secured ingress. |

## Prioritized Capture Plan

1. Capture `serve`, `createFunction`, `steps`, and `how-functions-are-executed` first because they define the durable workflow grammar RAWR specs need to encode.
2. Capture `error-handling`, `rollbacks`, and `wait-for-event` next because they turn the existing RAWR layer-disagreement evidence into normative failure, retry, rollback, and continuation rules.
3. Capture `batching` and `flow-control` to constrain plugin workflow concurrency/load declarations without overfitting runtime policy into plugin APIs.
4. Capture `local-development`, `security`, and `connect` to fence local Dev Server proof from production behavior and to specify `/api/inngest` signing, registration, and worker/app identity caveats.
5. Defer lower-priority official pages such as Render, self-hosting, throttling, and rate limiting unless later roles need deployment-specific or flow-control-specific depth. Do not use the rejected `https://www.inngest.com/docs/platform/deployment` page.

