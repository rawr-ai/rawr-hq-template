# Scored Official Inngest URLs

Scores are 1-10 for relevance to RAWR plugin workflow boundaries, testing, and production caveats. All URLs are official Inngest documentation and are eligible for parent Hyperresearch CLI capture.

| Score | URL | Why it matters |
| ---: | --- | --- |
| 10 | https://www.inngest.com/docs/reference/serve | Defines `serve()` as the HTTP handler exposing app functions, with required `client` and `functions`, recommended `/api/inngest` path, `servePath`/`serveOrigin`, signing-key placement, and GET/POST/PUT endpoint behavior. This is the core source for RAWR runtime ingress and host registration boundaries. |
| 10 | https://www.inngest.com/docs/reference/typescript/functions/create | Defines `inngest.createFunction`, stable function IDs, triggers, handler arguments, retries, flow-control options, batching, cancellation, timeouts, and step methods. This is the highest-value source for what plugin workflow descriptors must preserve. |
| 9 | https://www.inngest.com/docs/learn/inngest-steps | Explains steps as independently executed units and names `step.run`, `step.sleep`, `step.waitForEvent`, `step.invoke`, and `step.sendEvent`. It grounds RAWR's step identity, idempotent side-effect boundary, and testing semantics. |
| 9 | https://www.inngest.com/docs/guides/error-handling | Establishes automatic retries, error-vs-failure semantics, function failure after exhausted retries, and the idempotency requirement for retried steps. This directly addresses RAWR's existing layer-disagreement and false-green risk. |
| 9 | https://www.inngest.com/docs/local-development | Covers Dev Server setup, `-u http://localhost:3000/api/inngest`, auto-discovery, event testing, `GET /api/inngest` diagnostics, Docker/CI usage, `INNGEST_DEV`, and local signature behavior. This is essential for distinguishing local request-shape proof from actual dev-server durable behavior. |
| 8 | https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event | Documents `step.waitForEvent`, event-based pause/resume, matching expressions, timeout-to-null behavior, and event audit trails. It shapes durable waits for human/external-system plugin workflows. |
| 8 | https://www.inngest.com/docs/features/inngest-functions/error-retries/rollbacks | Documents `StepError`, step-level catch/rollback patterns, and failure bubbling to the function. This should shape RAWR rollback guidance and tests for partially completed workflows. |
| 8 | https://www.inngest.com/docs/guides/flow-control | Summarizes concurrency, throttling, rate limiting, debounce, and priority. This is the overview source for when plugin workflow specs must declare capacity and provider-protection semantics. |
| 8 | https://www.inngest.com/docs/guides/batching | Defines `batchEvents`, `maxSize`, `timeout`, `key`, conditional batching, `events` handler input, 10 MiB safety limit, and feature incompatibilities. This is required for high-volume plugin event workflows and testing because batching changes function input shape. |
| 8 | https://www.inngest.com/docs/learn/security | Establishes signing keys, automatic signature verification by SDK serve adapters, timestamped signatures to prevent replay, encryption, allowlisting, and key rotation topics. This is the core source for treating `/api/inngest` as signed runtime ingress rather than public workflow API. |
| 7 | https://www.inngest.com/docs/setup/connect | Covers the beta outbound worker model, worker lifecycle, reconnecting, graceful shutdown, in-flight step flushing, worker observability, and rolling releases. It matters as a production-topology caveat even if RAWR's immediate boundary remains `serve()`. |
| 7 | https://www.inngest.com/docs/platform/deployment | Explains the platform role in triggering and maintaining durable function-run state on the app's cloud provider, and its dependence on event and signing keys. This helps fence RAWR production claims until hosted/dev-server lifecycle and registration are actually proven. |

## Selected Capture Set

Use all 12 URLs above for the parent capture set. They cover the named primitives and the RAWR residuals without relying on local evidence as vendor authority.
