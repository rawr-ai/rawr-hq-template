# PM + Steward Project Definition & Completion Map

**Positive framing:** The ORPC+Inngest posture packet now codifies the split harness, TypeBox-first schema flow, context ownership, middleware boundaries, and host composition with a complete axis map, E2E walkthroughs, and decision register that together form a credible canonical reference (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`, `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`, axis docs, and `orpc-ingest-spec-packet/examples`). That foundation lets us focus solely on the remaining governance/closure work rather than rehashing already locked policies.

## A. What this project is (functional + product perspective)
- Product value: deliver a single, consensus surface where RAWR HQ consumers get stable oRPC APIs (including generated OpenAPI/clients), explicit workflow trigger/status endpoints, and a predictable Inngest-powered durability harness while preserving traceability for call context, logging, and middleware behavior across the split runtimes (`Axis 01`–`Axis 09`, `examples/E2E_*`).
- Functional impact: package domain logic remains transport-neutral (`Axis 02`), API plugins own the caller contracts and operations (`Axis 01`), workflow plugins enqueue via oRPC triggers that ship correlation metadata into Inngest durable functions (`Axis 04`/`Axis 08`), and the host composes everything with parse-safe mounts plus optional helper fixtures (`Axis 07`). Observability/middleware guardrails (Axes 05/06) keep each control plane isolated.
- Product outcome: a hardened guardrail set for future capabilities that prevents parallel trigger paths, ensures DTO ownership, mandates TypeBox-first contracts, and clearly signals runtime vs host responsibilities, so new features can scale without the previous drift that necessitated this packet.

## B. Origin-story linkage
- We began as a forensic reconstruction effort from the legacy flat-runtime packet, then pivoted into a stewardship narrative to stop drift and lock split semantics (`SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md`).
- Along the way we mined the alignment matrix (`SESSION_019c587a_ORIGINAL_TO_ORPC_INGEST_ALIGNMENT_MATRIX.md`) to ensure older docs (e.g., `docs/system/FLAT_RUNTIME_SURFACES_PROPOSAL.md`) defer to the new packet, while preserving the keep-unique governance artifacts (metadata simplification, testing/sync, lifecycle commands).
- The current deliverable is the “last mile” referenced in `Loop Closure` step 4: turn the canonical frictionless policy state into an execution-ready project definition that traces back to the original mission, captures the posture git history, and explains why these specific policies won.

## C. Cohesion assessment (what belongs vs extraneous)
- **Belongs here:** all axis docs plus the decision register and E2E examples (for proving policy in code). They specify the behavior we are now defending and are the documents any implementer must consult before touching runtime surfaces.
- **Extraneous for this packet (keep elsewhere):** metadata simplification / legacy removal reasoning (`LEGACY_METADATA_REMOVAL.md`), system/testing lifecycle prescriptions (`LEGACY_TESTING_SYNC.md`), deferred decisions appendix (`LEGACY_DECISIONS_APPENDIX.md`), and the older `docs/system/*` proposal/spec sets described as “keep-unique” in the alignment matrix. Those artifacts remain useful for ops/governance teams but should not be conflated with the ORPC+Inngest policy packet.
- Maintain clear ownership boundaries: the packet owns the policy; governance/ops docs own release metadata, testing matrices, and lifecycle tooling.

## D. Spec completion map (exact concerns to resolve)
1. **D-005 — Workflow trigger path convergence:** close by confirming whether runtime hosts mount explicit `/api/workflows/<capability>/*` routes (Axis 08, Axis 07). If not, document the short-term gap and a concrete plan (owners: host steward + runtime owner).
2. **D-006 — Workflow contract ownership:** decide if workflow contracts live in domain packages with plugin re-exports or stay plugin-owned; update `examples/E2E_03`/Axis 01/08 accordingly with the agreed default (PM owns decision, steward enforces in docs/code).
3. **D-007 — Browser-safe workflow client pattern:** either lock the proposed prohibition on direct `/api/inngest` calls for micro-frontends or accept a new exception; once locked, update Axis 01/08, the E2E 03 narrative, and generated client guidance.
4. **D-008 — Extended traces middleware order:** determine and record the canonical import/initialization order for `extendedTracesMiddleware()` so instrumentation is consistent (`Axis 05`, `Axis 06`, `examples/E2E_04`).
5. **D-009 — Heavy oRPC middleware dedupe:** elevate the current `SHOULD` guidance into a `MUST` or keep it as `SHOULD` with additional guardrails; capture the chosen language in Axis 04/06 and the dedupe snippet.
6. **D-010 — Finished hook side-effect guardrail:** confirm whether `finished` hook usage remains unconstrained or must be limited to idempotent work and document the runtime expectation in Axis 05/06 and examples.
7. **Policy-to-runtime delta doc:** produce a dedicated mapping from policies (per axis) to current code listings (e.g., `apps/server/src/rawr.ts`, `packages/core/src/orpc/hq-router.ts`, `packages/coordination-inngest/src/adapter.ts`). This is the 1:1 delta requested in `Loop Closure` step 3.
8. **Implementation program spec:** translate the open decisions, policy-to-runtime delta, and the remaining runtime convergence work into a backlog with phases, dependencies, risks, and acceptance tests as requested in `Loop Closure` step 4. Ensure this spec also references `LEGACY_TESTING_SYNC` acceptance gates that tie into release/lifecycle expectations.

## E. Additional axes/docs needed (with rationale + ownership)
- **Policy-to-runtime delta doc:** documents what parts of the runtime already comply with each axis and what still needs change. Owner: code steward/architect because they know the current `apps/server`, `packages`, and `plugins` wiring.
- **Implementation program spec:** a PM-owned artifact that sequences decision resolution, doc locks, and necessary runtime updates referenced in the completion map above. The steward contributes risk/resolution details.
- **Legacy governance/authority declaration:** a short note clarifying that `docs/projects/flat-runtime-session-review` (and this packet) are authoritative for ORPC+Inngest, while `docs/system/*` remains historical (Loop Closure step 1). Owner: documentation steward.
- **Decision closure notes:** once D-005..D-010 are resolved, record the rationale plus cross-links in `DECISIONS.md` (current register) and remove duplicates from `LEGACY_DECISIONS_APPENDIX.md`. Owner: steward with PM confirmation.

## F. Better project name
**"ORPC Workflow Guardrail Packet"** — short, focuses on the split-workflow surface, underscores the goal of creating durable guardrails, and clearly differentiates the work from earlier “flat runtime” exploration.

## G. Out-of-scope + candidate separate projects
- **Explicit out-of-scope list for this analysis deliverable:**
  1. Editing the axis/spec docs themselves (per instructions to do analysis only).
  2. Implementing runtime/infrastructure changes (no code updates now).
  3. Tackling the broader metadata simplification/testing matrices beyond noting them for future follow-up.
- **Candidate separate projects:**
  1. **Metadata & lifecycle governance cleanup:** act on `LEGACY_METADATA_REMOVAL.md` and `LEGACY_TESTING_SYNC.md` to retire redundant docs, enforce metadata validation (`rawr.kind`, `rawr.capability`), and update lifecycle tooling. Owner: governance/ops.
  2. **Decision closure sprint:** resolve D-005 through D-010, document results back into `DECISIONS.md`, and ensure tooling/docs align. Owner: steward + PM.
  3. **Implementation-grade program spec:** craft the backlog referenced in completion map item 8 and tie acceptance tests to the `Loop Closure` and `LEGACY_TESTING_SYNC` gates. Owner: PM with steward input.
  4. **Authority/archival note:** capture the canonical doc family and archive or cross-link the older `docs/system` spec to prevent future confusion (Loop Closure Step 1). Owner: documentation steward.

**Closing:** Once the above completion items and admission documents exist, we can declare the loop closed, update the decision register, and hand off to implementers with clarity about what is now canon and what to monitor in follow-on governance streams.
