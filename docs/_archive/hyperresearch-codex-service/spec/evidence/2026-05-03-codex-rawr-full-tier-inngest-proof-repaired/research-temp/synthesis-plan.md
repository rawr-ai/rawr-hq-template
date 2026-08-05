# Synthesis Plan

## I. Core Thesis

RAWR HQ should specify durable plugin workflows as Inngest-shaped, runtime-owned execution contracts. Plugins should declare stable identity, triggers, step boundaries, retries, idempotency, waits, batching, and flow-control intent. The runtime should own `serve()`, `/api/inngest`, signing/event keys, app sync, topology, observability, testing gates, and any production durability claim.

## II. Strongest Beats To Preserve

1. Draft C has the clearest ownership split between plugin declarations and runtime infrastructure.
2. Draft A best explains why `serve()` and signing-key verification make `/api/inngest` runtime ingress rather than plugin author boilerplate.
3. Draft B best frames the testing/proof boundary: static conformance, Dev Server or self-host durability, and production-like ingress/security gates.
4. Drafts A and C converge on the key semantic rule: top-level handlers orchestrate; side effects belong inside stable `step.run` or other durable step primitives.
5. Draft B gives the most useful failure taxonomy around retriable errors, exhausted `StepError`, handled rollback/fallback, function failure, and RAWR payload status.
6. Draft C has the strongest concise treatment of batching and flow-control incompatibilities.
7. The corpus critic gaps should become caveats, not expanded detours: missing live durable control-plane proof, missing versioning guidance, missing exact observability API details, and missing RAWR source captures.

## III. Commitments

The final should commit to a conservative production posture: RAWR can encode the correct spec shape now, but it cannot claim production durable plugin workflows until a real Inngest Dev Server, Cloud, or self-hosted control-plane path proves memoization, retries, waits, run history, app sync, and signed ingress.

## IV. Citation Style

Use wikilink source-note citations only. No separate Sources section. Cite every claim-dense paragraph with official Inngest notes and use RAWR grounding artifacts sparingly through the captured width/search-plan files where needed.
