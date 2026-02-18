# PM & Steward Reframe Scratchpad

## Canonical authority (reference anchors)
- High-level posture: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md` (scope, locked decisions, invariants, axis map). Treated as subsystem authority along with the spec packet.
- Leaf-level policy: `orpc-ingest-spec-packet/ORPC_INGEST_SPEC_PACKET.md` plus the nine axis docs and E2E walkthroughs (examples 01-04) and decision log (`DECISIONS.md`). These form the PM-grade policy narrative and code-facing checklist.
- Lineage bridge: `SESSION_019c587a_LOOP_CLOSURE_BRIDGE.md` recounts the start/end story and the open governance gaps.
- Alignment matrix: `SESSION_019c587a_ORIGINAL_TO_ORPC_INGEST_ALIGNMENT_MATRIX.md` shows how older docs were retired, replaced, or preserved as keep-unique.

## Origin-to-current story (for PM narrative)
- Original mission: audit prior session, reconstruct lineage, and decode architecture vs runtime tension (Loop Closure step 1). The decision goal was to transition from forensic analysis to active stewardship/policy locking.
- Journey: forensics → stewards vs counter-arguments → architecture debates → convergence into split semantics + TypeBox-first policy → caution about open decisions + runtime documentation drift (Loop Closure open ends + parted branch map).
- Current endpoint: canonical split harness (oRPC for APIs, Inngest for durability), but delta remains in closing decisions, documenting delta vs runtime, and reducing doc clutter (Loop Closure open ends: decision register, runtime gap, program spec, indexing leftover artifacts).

## Functional/product framing (scope + user impact)
- Value to callers: consistent API boundary with generated clients (Axis 01) plus explicit workflow trigger/status surfaces (Axis 08) and runtime split ensures policy clarity.
- Product flows: boundary router (contracts, operations, dom clients) → host composition (Axis 07) → Inngest send (Axis 08) → durable functions with timeline logging and observability (Axis 05), middleware separation (Axis 06), context propagation (Axis 04), internal clients (Axis 02), anti-dual path (Axis 03), durable endpoint guardrails (Axis 09).
- Durability story: Inngest functions own retries, timeline recording (Axis 05), and optional durable endpoints remain additive (Axis 09) while host ensures parse-safe mounts (Axis 07) and vanity enforcement (Axis 03/08). Product steward ensures reliability/resilience.

## Locked cohesion boundaries vs legacy keepers
- In-scope: the axis docs plus E2E examples capture canonical policy and runtime guidance—protect these from drift.
- Out-of-scope (keep-unique/legacy): metadata simplification guidance (`LEGACY_METADATA_REMOVAL.md`), testing/sync/lifecycle (`LEGACY_TESTING_SYNC.md`), deferred decisions appendix (`LEGACY_DECISIONS_APPENDIX.md`), and the older `docs/system/*` spec parts now replaced or annotated per the alignment matrix. They remain governance or ops-level projects to tackle separately.

## Open decisions / completion map
- D-005 (workflow trigger route convergence) and D-006 (workflow contract ownership) remain open/proposed; both impact host wiring (Axis 07, Axis 08) and example docs (E2E 03/04). Need targeted policy or runtime validation & doc updates.
- D-008 (extended traces middleware order) + D-009 (heavy middleware dedupe requirement) + D-010 (finished hook guardrail) still open; each touches Axis 05/06 and E2E 04. Practical work: decide MUST vs SHOULD for dedupe and finished hook, and lock startup order for extended traces instrumentation.
- D-007 (micro-frontend workflow client) is proposed; requires policy locking on client packaging/resisting direct `/api/inngest` calls (Axis 01/08). Need product-level decision to finalize.
- Runtime convergence gap noted in loop closure (O-3) at `E2E_03` (lack of explicit workflow mounts). Need to track whether host currently satisfies split path requirement.
- Loop closure Step 3 & 4 call for policy-to-runtime delta doc + implementation program spec (currently missing). Without them, implementers may make ad-hoc decisions.

## Additional axes/docs needed and ownership boundaries
- Need a `policy-to-runtime delta doc` mapping canonical policies (per axis) to current code (apps/server, packages). Ownership: code steward/architect to maintain, referencing `HOST` docs (Axis 07) and `Loop Closure Step 3` request.
- Need `implementation-grade project spec` tying open decisions to workstreams (Loop Closure Step 4). PM should author with steward input, covering open D-005/006/008/009/010 plus packaging, documentation, tests, and acceptance criteria.
- Need `legacy governance cleanup` doc to signal authority for old docs (Loop Closure Step 1) and to archive redundant spec families; likely a joint PM/steward note referencing `LEGACY_*` docs.
- Need to align deferred decision doc (`LEGACY_DECISIONS_APPENDIX`) into current register or create new closure notes; steward ensures DECISIONS.md references these to avoid divergence.

## Possible project name ideas
- "ORPC+Inngest Runtime Guardrails" (focus on boundary/durability integration policy)
- "Split Surfacing Policy for ORPC Workflows" (emphasizes split/harness boundary)
- "RAWR ORPC Workflow Execution Packet" (neutral, underscores packetization)

## Out-of-scope list (for this reframing project)
- Rewriting the actual canonical axis docs (per instructions to avoid spec edits now).
- Implementing runtime changes (e.g., code or tests) — we only analyze/present completion map.
- Addressing broader metadata simplification/testing/lifecycle docs beyond referencing them.

## Candidate separate projects (post analysis)
1. Metadata & lifecycle governance cleanup (driven by `LEGACY_METADATA_REMOVAL` + `LEGACY_TESTING_SYNC`). Owner: ops/governance teams.
2. Decision closure sprint to resolve D-005/006/008/009/010 with formal policy updates. Owner: steward with PM alignment.
3. Implementation program spec + delta doc (ties open decisions and runtime code). Owner: PM with code steward input.
4. Archival/authority declaration for old spec familes (per Loop Closure Step 1 & alignment matrix). Owner: documentation steward.

