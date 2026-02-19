# Agent C Scratchpad

## Drift lock
- Scope: docs/spec only.
- Preserve D-005..D-012 semantics.
- No auth/db implementation plan details; only stubs/hooks/layer guarantees.
- Do not touch process/runbook/testing docs.
- Package-oriented default for harness/core/infrastructure abstractions, without forcing one concrete package topology.

## Grounding complete
- Skills applied: information-design, architecture, docs-architecture, decision-logging, deep-search, orpc, inngest, typescript.
- Read complete packet corpus: README, ARCHITECTURE, DECISIONS, all axes, all examples.
- Read archive additive extractions: LEGACY_METADATA_REMOVAL, LEGACY_TESTING_SYNC.

## Current canonical anchors to preserve
1. D-005 route split lock: `/api/workflows/<capability>/*` caller-facing, `/api/inngest` runtime-only, `/rpc` internal-first-party.
2. D-006 ownership lock: workflow/API boundary contracts are plugin-owned; packages own shared domain logic/domain schemas.
3. D-007 caller/publication lock: first-party defaults to `RPCLink` on `/rpc`; external uses published OpenAPI; `/api/inngest` never caller SDK surface.
4. D-008 bootstrap lock: baseline traces first, one runtime-owned Inngest bundle, explicit mount order.
5. D-011 context/schema ownership lock: context metadata in `context.ts`; procedure/boundary I/O with owning procedures/contracts.
6. D-012 docs posture lock: inline `.input/.output` default; extraction exception-only with paired `{ input, output }`.

## Gap observed (Agent C concern)
- Existing axes mention context modules and host order, but do not yet provide one explicit, reusable layer model for shared infra primitives + deterministic composition guarantees.
- Plugin authors still have implicit questions around where auth/db-ready stubs live, how they are injected, and import-direction rules for reusable infra.

## D-014 lock-ready target (no decision mutation yet)
- Introduce an explicit "core infrastructure packaging + composition guarantees" contract:
  1. Small shared platform primitives in packages (`context contracts`, `principal/request metadata types`, `auth facade interfaces`, `db facade interfaces`, `resolver helpers`, `factory helpers`) remain transport-neutral and side-effect-light.
  2. Host composition owns concrete wiring (`create*Context`, `build*Dependencies`, `register*Routes`) and injects stubs/adapters into plugin boundary contexts.
  3. Plugins own boundary contracts/operations and consume injected infra ports; plugins do not instantiate global infra singletons.
  4. Internal package clients consume typed context/deps and remain default server-internal path.
  5. Import direction is one-way: host -> plugins -> packages (for boundary usage), packages never import plugins/hosts.

## What changes vs unchanged (must be explicit)
- Changes:
  - Add explicit layer model + deterministic wiring contract language.
  - Add explicit import-direction and composition determinant guarantees.
  - Add explicit plugin-author low-burden guarantees (required injected deps and stable extension hooks).
- Unchanged:
  - Route split semantics (D-005).
  - Plugin boundary ownership (D-006).
  - Caller transport/publication boundaries (D-007).
  - Baseline trace/mount order semantics (D-008).
  - Context/schema ownership and inline-I/O defaults (D-011/D-012).

## File-level edit intent
1. `axes/02-internal-clients.md`
- Add "Core infrastructure layering contract" section for package-internal client path.
- Add import-direction guarantees and infrastructure stub ownership notes.
- Keep package transport-neutral + workflow boundary ownership statements intact.

2. `axes/07-host-composition.md`
- Add composition determinants and host wiring contract for shared infra ports.
- Add explicit "host provides concrete adapters; plugins consume ports" language.
- Keep D-008 mount/bootstrap and D-005..D-007 unchanged block explicit.

3. `axes/08-workflow-api-boundaries.md`
- Add boundary/runtime seam guarantees for shared infra context factories.
- Clarify trigger/runtime adapters consume shared ports without moving ownership into packages.
- Keep existing trigger-vs-ingress split and caller model unchanged.

4. `axes/11-core-infrastructure-packaging-and-composition-guarantees.md` (new)
- Canonical focused leaf for D-014-ready language:
  - Layer model table.
  - Deterministic composition guarantees.
  - Import-direction matrix.
  - Plugin author checklist (minimal required wiring).
  - "changes vs unchanged" section.

## Decision-log note
- Decision point: create new axis 11 vs overloading axes 02/07/08.
- Choice: create axis 11 and cross-link from 02/07/08.
- Rationale: keeps information scent high and avoids burying D-014 contract language in unrelated sections.
- Risk: mild doc surface growth; mitigated by narrow scope and explicit cross-links.
