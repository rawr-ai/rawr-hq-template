# Scored Official Inngest URLs

| Score | URL | Source category | Why it matters for RAWR durable plugin workflow specs |
| ---: | --- | --- | --- |
| 100 | https://www.inngest.com/docs/reference/serve | Runtime ingress and registration | Defines `serve()` as the HTTP handler exposing functions, the `client` and `functions` handoff, recommended `/api/inngest` path, and GET/POST/PUT behavior for metadata, invocation, and registration. |
| 99 | https://www.inngest.com/docs/reference/typescript/functions/create | Durable function declaration | Primary reference for stable function IDs, triggers, retries, `onFailure`, idempotency, batching, and flow-control options that plugin specs must model explicitly. |
| 98 | https://www.inngest.com/docs/learn/inngest-steps | Step grammar | Explains step IDs, `step.run`, independent retry/recovery, and step-level testing/debugging semantics; directly maps to RAWR async owner-to-step identity. |
| 97 | https://www.inngest.com/docs/learn/how-functions-are-executed | Durable execution model | Explains state persistence, step discovery, memoization, repeated handler execution, and retry continuation, which are the main durable semantics missing from the RAWR lab proof. |
| 96 | https://www.inngest.com/docs/guides/error-handling | Errors, retries, idempotency | Establishes automatic retries, error versus failure distinction, and the requirement that retried step code be idempotent. |
| 94 | https://www.inngest.com/docs/features/inngest-functions/error-retries/rollbacks | Step failure handling | Details `StepError`, per-step failure recovery, fallback steps, and rollback patterns needed for RAWR failure-boundary rules. |
| 93 | https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event | Event waits and continuation | Defines `step.waitForEvent()`, event matching, timeouts, `null` continuation, and event-based resume semantics for external or human-in-the-loop workflow joins. |
| 91 | https://www.inngest.com/docs/guides/batching | Batch-triggered workflows | Covers `batchEvents`, `events` handler shape, max size, timeout, keying, conditional batching, 10 MiB safety behavior, and incompatible controls. |
| 89 | https://www.inngest.com/docs/guides/flow-control | Operational control overview | Frames concurrency, throttling, rate limiting, debounce, singleton, and priority so RAWR can separate plugin-declared workflow semantics from operator/platform policy. |
| 88 | https://www.inngest.com/docs/learn/security | Signing and ingress security | Covers signing keys, automatic signature verification by `serve`, replay protection, app syncing, secret handling, encryption caveats, and firewall allowlisting for production ingress. |
| 86 | https://www.inngest.com/docs/local-development | Local testing boundary | Documents Dev Server, explicit `-u` serve URL, auto-discovery of `/api/inngest`, local invocation/testing, and why local proof must not be promoted to production durable proof. |
| 84 | https://www.inngest.com/docs/setup/connect | Production connection caveats | Adds production env vars, Connect/local mode, app version, worker instance identity, and rolling-deploy implications for worker/runtime topology. |

## Deferred Official URLs

`https://www.inngest.com/docs/guides/throttling` and `https://www.inngest.com/docs/guides/rate-limiting` are good second-pass depth sources if later analysis needs hard distinctions between queued throttling and skipped rate-limited events. `https://www.inngest.com/docs/deploy/render` and `https://www.inngest.com/docs/self-hosting` are deployment-shape sources, but they are less central than the selected ingress/security/connect docs for this width sweep.

