# Session Grounding and Posture — ORPC Domain Examples

Created: 2026-02-25
Branch: `agent-codex-dev-orpc-domain-examples-grounding-session`
Status: Active grounding document (living; update as grounding deepens)

## Purpose

Capture the working agreement for this session: what we are trying to accomplish, how we will execute, and the workflow invariants we will hold.

This document is intentionally iterative. During grounding, it should be updated as we resolve ambiguities and tighten standards.

## Source Prompt (Combined/Cleaned from User Instructions)

- We are at the top of the Graphite stack.
- A meaningful portion of ORPC + Inngest architecture is already implemented in the pages/plugins system.
- The current gap is high-quality practical examples that show the architecture in real usage and surface unresolved tensions from specs.
- Prior examples exist but are currently unreliable; we have not yet landed the simplest example that satisfies requirements.

Planned sequence:

1. Build three example domain packages in escalating complexity:
1. Simplest (`n = 1`) example that still meets requirements.
1. Intermediate example.
1. Advanced example that trends toward `n = infinity` (scalable pattern).

Operating model:

- Use a tight back-and-forth loop and move one step at a time.
- Keep a scratch-pad list of decisions/guardrails that evolves into the domain package standard.
- Existing specification packet is reference material, but not primary source of truth for this phase.
- Use first-principles ORPC/Inngest reasoning when tensions exist.
- Current phase priority is ORPC; Inngest is explicitly de-scoped for now.

Stewardship expectations:

- Move deliberately; do not outrun understanding.
- If something is unclear/inconsistent/smells wrong, pause and ask focused questions.
- Only spin up additional agents when explicitly instructed.

Immediate checkpoint asked by user:

- Create a new worktree and a new Graphite branch there.
- First commit on that branch adds this grounding/posture document.
- Return with completion confirmation.

## Session Goal (Current)

Produce a grounded, enforceable path to three ORPC-focused domain package examples that move from minimal to scalable while preserving architectural coherence and avoiding spec drift.

## Working Execution Shape

1. Keep each move small and reviewable.
1. Use observed repo reality plus first-principles architecture, not assumptions.
1. Capture decisions as explicit guardrails/invariants as soon as they are made.
1. Treat the simplest example as the proof surface for standards.
1. Increase complexity only after lower-level shape is stable.

## Workflow Invariants (Current)

- Graphite-first branch/stack operations.
- Worktree isolation for active implementation passes.
- No silent assumption jumps; ambiguity gets explicit questions.
- Minimal diffs consistent with repo patterns.
- Keep focus on accepted scope; call out any intentional scope expansion.
- Keep a living decision log/guardrail list in this grounding track.
- ORPC-first in this phase; avoid dragging Inngest decisions into early example design unless strictly necessary.

## Guardrails and Pins (Seed List)

- Pin A: Example quality matters more than example quantity.
- Pin B: `n = 1` example must still satisfy real requirements (not toy-only).
- Pin C: Intermediate and advanced examples must show continuity with the same underlying package standards.
- Pin D: Domain package standards must become explicit and enforceable (not implicit narrative only).
- Pin E: Domain package boundary remains transport-agnostic; HTTP handlers stay outside the package.
- Pin F: Internal calls inside one domain package prefer direct module/repository composition over client-to-client hops.
- Pin G: Package structure should make extension obvious from code layout, minimizing reliance on external rules docs.
- Pin H: Keep one obvious caller surface (`createTodoClient` + `todoRouter`) even as module count grows.

## Open Questions (To Resolve During Grounding)

- What exact “must-pass” criteria define success for the simplest ORPC example?
- Which existing example artifacts should be preserved, refactored, or discarded?
- What is the minimal domain package invariant set we can enforce immediately without overfitting?

## Grounding Pass 01 (Reference Implementation + ORPC Docs)

### Reference implementation normalized structure

`docs/projects/orpc-ingest-domain-packages/reference-impl` now reflects the intended single-package, three-module layout:

- Root service files: `index.ts`, `router.ts`, `base.ts`, `deps.ts`, `errors.ts`, `unwrap.ts`
- Leaf module: `tasks/{schemas,repository,router}.ts`
- Leaf module: `tags/{schemas,errors,repository,router}.ts`
- Composite module: `assignments/{schemas,errors,repository,router}.ts`

### How this reference intends to use ORPC

1. Router-first service package:
   - Procedures are authored directly with `@orpc/server` builders (`os.context`, `.use`, `.input`, `.output`, `.handler`).
   - Module routers (`tasks`, `tags`, `assignments`) are composed into one `todoRouter`.

2. Context and middleware layering:
   - `base.ts` defines initial context (`deps`), then shared middleware (`withService`) to expose `logger`/`clock`.
   - Each module adds module-local context via middleware (`repo`, and for assignments also `tasks`/`tags` repos).

3. In-process domain client surface:
   - `index.ts` exports `createTodoClient(deps)` using `createRouterClient(todoRouter, { context })`.
   - Consumer experience is one flat namespaced client surface: `todo.tasks.*`, `todo.tags.*`, `todo.assignments.*`.

4. Centralized error translation boundary:
   - Domain/repository errors are modeled as tagged unions.
   - `unwrap.ts` is a package-level adapter mapping all known domain errors to `ORPCError` codes/data.

5. Internal composition choice:
   - Cross-module behavior inside the same domain package uses direct repository imports (`assignments` -> `tasks`/`tags` repos), not intra-package client calls.

### Why this approach was chosen (inferred from code + comments)

- Keep one clear authority surface per package (`todoRouter`) and one local client factory (`createTodoClient`).
- Keep transport concerns out of domain packages while still leveraging ORPC as the primary internal framework.
- Make module growth additive: each capability module repeats the same `schemas + repository + router` recipe.
- Keep agent navigation simple: root invariants are fixed, leaf module pattern is consistent, composite modules show sanctioned cross-module composition.

### Divergences vs current repo intent/patterns (not actioned yet)

- Schema library mismatch: reference uses Zod heavily; current repo posture leans TypeBox-based schemas/adapters.
- Contract artifact difference: reference exports router/client only; current `@rawr/support-example` also exports a derived contract via `minifyContractRouter`.
- Procedure metadata difference: reference procedures omit `.route({ method, path })`; some existing repo procedures include OpenAPI-friendly route metadata.
- Error style difference: reference centralizes domain-to-ORPC translation via `unwrap.ts`; existing repo also uses procedure-level `.errors(...)` maps in places.

### ORPC official docs findings used for grounding

Primary sources:

- Router docs: <https://orpc.dev/docs/router>
- Procedure docs: <https://orpc.dev/docs/procedure>
- Context docs: <https://orpc.dev/docs/context>
- Middleware docs: <https://orpc.dev/docs/middleware>
- Contract-first define/implement: <https://orpc.dev/docs/contract-first/define-contract>, <https://orpc.dev/docs/contract-first/implement-contract>
- Router-to-contract: <https://orpc.dev/docs/contract-first/router-to-contract>
- Server-side clients (`createRouterClient`): <https://orpc.dev/docs/client/server-side>
- OpenAPI handler: <https://orpc.dev/docs/openapi/openapi-handler>

Key confirmations:

- oRPC supports router-first directly: routers are plain nestable objects of procedures.
- Context model matches this reference exactly: initial context + middleware-added execution context, merged through the chain.
- `createRouterClient` is an official no-network server-side pattern for in-process invocation.
- Contract-first is a parallel first-class path (`oc` + `implement(contract)`), and oRPC explicitly supports router-to-contract conversion/minification.
- OpenAPI exposure is optional and external to package internals (`OpenAPIHandler` at transport boundary), which aligns with transport-agnostic domain packaging.

### Why this scales from n=1 to n=infinity

The scaling mechanism is structural repetition with a stable core:

- Stable core: one shared dependency/context base, one root router, one error unwrapping boundary.
- Repeatable leaf-module recipe: `schemas + repository + router`.
- Predictable promotion path: when cross-capability orchestration is needed, add a composite module (like `assignments`) without changing root invariants.
- Constant consumer API shape: one namespaced client interface regardless of module count.
- Optional contract publication path remains available later (`router -> contract`), without forcing early duplication.

## Current Read of Package Standard Direction

For this initiative phase, the active posture is:

- Package boundary remains router-client-first (`todoRouter` + `createTodoClient`) for in-process usage.
- Module internals use hybrid contract-first:
  - `modules/<name>/contract.ts` defines boundary shape,
  - `modules/<name>/router.ts` implements handlers via `implement(contract)`.
- Transport handlers remain app/plugin edge concerns.
- Package-level derived contract export remains deferred unless explicitly needed (for example drift/snapshot tooling).
- Module topology:
  - leaf modules are isolated capabilities,
  - composite modules orchestrate leaf repositories directly inside the same domain boundary.

## Implementation Decisions

### D-001 — Session grounding document location

- Context: The user asked for an initial grounding/posture doc as first commit on a fresh worktree branch.
- Options considered:
  - Create in `docs/projects/orpc-ingest-domain-packages/` alongside existing initiative artifacts.
  - Create in a generic `docs/process/` location.
- Choice: Create in `docs/projects/orpc-ingest-domain-packages/`.
- Rationale: Keeps this session artifact adjacent to the existing domain-package grounding/BOOK materials it will evolve with.
- Risk: Low; this is doc placement only and can be relocated later if doc architecture demands it.

### D-002 — Normalize reference implementation into intended package layout

- Context: The provided reference files were nested under a generated `mnt/.../todo/src` path and mixed with root-level files, making boundary analysis noisy.
- Options considered:
  - Leave files in place and reason across two layouts.
  - Reorganize in-place to the intended single-package `tasks/tags/assignments` layout first.
- Choice: Reorganize in-place before deeper grounding.
- Rationale: Reduces interpretation ambiguity and lets follow-on analysis map directly to intended architecture.
- Risk: Low-to-medium; file movement could hide provenance breadcrumbs, but no code semantics were changed.

### D-003 — Treat this pass as ORPC-shape grounding, not implementation migration

- Context: The reference diverges from repo conventions (notably Zod vs TypeBox and contract export style).
- Options considered:
  - Immediately rewrite divergences during grounding.
  - Record divergences and preserve semantics for analysis first.
- Choice: Record divergences only; do not rewrite yet.
- Rationale: Preserves the fidelity of the provided reference while we lock architectural intent before conversion work.
- Risk: Medium; temporary mismatch persists until follow-up implementation passes.

### D-004 — Error placement model for `example-todo` implementation

- Context: We needed per-procedure ORPC error precision without turning every error into procedure-local duplication.
- Options considered:
  - One global service error map applied everywhere.
  - Strictly procedure-local error definitions only.
  - Hybrid layering (service + module + procedure-local where needed).
- Choice: Hybrid layering.
- Rationale: Keeps shared error definitions centralized while preserving per-procedure declarations and avoiding oversized error surfaces.
- Risk: Low; requires discipline to keep procedure maps narrow and intentional.

### D-005 — ORPC-native boundary error posture (post-grounding correction)

- Context: After reviewing ORPC docs and current package wiring, we identified extra indirection in `createOrpcErrorMapFromDomainCatalog` + `unwrap`.
- Options considered:
  - Keep catalog-to-map + unwrap as a generalized error translation system.
  - Move to direct procedure-level mapping with `.errors(...)` as canonical boundary.
- Choice: Move to direct ORPC-native boundary mapping and remove catalog/unwrap interaction from active examples.
- Rationale: The package boundary is router-client-only. Procedure-level ORPC errors are the contract callers consume, so direct mapping improves readability and reduces agent/human cognitive load.
- Risk: Medium; this is a behavioral refactor touching multiple modules and helper surfaces.

### D-006 — Neverthrow posture update

- Context: We still want neverthrow available, but not as forced repository API shape.
- Options considered:
  - Keep neverthrow `Result` as mandatory repository contract.
  - Remove neverthrow entirely from the domain package examples.
  - Keep neverthrow as optional internal mechanism where composition/recovery benefits are real.
- Choice: Optional internal mechanism only.
- Rationale: Preserves useful composition/recovery tools without forcing an extra abstraction layer in simple repository APIs.
- Risk: Low-to-medium; requires docs/guidance clarity so usage remains intentional, not random.

### D-007 — Boundary error definition naming after catalog removal

- Context: Removing catalog-to-map conversion left a naming/placement choice for reusable ORPC error definitions.
- Options considered:
  - Keep `error-catalog.ts` and repurpose internals.
  - Rename to a boundary-contract-oriented file (`procedure-errors.ts`).
- Choice: Use `boundary/procedure-errors.ts`.
- Rationale: Reduces ambiguity by naming the file after its function: reusable procedure boundary error entries.
- Risk: Low; mostly import churn and naming semantics.

### D-008 — Legacy helper cleanup scope

- Context: `@rawr/hq-sdk` still exported catalog-era helpers after migration.
- Options considered:
  - Keep helpers for potential future usage.
  - Remove helpers immediately because active code no longer uses that pattern.
- Choice: Remove now (`createOrpcErrorMapFromDomainCatalog` and related catalog adapter types/helpers).
- Rationale: Prevents accidental reintroduction of the deprecated pattern and keeps standards package surface aligned with current posture.
- Risk: Medium; potential breakage for out-of-tree consumers relying on removed exports.

### D-009 — Expected business states as values (no thrown domain classes)

- Context: We clarified that this package should not keep a standing translation layer from thrown domain exceptions into ORPC boundary errors.
- Options considered:
  - Keep expected-state domain exception classes (`NotFoundError`, `DuplicateTagError`, etc.) and translate in routers.
  - Model expected business outcomes as values (`null`, `exists`) and throw ORPC boundary errors directly in procedures.
- Choice: Model expected business outcomes as values and throw ORPC boundary errors directly in procedures.
- Rationale: Removes repetitive try/catch translation boilerplate and keeps boundary behavior explicit and caller-focused.
- Risk: Medium; internal repository contracts change and router logic must be updated consistently.

### D-010 — Do not surface typed `DATABASE_ERROR` by default

- Context: We needed to decide whether infra/storage failures should remain typed boundary contract in this example.
- Options considered:
  - Keep typed `DATABASE_ERROR` for procedure contracts.
  - Treat unexpected infra/storage failures as non-defined/internal errors by default.
- Choice: Treat unexpected infra/storage failures as non-defined/internal errors by default for this example.
- Rationale: Callers should branch on domain-relevant errors; internal subsystem details belong in observability, not default boundary contracts.
- Risk: Low-to-medium; tests and docs must align so this remains intentional.

## Implementation Pass Note (Current Target Posture)

- `packages/example-todo` remains in-process (`todoRouter` + `createTodoClient`) with no package-level derived contract export for this phase.
- Modules are split into `contract.ts` (boundary definition) and `router.ts` (handler implementation).
- Error boundary is procedure-native:
  - procedures declare explicit ORPC errors via `.errors(...)`,
  - procedures throw caller-actionable boundary errors directly from value-state checks.
- Expected business states are modeled as values inside the boundary (`null`, `exists`) rather than thrown domain exception classes.
- Unexpected infra/storage failures are non-defined/internal by default in this example posture.
