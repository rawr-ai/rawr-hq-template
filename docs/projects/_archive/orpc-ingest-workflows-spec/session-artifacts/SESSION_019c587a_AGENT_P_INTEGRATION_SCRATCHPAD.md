# SESSION_019c587a — Agent P Integration Scratchpad

## 0) Scope + Constraints
- Analysis-only phase.
- No canonical spec edits in this phase.
- Output target: decision-complete integration diff for implementation handoff.

## 1) Skill Intake (Read)
- oRPC skill: contract-first and router-first are both valid authoring modes; contract-first is explicit contract artifact + `implement()`.
- Inngest skill: durability semantics live in step-based function execution, distinct from request/response API semantics.
- TypeBox skill: schema artifact posture (JSON Schema/OpenAPI alignment) should be explicit and reusable.
- Elysia skill: explicit mount boundaries + parse-safe forwarding (`parse: "none"`) remain important.
- Architecture skill: separate target decisions from transition mechanics; resolve spine/boundary decisions before local details.

## 2) Primary Source Map
1. Canonical spec:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
2. Recommendation:
`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md`

## 3) Structural Delta Map

### Canonical spec already strong on
- Split harness and hard rules (Axes 1-9 + rules): `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:42`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:196`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:215`
- Host/runtime glue internals and explicit mount wiring: `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:246`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:545`
- Optional composition helpers (explicit/non-black-box): `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:615`

### Recommendation adds or tightens
- Internal package default shape (`Domain -> Service -> Procedures -> Router + Client + Errors -> Index`): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:9`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:19`
- Boundary API plugin operations layer as default (`operations/*` explicit): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:232`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:272`
- Workflow trigger operations layer explicit before Inngest send: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:349`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:381`
- Required root fixtures (TypeBox adapter package, `rawr.hq.ts`, host mounting root fixture): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:452`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:455`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:496`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:527`
- Adoption exception + scale rule: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:544`

## 4) Conflict Ledger (Recommendation Authoritative)
1. Internal package topology conflict:
- Current: `packages/<capability>/src/{contract.ts,router.ts,client.ts}` (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:264`)
- Recommendation default: domain/service/procedures/router/client/errors/index (`SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:19`)
- Resolution: Replace default package topology section in spec with recommendation default; retain transport-neutral and internal-client hard rules.

2. Boundary and workflow plugin default completeness conflict:
- Current file inventory omits explicit `operations/*` layer for API and workflow trigger plugins (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:266`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:268`)
- Recommendation makes operations explicit defaults (`SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:238`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:357`)
- Resolution: Merge by adding `operations/*` to canonical inventory/tree and examples.

## 5) Non-Conflict Carryover (Retain Canonical)
- Keep axes and hard-rule sections as normative backbone (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:40`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:213`).
- Keep detailed harness glue code (hq-router, adapter, server orpc/rawr) as canonical deep internals (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:275`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:295`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:433`, `SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:545`).
- Keep durable endpoint additive-only policy (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:196`).
- Keep optional helper section and explicitness guardrails (`SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md:615`).

## 6) Unique Carryover Candidates from Recommendation
1. Internal package code stack examples (domain/service/procedures/router/client/errors/index): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:40`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:65`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:119`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:189`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:220`
2. Boundary API `operations/*` snippets: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:272`
3. Workflow trigger operation snippet: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:381`
4. TypeBox standard-schema adapter package fixture: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:455`
5. `rawr.hq.ts` composition fixture: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:496`
6. Host mounting fixture (brief): `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:527`
7. Adoption exception + scale rule text: `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:547`, `SESSION_019c587a_ORPC_CONTRACT_ROUTER_INTEGRATED_RECOMMENDATION.md:551`

## 7) Do-Not-Rewrite Guardrail (for Implementation Phase)
- Patch only targeted sections in canonical spec.
- Preserve section numbering and axis/rule scaffolding.
- Do not replace deep harness blocks unless a specific conflicting rule requires it.
- Add recommendation material as precise inserts/replacements in Section 5 (implementation inventory) plus minimal rule additions.

## 8) Patch Sequencing Notes
- Update policy declarations first (adoption exception/scale rule).
- Update canonical inventory and file tree second (internal package + operations layers).
- Add required root fixtures third.
- Align E2E examples fourth.
- Update source anchors last.
