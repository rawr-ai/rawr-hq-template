# Takeover Current State — `example-todo`

Created: 2026-03-06

Update: Superseded as the primary active handoff by `ACTIVE_GROUNDING.md` for
the PostHog + Drizzle stress-test phase. Keep this file for historical
current-state context tied to the prior finishing/hardening phase.

Update: This remains a useful structural snapshot, but the live branch/session
handoff now continues in `TAKEOVER_SESSION_2026-03-09.md`.

## What This Document Is

This is a present-state grounding document for the next finishing push on the `example-todo` golden example.

It is not a historical session recap. It is meant to answer: where are we now, what appears settled, what still looks transitional, and what likely needs touch-up before this can be treated as the canonical scaffold shape.

## Current Source of Truth

### Observed

- Latest code truth for this brief:
  - branch: `refactor/example-todo-domain-topology-domain-modules`
  - isolated takeover branch: `codex/agent-codex-example-todo-takeover-current-state`
  - worktree: `/Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-codex-agent-codex-example-todo-takeover-current-state`
- Primary code focus:
  - `packages/example-todo/**`
  - `packages/hq-sdk/**`
  - `packages/support-example/**`
- Primary docs packet:
  - `docs/projects/orpc-ingest-domain-packages/README.md`
  - `docs/projects/orpc-ingest-domain-packages/DECISIONS.md`
  - `docs/projects/orpc-ingest-domain-packages/guidance.md`
  - `docs/projects/orpc-ingest-domain-packages/examples.md`
- Historical grounding archive:
  - `docs/projects/_archive/orpc-ingest-domain-packages/SESSION_ORPC_EXAMPLES_GROUNDING_2026-02-25.md`
- Relevant session context:
  - live takeover session `019cb058-860f-7a00-a3c0-c4f8f709fb58`
- Normalizations used here:
  - `example2do` => `example-todo`
  - `RAR AWR` => `RAWR`

### Inferred

- The active current-state truth lives in the top branch code and the current docs packet, not in the older `codex/support-example-orpc-unified-golden` checkout.
- Session history still matters, but mainly to explain why some seams remain local/transitional.

## What Has Settled

### Observed

- `packages/example-todo/src/` has a stable outer boundary:
  - `index.ts`
  - `client.ts`
  - `router.ts`
- The package has a stable inner split:
  - local kit seam: `orpc-sdk.ts`, `orpc/*`
  - service surface: `service/*`
- The package boundary is router-client-first:
  - `src/index.ts` exports only `createClient`, `router`, `Client`, and `Router`
  - `src/client.ts` binds the in-process client with `defineDomainPackage(router)`
  - `src/router.ts` is a thin public alias for `src/service/router.ts`
- The current service choke points are explicit:
  - `src/service/base.ts` binds service-local authoring surfaces and assembles baseline concern profiles
  - `src/service/contract.ts` bubbles module contracts up to the root contract
  - `src/service/impl.ts` creates the central implementer and attaches package-wide middleware
  - `src/service/router.ts` performs the single final router attach
- Modules follow one repeated split:
  - `contract.ts` for boundary shape
  - `setup.ts` for execution-context injection
  - `router.ts` for handler implementation
- Module routers are contract-enforced via `os.router({ ... })`.
- Runtime context layering is explicit:
  - host-owned dependencies stay under `context.deps`
  - package-level execution context is injected once by provider middleware
  - module-level repos/services are injected in `setup.ts`
- The package-wide middleware story is explicit:
  - baseline framework observability + analytics are attached by `createServiceImplementer(...)`
  - host/runtime tracing bootstrap now lives above the package
  - `sqlProvider` is attached in `src/service/impl.ts`
  - `readOnlyMode` is attached in `src/service/impl.ts`
- Metadata posture is explicit:
  - shared `domain` and `audience`
  - explicit per-procedure `idempotent`
- Error posture is explicit:
  - caller-actionable ORPC errors are declared in module contracts or shared boundary error definitions
  - expected business states remain values inside the boundary
  - unexpected internals are not surfaced as typed boundary errors by default
- The current docs packet matches these core choices:
  - `DECISIONS.md`
  - `guidance.md`
  - `examples.md`

### Inferred

- The package shell and authoring model no longer look like a temporary experiment. They read as the intended scaffold shape.
- The primary structural uncertainty has moved away from service/module topology and into seam-hardening, SDK graduation, and cross-example alignment.

## Proto SDK / Real SDK Status

### Observed

- `packages/example-todo/src/orpc-sdk.ts` is the package-local façade for SDK-style authoring.
- `packages/example-todo/src/orpc/base.ts` now holds the baseline domain-package definitions:
  - base deps
  - base metadata
  - initial-context helpers
  - base middleware binding
  - base implementer binding
- `packages/example-todo/src/orpc/factory/` is split into focused files:
  - `contract.ts`
  - `middleware.ts`
  - `implementer.ts`
  - `service.ts`
  - `index.ts`
- `defineService(...)` is the current high-level service-binding seam.
- `packages/example-todo/src/orpc/package-boundary.ts` isolates the in-process boundary helper (`defineDomainPackage`, `InferDeps`).
- `packages/example-todo/src/orpc/schema.ts` is generic TypeBox-to-oRPC glue.
- `packages/example-todo/src/orpc/ports/{db,feedback}.ts` define package-facing ports that are generic in shape but still local to the example package.
- `packages/hq-sdk/src/**` currently contains only a narrower subset:
  - `deps.ts`
  - `orpc/domain-package.ts`
  - `orpc/module.ts`
  - `orpc/schema.ts`
  - `index.ts`
- `packages/support-example` already consumes `@rawr/hq-sdk` for schema helpers, but not the richer service-authoring seam.
- Session context on the current branch records one residual implementation edge after the proto-SDK split:
  - an internal ESM cycle between `src/orpc/base.ts` and some middleware files
  - described there as benign so long as those files do not accumulate problematic top-level initialization
- The same late-stage session review also flags `src/orpc/package-boundary.ts` as the main silent type-risk area because it casts `{ deps }` to the full router initial context.

### Inferred

- The seam has matured from a monolithic prototype into a layered local SDK, but it is still only partially graduated into a real shared package.
- What already looks broadly reusable:
  - schema helpers
  - package-boundary client helper
  - minimal shared deps contract
  - simple domain-module helper
- What still looks intentionally local/transitional:
  - service-bound authoring helpers
  - package-level observability policy
  - stronger implementer-binding surfaces
  - example-local ports
- The current structure appears compatible with later expansion to API-package support because the generic builder layer is now distinct from service-local composition, but the shared SDK surface is not yet carrying that richer responsibility.

## How Representative the Example Is Right Now

### Observed

- `example-todo` now demonstrates more than a leaf example:
  - multiple modules
  - a composite orchestration module (`assignments`)
  - package-wide middleware
  - shared error primitives
  - runtime and type-level verification
- Tests cover:
  - business behavior
  - typed procedure errors
  - metadata propagation
  - provider middleware behavior
  - one compile-only context-typing seam
- Validation in this worktree:
  - `bun run --cwd packages/example-todo typecheck` passed
  - `bunx vitest run --project example-todo` passed
  - `bun run --cwd packages/hq-sdk typecheck` passed
  - `bun run --cwd packages/support-example typecheck` passed
  - `bun run --cwd packages/example-todo test` fanned into the broader repo Vitest matrix and failed unrelated server suites while the `example-todo` project tests still passed
- `support-example` remains broader in business flavor, but structurally different:
  - router-first authority chain
  - `domain/` + `modules/`
  - exports `router` and derived `contract`
  - no `createClient` boundary export
- `support-example/README.md` explicitly describes itself as router-first and non-normative.
- The archived grounding note `docs/projects/_archive/orpc-ingest-domain-packages/SESSION_ORPC_EXAMPLES_GROUNDING_2026-02-25.md` already records that `support-example` differs from the newer router-client-first reference posture.

### Inferred

- `example-todo` is now the primary canonical candidate for the deterministic package shell.
- `support-example` is still useful as a richer capability reference, but it is no longer equally authoritative for the exact scaffold shape.
- Together they still tell a useful “small-to-medium capability” story, but not yet a fully aligned “same scaffold at different scale” story.

## Likely Touch-Up Areas Before We Call It Golden

### Observed

- Compile-only seam verification is still thin:
  - `test/context-typing.ts` covers provider dependent-context typing
  - there is no comparable compile-only file yet for `defineService(...)`
  - there is no comparable compile-only file yet for package-boundary deps inference / `createClient(...)`
- Adjacent older research material still references `orpc-runtime/*`, notably:
  - `docs/projects/example-todo-orpc-grounding/ORPC_RESEARCH_GROUNDING.md`
- The current docs packet assumes the newer `example-todo` shell, while `support-example` still exposes the older router-first public story.
- The live session records one residual implementation smell after the proto-SDK split: the internal ESM cycle around `src/orpc/base.ts`.
- `packages/example-todo` still has no package README that explains its role the way `packages/support-example/README.md` does.

### Inferred

- The remaining work looks like finishing and hardening work, not foundational redesign:
  - clearer current-state documentation at the package level
  - stronger seam verification
  - explicit treatment of the local proto SDK vs shared SDK boundary
  - explanation or later alignment of `support-example` relative to the new canonical shape
- The most important unresolved edges are about guidance quality and scaffold determinism, not about whether the core authoring model exists.

## Open Discussion Knots

### Observed

- The docs packet and code agree that `example-todo` should stay router-client-first and in-process for this phase.
- The shared SDK exists, but the richer authoring seam is still mostly local to `example-todo`.
- `support-example` still carries older router-first semantics that differ from the newer canonical packet.

### Inferred

- The next discussion should likely focus on:
  - how much of the current local proto SDK is “actually ready” to graduate
  - how `support-example` should relate to the new canonical shell
  - what minimum verification/doc hardening is required before deterministic scaffolding can safely copy this shape
