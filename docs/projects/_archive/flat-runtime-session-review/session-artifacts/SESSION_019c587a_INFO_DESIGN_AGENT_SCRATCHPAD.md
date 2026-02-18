# SESSION_019c587a Info Design Agent Scratchpad

## Objective Calibration
- Primary objective (user-corrected): redesign information architecture for a standalone, portable canonical spec.
- Secondary objective: improve implementation clarity as a consequence, without converting the packet into execution-planning workflow docs.
- Guardrail: no canonical policy rewrites in this pass; analysis/proposal artifacts only.

## Skill and Workflow Context Loaded
- `~/.codex-rawr/skills/information-design/SKILL.md`
- `~/.codex-rawr/skills/information-design/references/where-defaults-hide.md`
- `~/.codex-rawr/skills/information-design/references/axes.md`
- `~/.codex-rawr/skills/information-design/references/principles.md`
- `~/.codex-rawr/skills/information-design/references/multi-artifact.md`
- `~/.codex-rawr/skills/information-design/references/examples.md`
- `~/.codex-rawr/prompts/info-assess.md`
- `~/.codex-rawr/prompts/info-reshape.md`
- `~/.codex-rawr/prompts/info-critique.md`

## Corpus Read (Required Scope)
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/*.md`
- `docs/projects/flat-runtime-session-review/orpc-ingest-spec-packet/examples/*.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ORPC_INNGEST_WORKFLOWS_POSTURE_SPEC.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_ROUTE_DESIGN_API_SURFACE_REVIEW.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_INTEGRATION_CHANGELOG.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_D008_D010_CLOSURE_FINAL_REVIEW.md`

## Structural Telemetry (Quick Quantitative Pass)

| File | Total lines | Code lines | H2 count | Notes |
| --- | ---:| ---:| ---:| --- |
| `ORPC_INGEST_SPEC_PACKET.md` | 162 | 36 | 14 | Strong hub, but high policy repetition. |
| `DECISIONS.md` | 139 | 0 | 5 | Good decision ledger, mixed canonical + session chronology. |
| `AXIS_07_HOST_HOOKING_COMPOSITION.md` | 349 | 195 | 16 | High detail; dense and implementation-anchored. |
| `AXIS_08_WORKFLOWS_VS_APIS_BOUNDARIES.md` | 280 | 126 | 14 | Rich policy surface, repeated route/caller matrices. |
| `E2E_01_BASIC_PACKAGE_PLUS_API_BOUNDARY.md` | 600 | 394 | 9 | Mostly code; narrative is concise and useful. |
| `E2E_02_API_PLUS_WORKFLOWS_COMPOSED_CAPABILITY.md` | 646 | 471 | 9 | Mostly code; same policy reminders repeated. |
| `E2E_03_MICROFRONTEND_API_WORKFLOW_INTEGRATION.md` | 643 | 411 | 9 | Strong matrix clarity; still heavy code footprint. |
| `E2E_04_CONTEXT_AND_MIDDLEWARE_REAL_WORLD.md` | 1078 | 872 | 10 | Valuable but very code-heavy for canonical portability. |

Corpus total: 5,361 lines. Examples consume most volume and are code-dominant.

## Raw Information-Design Observations

### What Is Strong
1. Explicit scope framing appears consistently (`In Scope`, `Out of Scope`).
2. Policy style is stable (`Canonical Policy`, `Why`, `Trade-Offs`, `References`, `Cross-Axis Links`).
3. Caller/auth route semantics are richly documented and usually table-driven.
4. Decision IDs (D-005..D-012) create durable traceability.
5. `ORPC_INGEST_SPEC_PACKET.md` acts as a practical index/hub.

### Structural Friction
1. Normative text is duplicated across packet root, posture overview, axes, and examples.
2. Several docs can be interpreted as canonical at once (packet root, posture overview, decision file, some session reviews).
3. Temporal artifacts (changelog/review notes) sit beside timeless policy material with weak role boundaries.
4. Absolute local-path references reduce portability (`/Users/...` anchors).
5. Example docs are strong as reference but too code-heavy to function as canonical portable spec slices.
6. Repeated matrices and repeated “locked policy” prose increase noise and version-drift risk.

### Principle-Level Diagnosis (from `information-design`)
- `Signal-to-noise`: violated in canonical context by repeated policy restatements and session-adjacent text.
- `Hierarchy as meaning`: partially strong (axis split), partially weak (normative center split across many files of similar prominence).
- `Information scent`: generally strong at heading level; weaker at system level because role boundaries between canonical/reference/history are not explicit enough.
- `Chunking`: strong within files; weaker across files due overlap and repeated cross-cutting sections.
- `Standalone-yet-coherent` (multi-artifact): coherence exists via links, but “standalone canonical core” is not singularly obvious.

### Portability-Specific Pain Points
1. Portable reader cannot quickly determine “what is normative, what is example, what is session history.”
2. Canonical copy-out into another repo would carry local-worktree anchors and session-era docs that are not target-state spec.
3. Canonical invariants are split and repeated instead of sourced once and referenced.

## Candidate IA Directions Considered

### Option A: Keep current files, add only stronger index pages
- Pros: minimal movement.
- Cons: does not solve canonical center ambiguity; duplication remains.

### Option B: Layered packet model (selected)
- One primary canonical spec core.
- Axis docs repositioned as normative annexes (delta-by-axis, not policy restatement mirrors).
- E2E docs explicitly non-normative reference implementations.
- Session/changelog/review docs explicitly historical provenance.
- Pros: portable, role-clear, low ambiguity.
- Cons: requires editorial migration effort and cross-reference normalization.

## Selected Direction
- Choose layered packet model (Option B).
- Preserve current policy intent and artifact content, but reclassify and restructure for stronger canonical portability.

## Key Recommendation Seeds (for final docs)
1. Declare explicit document roles: `Normative Core`, `Normative Annex`, `Reference Example`, `Historical Provenance`.
2. Consolidate invariant statements into one authoritative canonical section; replace repeats with links.
3. Split code-heavy examples into narrative-first sections plus code appendices (non-normative by default).
4. Remove absolute local-path dependency from portable canonical text.
5. Add conformance checklist for canonical-spec portability + implementation clarity.

