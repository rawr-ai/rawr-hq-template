# D-008-First Closure Plan (Through Step 3, Stop Before Implementation Planning)

## Summary
This plan closes the remaining architecture-critical ambiguity by prioritizing **D-008** and right-sizing **D-009/D-010** so they stop blocking the packet.  
Execution model is agent-managed with strict role separation:

1. **D-008 Resolver Agent** (deep analysis + recommendation lock)
2. **Integration Agent** (apply packet updates)
3. **Steward Agent** (independent contradiction/quality pass)

The plan executes through **Step 3** and explicitly stops before **Step 4 (implementation planning)**.

---

## Current Grounded State (from repo)
Open decisions in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`:
- **D-008**: extended traces middleware initialization order standard (open)
- **D-009**: dedupe marker policy strictness (open)
- **D-010**: finished-hook guardrail strictness (open)

D-005/D-006/D-007 are already closed and integrated.

---

## Scope
### In Scope
- Finalize decision posture for D-008 (primary).
- Resolve D-009/D-010 in a non-architecture-blocking way (minimal policy complexity).
- Integrate resulting changes into canonical packet + posture + examples where needed.
- Produce final review report confirming packet readiness for implementation planning.

### Out of Scope
- Runtime code changes.
- Scaffolding/package implementation work.
- Step 4 implementation planning execution.

---

## Step 0 — Orchestration Setup (First Action)
### 0.1 Write plan verbatim first
Create:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_CLOSURE_PLAN_VERBATIM.md`

### 0.2 Coordinator scratchpad
Create:
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_CLOSURE_ORCHESTRATOR_SCRATCHPAD.md`

### 0.3 Agent roster hygiene
- Close stale threads not directly needed for D-008 closure + packet integration + steward review.
- Keep only three active threads (resolver, integrator, steward).

### 0.4 Hard constraints to pass to all agents
- Canonical docs must stay canonical (no transient/session-progress framing).
- D-005/D-006/D-007 locks must remain intact.
- Coordination canvas is optional context only, not policy driver.
- Docs-only pass.

---

## Step 1 — D-008 Resolver Agent (Primary Decision Closure)
Single dedicated agent, full-spectrum review + research, no packet edits in this step.

## Required reading (full corpus)
- Entire packet root + all axis docs + all E2Es:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`
- Posture:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- Surface review:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`
- Skills:
  - `architecture`, `orpc`, `inngest`, `elysia`, `typebox`, `docs-architecture`, `bun`, `turborepo`
- Official docs evidence (Inngest + oRPC) for middleware/context ordering and lifecycle behavior.

## Agent artifacts
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D008_PLAN_VERBATIM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D008_SCRATCHPAD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_AGENT_D008_RECOMMENDATION.md`

## Required D-008 output (decision-complete)
Agent must produce one recommended lock that defines:
1. **Harness baseline middleware initialization contract** (global, authoring-safe default)
2. **Initialization order** at host/bootstrap level
3. **Surface-specific middleware planes**:
   - internal `/rpc` first-party context/middleware
   - external `/api/orpc/*` + `/api/workflows/<capability>/*` boundary middleware
   - runtime `/api/inngest` ingress middleware/lifecycle concerns
4. **What plugin authors inherit automatically vs what they can add**
5. **What is non-negotiable baseline vs extension points**

## D-009 / D-010 handling policy in Step 1
To match your priority:
- D-009 and D-010 are treated as **non-core architecture strictness decisions** unless resolver finds hard blocking impact.
- Default disposition:
  - demote to minimal guidance (or close as non-blocking/defaulted),
  - avoid strict global policy complexity,
  - keep details mostly in examples/reference notes if helpful.

---

## Step 2 — Integration Agent (Apply Spec Updates from D-008 Outcome)
Separate agent applies doc changes only, based on Step 1 decision lock.

## Required integration targets (minimum)
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/DECISIONS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_05_ERRORS_LOGGING_OBSERVABILITY.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_06_MIDDLEWARE_CROSS_CUTTING_CONCERNS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/AXIS_07_HOST_HOOKING_COMPOSITION.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`

## Integration intent
- Lock D-008 as canonical harness behavior with clear “what changes vs what stays.”
- Keep middleware baseline global and explicit for agent DX.
- Remove/avoid unnecessary strictness complexity for D-009/D-010 unless required.
- Preserve D-005/D-006/D-007 wording integrity.

## Integration artifacts
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md`

---

## Step 3 — Steward Agent (Independent Review + Final Closure Report)
Independent reviewer checks consistency and applies small safe fixes only if needed.

## Steward gates (must pass)
1. D-008 is no longer open and is clearly spec-locked.
2. D-009/D-010 are either:
   - clearly closed as non-blocking/minimal guidance, or
   - explicitly retained open with clear non-blocking rationale.
3. No contradiction with D-005/D-006/D-007.
4. Middleware/context placement is explicit per caller/runtime surface.
5. Canonical docs contain no transient/project-state language.
6. Examples illustrate core architecture without forcing extra strictness policy.
7. Packet is ready for implementation planning handoff.

## Steward artifact
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md`

---

## Step 4 — Implementation Planning Handoff (DO NOT EXECUTE YET)
This step is prepared but intentionally not executed now.

Prepared handoff package (to be used later):
- locked decisions summary (D-005..D-008 + D-009/10 disposition),
- exact doc deltas,
- unresolved risks (if any),
- implementation slice candidates (host init, middleware baseline, authoring SDK surface).

**Stop point:** after Step 3 completion and final review report.

---

## Important Public Interfaces / Policy Surfaces Affected
Documentation-policy level (not runtime code yet):
1. **Middleware initialization contract** (harness baseline, global defaults, extension points).
2. **Route-surface middleware ownership** across `/rpc`, `/api/orpc/*`, `/api/workflows/<capability>/*`, `/api/inngest`.
3. **Decision posture updates**:
   - D-008 closed with canonical initialization policy.
   - D-009/D-010 simplified/non-blocking unless proven core-critical.

---

## Test Cases and Scenarios
1. **D-008 Closure Test**
- `DECISIONS.md` no longer lists D-008 as open.
- Axis/posture/docs all reference same initialization model.

2. **Non-Core Strictness Test (D-009/D-010)**
- No architecture-level over-policying introduced.
- Any retained guidance is minimal, explicit, and non-blocking.

3. **Harness DX Test**
- A new agent can determine where middleware is handled globally vs locally without inferring hidden rules.

4. **Consistency Test**
- D-005/D-006/D-007 language unchanged in meaning.
- No cross-doc contradictions introduced.

5. **Canonical Language Test**
- No transient rollout/session tracking text in canonical packet/posture sections.

---

## Assumptions and Defaults
1. Current packet state in `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review` is the active baseline.
2. D-008 is the only architecture-critical open decision.
3. D-009/D-010 default to minimal/non-blocking treatment unless D-008 analysis proves hard dependency.
4. No runtime code changes occur in this cycle.
5. Existing archive location remains:
   - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/_archive/flat-runtime-session-review/session-artifacts/`
