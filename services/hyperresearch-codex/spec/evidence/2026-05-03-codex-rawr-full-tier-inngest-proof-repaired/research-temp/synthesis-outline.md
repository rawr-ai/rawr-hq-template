# Synthesis Outline

## I. Executive Answer

State the direct answer: RAWR should encode Inngest durable workflows as runtime-owned execution units with plugin-declared metadata. Include the first two required claim sentences and the main proof boundary.

## II. Runtime-Owned Ingress And Topology

Explain `serve()`, `/api/inngest`, GET/POST/PUT behavior, signing keys, event keys, sync, and why these are runtime/operator concerns. Treat Connect as an optional runtime topology and include the fourth required claim sentence.

## III. Workflow Declaration Contract

Define required plugin declarations: stable function IDs, event/cron triggers, optional CEL predicates, stable step IDs, side-effect categories, retry/idempotency/failure policy, waits, batching, flow control, and migration sensitivity.

## IV. Step Semantics, Retries, And Status

Explain `step.run` as the retryable side-effect boundary, define idempotency obligations, distinguish errors, failures, `StepError`, rollback/fallback, and layered status. Include the third required claim sentence.

## V. Continuations, Batching, And Flow Control

Define wait-for-event contracts, race caveats, batching shape and incompatibilities, and the difference between concurrency, throttling, rate limiting, debounce, and priority. Use a compact table for comparison.

## VI. Testing Gates And Production Caveats

Give a layered test matrix: static conformance, Dev Server/self-host durable semantics, production-like security/ingress. Include local development caveats, self-host proof caveats, production evidence requirements, and the fifth required claim sentence.

## VII. Strategic Outlook

Close with future implications: a manifest-to-runtime compiler, topology-neutral plugin declarations, conservative migration policy, and evidence-backed production claims only.
