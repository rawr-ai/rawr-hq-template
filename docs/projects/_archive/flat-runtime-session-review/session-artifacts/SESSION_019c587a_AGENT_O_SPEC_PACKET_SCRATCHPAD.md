# Session 019c587a — Agent O Spec Packet Scratchpad

## Working Constraints

- Analysis only in this phase.
- No edits to canonical spec docs.
- Create only Agent O artifacts.
- Ignore unrelated local edits.

## Source Evidence Log

### A) `FLAT_RUNTIME_SPEC_PACKET.md` (canonical packet baseline)

Key locked baseline:
- Single composition authority (`rawr.hq.ts`) and manifest-first assembly.
- Runtime surfaces remain split by semantics (`api`, `workflows`, `web`, `cli`, `agents`, optional `mcp`).
- Metadata minimized to `rawr.kind` + `rawr.capability`.
- Plugin-to-plugin runtime imports disallowed.
- Workflow exposure policy: API procedures trigger workflows; workflows expose Inngest functions.

What this doc currently mixes:
- target decisions,
- metadata policy,
- migration sequencing,
- validation gates,
- links to axis docs.

### B) `DECISIONS.md` (decision register)

Closed decisions to preserve exactly:
- D-001 workflow-to-API exposure model.
- D-002 runtime metadata minimization.
- D-003 explicit/manual manifest discovery in phase 1.

Deferred decisions to isolate cleanly:
- D-004 workflow-backed ORPC helper abstraction (defer until repeated boilerplate evidence).
- D-005 publish posture runtime role removal dependency on release governance.

Decision hygiene invariant:
- No new architecture-impacting implementation without first recording decision.

### C) `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (normative harness posture)

High-value normative content:
- 9 axes policy with rationale and references.
- 11 hard rules (MUST/MUST NOT/SHOULD).
- Anti-dual-path policy.
- Canonical naming rules (`contract.ts`, `router.ts`, `client.ts`, `index.ts`).
- Canonical ownership split:
  - package internal surfaces,
  - boundary API plugin surfaces,
  - workflow trigger + durable function surfaces,
  - optional durable endpoint adapters (additive only).
- Host composition/mount sequence and explicit harness boundaries.

Doc smell for packet extraction:
- Contains very detailed code blocks mixed with normative policy.
- Some policy is repeated in prose and examples.

### D) `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md` (authoring recommendation)

High-value authoring defaults:
- Internal package default shape: `Domain -> Service -> Procedures -> Router + Client + Errors -> Index`.
- Boundary plugin default: contract-first with explicit operations.
- Workflow trigger vs durable runtime split.
- Scale/adoption exception rule:
  - split handlers first,
  - split contracts later only when behavior/audience diverges.
- Required root fixtures:
  - TypeBox -> Standard Schema adapter,
  - composition root (`rawr.hq.ts`),
  - host mounting root (`apps/server/src/rawr.ts`).

Doc smell for packet extraction:
- Recommendation and normative language are partly blended.
- Includes implementation illustration that can be mistaken for hard policy.

## Consolidated Invariants (Must survive modularization)

1. Preserve split semantics: oRPC boundary harness vs Inngest durability harness.
2. Keep one external contract tree for SDK generation.
3. Keep internal calling default as in-process clients (no local HTTP self-calls).
4. Keep durable endpoints additive only, never replacing first-party trigger authoring path.
5. Keep manifest as composition authority.
6. Keep metadata runtime contract minimal and explicit.
7. Keep plugin runtime import boundaries strict.
8. Keep decision register as single closure source.

## Current Packet Pain Points

1. Normative policy and code examples are not cleanly separated.
2. Cross-cutting concerns (errors, context, observability, middleware) are described in multiple places.
3. Discoverability for new contributors is slower than needed (many docs, weak routing narrative).
4. Scope boundaries between canonical policy vs recommendation prose are easy to misread.

## Candidate Modular Topologies

### Option A: Keep current axis files only; add stronger index

Pros:
- Lowest churn.

Cons:
- Policy still scattered by axis, not by implementation concern.
- Cross-cutting duplication remains.
- Harder “if I need X, where do I read?” routing.

### Option B: Policy-by-concern packet modules (chosen)

Pros:
- One concern per canonical doc.
- Clear split between normative docs and reference/example docs.
- Easier extraction from posture/integrated docs without policy drift.

Cons:
- Requires explicit source-to-target extraction mapping.

### Option C: Harness-only split (ORPC doc + Inngest doc + everything else)

Pros:
- Clean for runtime specialists.

Cons:
- Manifest/metadata/migration concerns become overloaded in a catch-all doc.

## Chosen Direction

Choose Option B (policy-by-concern), with:
- a thin entrypoint packet doc,
- dedicated docs for runtime boundaries, package/plugin model, ORPC model, Inngest model,
- dedicated cross-cutting placement doc,
- dedicated migration/validation doc,
- dedicated reference examples doc,
- decisions register unchanged as authoritative ledger.

## Draft Cross-Cutting Placement Matrix

| Concern | Canonical code owner | Canonical packet doc owner | Notes |
| --- | --- | --- | --- |
| Schema artifacts | `packages/*` TypeBox modules + adapter package | ORPC model doc + package/plugin model doc | One schema source, many consumers |
| API auth/visibility/rate policy | oRPC/Elysia boundary handlers | Runtime boundaries doc | No duplication inside Inngest docs |
| Durable retry/idempotency/steps | Inngest function configs + `step.run` | Inngest durability doc | Not restated in API policy docs |
| Request context | oRPC ingress registration | ORPC model doc | Distinct from durable context |
| Durable context | event payload + runtime adapter | Inngest durability doc | Distinct from request context |
| Error semantics | `ORPCError` vs run/timeline lifecycle | Cross-cutting placement doc | One section describing both surfaces without overlap |
| Observability/correlation | trigger payload links + runtime timeline | Cross-cutting placement doc | Trace continuity rules live once |
| Composition authority | `rawr.hq.ts` + host mount root | Manifest/host composition doc | No alternate composition narrative |
| Metadata contract | `rawr.kind`, `rawr.capability` only | Manifest/host composition doc | Legacy metadata remains migration topic only |

## Draft Packet Extraction Mapping

| Source | Sections to extract | Target module |
| --- | --- | --- |
| `FLAT_RUNTIME_SPEC_PACKET.md` | Problem statement, target decisions summary, migration phases, acceptance gates | Entrypoint + migration/validation + manifest/host docs |
| `DECISIONS.md` | Entire register unchanged | Decisions register |
| `...POSTURE_SPEC.md` | Axes policies, hard rules, anti-dual-path, naming rules, canonical inventory, glue ownership | Runtime boundaries + ORPC model + Inngest model + package/plugin model + cross-cutting doc |
| `...INTEGRATED_RECOMMENDATION.md` | Internal package default, boundary default, workflow split, scale rule, root fixtures | Package/plugin model + ORPC model + Inngest model + examples doc |

## Ambiguity Closures (Resolved for extraction phase)

1. **Are recommendations normative?**
   - Resolution: recommendation doc content becomes normative only when explicitly restated in policy modules; otherwise remains reference/examples.
2. **Where do optional helper abstractions live?**
   - Resolution: cross-cutting placement doc references helper policy; `DECISIONS.md` keeps D-004 deferred status.
3. **Do we keep axis docs as canonical?**
   - Resolution: no; axis docs become source material for concern-based packet extraction (or become appendices/reference-only).
4. **Where does “if I need X” routing live?**
   - Resolution: entrypoint packet doc owns navigation matrix and links to concern modules.

## Extraction Readiness Check

- Decision-complete: yes (no unresolved architecture choices introduced).
- Boundary-complete: yes (API/workflow/durability split preserved).
- Ownership-complete: yes (code owner + doc owner per concern drafted).
- Implementation-ready: yes (source-to-target extraction map drafted).
