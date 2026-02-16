# Session 019c587a — Architecture Reconstruction Scratch (Decision-Complete)

## High-Level Overview
The session converged on a coherent architecture idea (package-authored capabilities + runtime-surface plugins + single composition authority in `rawr.hq.ts`), but convergence came through multiple reversals and quality resets. The latest proposal is directionally strong, but it is not implementation-ready without a concrete migration cut: code still reflects host-centric composition, only three plugin roots exist, and runtime tooling still depends on legacy metadata semantics (`templateRole`, `channel`, `publishTier`) that the landed proposal says to retire or demote.

This document reconstructs how we got here, clarifies what the final proposal actually says, and gives a practical landed-vs-today implementation diff plus a hard recommendation.

---

## 1) Source-of-Truth Lock

### Locked transcript source
- `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md`

### Locked canonical latest-proposal set (proposal worktree)
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/DECISIONS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`

### Locked “today codebase” set (primary worktree)
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/index.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/plugins.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md`
- `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md`

### Explicit divergence note (required)
`AXIS_03_END_TO_END_EXAMPLES.md` exists in both worktrees with materially different content:
- Primary: 418 lines, sha `bf91d43704d8da21973fec8724a9dcf4f406df1d`
- Proposal worktree: 721 lines, sha `2a1f9963e54462b17577bb6c4a64abc8ab2e64fd`

Interpretation default used in this reconstruction:
- Proposal-worktree version is canonical “latest endpoint”.
- Primary-worktree version is treated as divergence artifact.

---

## 2) Transcript Normalization and Deduping

- Prompt blocks detected: `84`
- Unique prompt bodies after exact dedupe: `42`
- Exact duplicates: `42`

Method:
- Deduped exact repeated prompt blocks to avoid double-counting pressure/signals.
- Kept only non-duplicate content changes as new input signal.

---

## 3) Question Lineage: Architectural Tension Map

## A) Composition authority and placement (`rawr.hq.ts` vs package/app composition)

What you asked:
- Directly rejected dual composition path; requested one standard (`rawr.hq.ts`) (`transcript.md:413`, `transcript.md:467`).
- Pressed on `packages` purity vs runtime composition in package trees (`transcript.md:395`, `transcript.md:449`).
- Asked whether composition layer beyond `rawr.hq.ts` is needed (`transcript.md:1722`, `transcript.md:1767`).

Why it mattered:
- Core simplification target: reduce capability hookup from 4-5 touchpoints to predictable minimum.
- Preserve template/personal boundaries and avoid hidden runtime ownership drift.

Core tension exposed:
- Config-as-code composition simplicity vs broad “packages are shared stuff” convenience.

## B) Plugin topology (surface-split vs capability-flat sparse)

What you asked:
- Proposed opposite topology: capability-root sparse plugin model (`transcript.md:648`, `transcript.md:719`).
- Requested explicit steward call, not “do later” deferral (`transcript.md:883`, `transcript.md:901`).
- Challenged incoherent mixing and thrash when domain/surface boundaries shifted (`transcript.md:2331`, `transcript.md:2462`).

Why it mattered:
- This is the biggest structural choice affecting growth model, lifecycle semantics, and sync/tooling complexity.

Core tension exposed:
- Capability colocation ergonomics vs operational clarity and lifecycle enforcement by runtime surface.

## C) Boundary integrity, overlap, and enforceability

What you asked:
- Called out overlapping plugin-type boundaries and asked how to reconcile them (`transcript.md:964`, `transcript.md:989`).
- Required first-principles simplification and removal of legacy assumptions (`transcript.md:1878`, `transcript.md:1918`).

Why it mattered:
- Architecture quality depends on machine-enforced boundaries, not prose-only intent.

Core tension exposed:
- Existing command/lifecycle behavior already leaks across boundary concepts, while proposal demands cleaner separation.

## D) Contract/schema/implementation semantics (oRPC, TypeBox, HTTP metadata)

What you asked:
- Repeatedly challenged contract placement and runtime meaning (`transcript.md:4881`, `transcript.md:4938`, `transcript.md:5205`).
- Asked schema-vs-contract distinction and “contract usefulness without implementation” (`transcript.md:5241`, `transcript.md:5310`).
- Pressed on HTTP metadata purity and where to pay that cost (`transcript.md:5346`, `transcript.md:5416`).

Why it mattered:
- This is the correctness core of the package/runtime split and determines testability, client generation, and drift risk.

Core tension exposed:
- Keep shared contracts in packages for reuse vs avoid runtime HTTP semantics in shared package layer.

## E) Example quality and concreteness demands

What you asked:
- Demanded executable examples and stable naming; rejected hand-wavy policy text (`transcript.md:1351`, `transcript.md:1504`).
- Explicitly rejected weak examples and demanded concrete code/rationale/implications (`transcript.md:4740`, `transcript.md:4788`).

Why it mattered:
- Proposal credibility depended on concrete end-to-end flow, not abstract policy bullets.

Core tension exposed:
- Policy-first architecture writeups were not enough for collaboration and trust.

## F) Spec-packet execution, governance, and simplification pressure

What you asked:
- Requested multi-axis peer-agent plan and integrated packet (`transcript.md:4043`, `transcript.md:4097`).
- Requested execution of that plan (`transcript.md:4354`, `transcript.md:4532`).

Why it mattered:
- Shift from architecture debate to governance artifact with explicit decisions, risks, and migrations.

Core tension exposed:
- “Decision-complete” packet ambition vs actual implementation readiness and legacy-system drag.

---

## 4) Assistant/Agent Response Evolution Map

| Phase | What was proposed | What changed from prior step | User feedback forcing pivot | Artifacts created/rewritten |
| --- | --- | --- | --- | --- |
| 1. Grounding | Proposal comprehension + skill grounding | N/A | Initial context-building ask | Early working notes |
| 2. Composition call | Single-path recommendation to root `rawr.hq.ts` (`transcript.md:504`) | Dropped dual-path language (`transcript.md:516`) | Strong “no dual paths” requirement (`transcript.md:413`) | Updated in-flight proposal doc |
| 3. Opposite topology analysis | Evaluated capability-flat sparse model | Added explicit steward decision toward surface-split (`transcript.md:914`) | “Make an actual steward call” (`transcript.md:883`) | Updated proposal narrative |
| 4. Boundary stress | Acknowledged existing boundary leakage (`transcript.md:1015`) | Moved from abstract to enforcement framing | Boundary-overlap pushback (`transcript.md:964`) | Additional boundary clarifications |
| 5. Canonical doc cycle | Created/rewrote consolidated recommendation doc | Multiple rewrites for examples, naming, and consistency | Repeated “too vague / too hand-wavy” feedback (`transcript.md:1351`, `transcript.md:1504`) | `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md` |
| 6. Thrash recovery | Re-committed “Locked Model” / “Committed Structure” (`transcript.md:2559`, `transcript.md:3852`) | Corrected topology drift and example choice | Strong consistency and coherence pushback (`transcript.md:2331`, `transcript.md:2462`) | Rewritten sections and examples |
| 7. Spec-packet orchestration | Parallel specialist synthesis into plan (`transcript.md:4140`..`transcript.md:4176`) | Shifted from single-doc to packet model | Explicit multi-axis packet request (`transcript.md:4043`) | Proposed packet doc set |
| 8. Spec-packet execution | Implemented packet docs (`transcript.md:4699`, `transcript.md:4705`) | Expanded into full axis docs + decisions | “Implement plan” asks (`transcript.md:4354`) | `FLAT_RUNTIME_SPEC_PACKET.md`, axis docs, `DECISIONS.md` |
| 9. Quality reset + semantic deep dive | Rewrote packet with rationale and concrete code (`transcript.md:4831`); clarified contract placement semantics (`transcript.md:4906`, `transcript.md:5147`, `transcript.md:5371`, `transcript.md:5441`) | Moved from assertion-heavy docs to code-first + explicit tradeoffs | “docs are lazy / examples weak” and contract skepticism (`transcript.md:4740`, `transcript.md:4788`, `transcript.md:4881+`) | Rewritten `AXIS_03`, rationale-oriented packet |

Net endpoint:
- Architecture message stabilized on package-authored capability core + surface-split runtime adapters + `rawr.hq.ts` composition authority.
- Execution state did not yet migrate primary code to that model.

---

## 5) Plain-English Decode of the Latest Proposal

## Intended model
- Author capability schemas/contracts/events/operations in `packages/*`.
- Expose runtime behavior via surface plugins (`plugins/api`, `plugins/workflows`, plus web/cli/agents/mcp as needed).
- Compose exactly once in `rawr.hq.ts`, then let hosts mount outputs.

Anchors:
- `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:36`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:45`
- `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:317`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:358`

## Hard rules (as written)
- Runtime roots are surface-split and include `api/workflows/web/cli/agents/(optional mcp)`.
- Runtime plugin-to-plugin imports are disallowed.
- `rawr.hq.ts` is the only multi-surface composition authority.
- `apps/*` should mount artifacts, not author cross-capability composition.

Anchors:
- `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:11`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:30`
- `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:46`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:50`

## Optional/deferred items
- Workflow-backed oRPC helper abstraction is deferred pending repeated boilerplate evidence.
- `publishTier/published` runtime role removal is deferred until release-policy centralization.

Anchors:
- `DECISIONS.md:14`
- `DECISIONS.md:15`

## Explicitly out of scope for this cycle
- Capability-root sparse plugin cutover now (explicitly not chosen now).
- Hot-reload runtime refresh and auto-discovery sophistication are deferred policy questions.

Anchors:
- `FLAT_RUNTIME_SPEC_PACKET.md:39`..`FLAT_RUNTIME_SPEC_PACKET.md:40`
- `AXIS_02_ARCHITECTURE_LIFECYCLE.md:82`..`AXIS_02_ARCHITECTURE_LIFECYCLE.md:84`

## Ambiguities still present
- How `rawr.capability` migrates into today’s tooling that currently reads `templateRole/channel/publishTier`.
- Exact compatibility bridge boundary during phased migration (where old and new semantics coexist, and for how long).
- Manual registration in phase 1 is explicit, but auto-discovery end-state is not specified.

Anchors:
- `DECISIONS.md:12`..`DECISIONS.md:15`
- `FLAT_RUNTIME_SPEC_PACKET.md:161`..`FLAT_RUNTIME_SPEC_PACKET.md:186`

---

## 6) Practical Landed-vs-Today Diff Matrix

| Area | Landed Proposal | Today | Gap | Action Type |
| --- | --- | --- | --- | --- |
| Composition authority | `rawr.hq.ts` as sole cross-surface assembly authority (`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`, `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:49`) | No `rawr.hq.ts` present; composition authored in server runtime files (`apps/server/src/index.ts:36`, `apps/server/src/rawr.ts:101`, `apps/server/src/orpc.ts:310`) | Manifest entrypoint does not exist in code; composition still fixture-centric | `Add` |
| Host fixture role | Hosts should mount manifest outputs only (`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:28`, `AXIS_04_SYSTEM_TESTING_SYNC.md:10`) | `registerRawrRoutes` creates runtime adapter + Inngest bundle + ORPC route registration directly (`apps/server/src/rawr.ts:101`..`apps/server/src/rawr.ts:118`) | Host is still composing capability runtime, not just mounting | `Change` |
| Runtime plugin roots | Surface roots include `plugins/api/*`, `plugins/workflows/*`, optional `plugins/mcp/*` (`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:12`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:18`) | Repo currently has only `plugins/cli`, `plugins/web`, `plugins/agents` (filesystem + docs) (`docs/SYSTEM.md:52`..`docs/SYSTEM.md:54`) | New runtime surfaces are not represented in code/discovery | `Add` |
| Server plugin discovery | Should be surface-aware and aligned with manifest lifecycle (`AXIS_04_SYSTEM_TESTING_SYNC.md:40`) | Loader is hardcoded to `plugins/web` (`apps/server/src/plugins.ts:119`) | Discovery model mismatches landed surface model | `Change` |
| ORPC contract composition placement | Package contracts + plugin implementations + manifest assembly (`FLAT_RUNTIME_SPEC_PACKET.md:34`..`FLAT_RUNTIME_SPEC_PACKET.md:36`, `FLAT_RUNTIME_SPEC_PACKET.md:95`) | Root HQ contract lives in `packages/core/src/orpc/hq-router.ts` and server registers handlers directly (`packages/core/src/orpc/hq-router.ts:5`, `apps/server/src/orpc.ts:104`) | No manifest-driven composition boundary in implementation | `Reshuffle` |
| Inngest workflow composition | Workflow plugins register and manifest aggregates functions (`AXIS_01_TECH_CORRECTNESS.md:41`) | Coordination-specific function bundle created in host path (`apps/server/src/rawr.ts:105`) | Workflow composition remains capability-hardcoded in host flow | `Change` |
| Metadata semantics (runtime) | Required runtime metadata should be `rawr.kind` + `rawr.capability` (`DECISIONS.md:12`, `FLAT_RUNTIME_SPEC_PACKET.md:123`) | Tooling/docs currently rely on `templateRole/channel/publishTier` (`docs/system/PLUGINS.md:75`..`docs/system/PLUGINS.md:78`; `packages/hq/src/workspace/plugins.ts:10`..`packages/hq/src/workspace/plugins.ts:12`) | Proposed metadata contract not implemented; legacy semantics are operationally active | `Change` |
| Runtime gating behavior | Legacy fields should not drive runtime architecture semantics (`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:32`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:34`) | Enable flow blocks on `templateRole` unless override (`plugins/cli/plugins/src/commands/plugins/web/enable.ts:71`) | Runtime behavior still coupled to legacy metadata semantics | `Remove` |
| Channel-based install-state semantics | `channel` should be distribution/routing metadata, not capability/runtime ownership (`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:33`) | Channel currently determines Channel A management behavior (`packages/hq/src/install/state.ts:129`, `packages/hq/src/install/state.ts:157`) | Need explicit split between distribution policy vs runtime architecture semantics | `Change` |
| Import boundary enforcement | CI/lint should block plugin-to-plugin runtime imports (`AXIS_04_SYSTEM_TESTING_SYNC.md:30`, `AXIS_04_SYSTEM_TESTING_SYNC.md:65`) | No implemented boundary guard found in current source set | Architectural boundary currently prose-first | `Add` |
| Manifest/test enforcement | Required checks: manifest-smoke, host-composition-guard, metadata-contract (`AXIS_04_SYSTEM_TESTING_SYNC.md:63`..`AXIS_04_SYSTEM_TESTING_SYNC.md:67`) | Current implementation has no manifest artifact to validate | Missing enforcement substrate for landed model | `Add` |
| Doc model consistency | Docs should reflect manifest-first + expanded surface model (`AXIS_02_ARCHITECTURE_LIFECYCLE.md:74`..`AXIS_02_ARCHITECTURE_LIFECYCLE.md:79`) | Primary docs still define three-root model + legacy role metadata (`docs/SYSTEM.md:50`..`docs/SYSTEM.md:54`; `docs/system/PLUGINS.md:66`..`docs/system/PLUGINS.md:78`) | Current docs describe the pre-cutover architecture | `Change` |
| Spec packet consistency | Canonical endpoint should be singular | `AXIS_03` diverges across worktrees (418 vs 721 lines, different shas) | Reviewers can read different “truths” depending on location | `Reshuffle` |

---

## 7) Critical Pass (Do Not Assume Current Landing Is Automatically Correct)

## What We Don’t Need
1. Dual composition authorship (manifest + host-authored composition).
Impact: removes ambiguity for agents; hosts become thinner; debugging path becomes predictable.

2. Runtime behavior tied to `templateRole/channel` semantics.
Impact: reduces conceptual overload for plugin authors and removes policy/runtime conflation.

3. Parallel/stale proposal artifacts treated as equivalent truth.
Impact: prevents re-litigation loops and contradictory implementation guidance.

## What We Need But Are Missing
1. Real `rawr.hq.ts` + typed manifest contract implementation in primary worktree.
Impact: gives a concrete integration boundary for code and tests.

2. Concrete runtime registration interfaces per surface (`api/workflows/web/cli/agents/mcp`) and loader upgrades.
Impact: avoids ad-hoc host composition for each new capability.

3. Migration bridge with explicit cutoff criteria for legacy metadata fields.
Impact: avoids breaking existing workflows while still converging on simplified semantics.

4. Enforcement layer (import-boundary lint + metadata-contract validator + host-composition-guard).
Impact: turns architecture into enforced behavior instead of best-effort docs.

## Legacy/Confusing Paths To Remove
1. Host-authored coordination-specific runtime composition in `apps/server/src/rawr.ts` + `apps/server/src/orpc.ts`.
Impact: removes hidden composition logic from fixtures and aligns ownership.

2. Hardcoded server plugin discovery at `plugins/web` only.
Impact: enables planned surface expansion without custom wiring each time.

3. Runtime role gating based on `templateRole` in enable command path.
Impact: separates release posture decisions from runtime architecture decisions.

4. Duplicate/stale `AXIS_03` copy in primary when proposal worktree is canonical for this endpoint.
Impact: avoids conflicting example guidance.

## Simplifications That Preserve Robustness/Flexibility/Power
1. Keep one composition authority, but allow modularized capability subfiles imported by `rawr.hq.ts`.
Impact: preserves single authority while keeping file size manageable.

2. Keep service logic in packages + thin runtime adapters in plugins.
Impact: maximizes reuse and testability without coupling package layer to runtime frameworks.

3. Keep surface-split runtime roots in this cycle, but group and report by `rawr.capability` in tooling.
Impact: preserves operational clarity while improving capability-level cognition.

4. Adopt explicit manual registration for phase 1 only, with later discovery gate tied to measurable pain.
Impact: safer migration now; avoids premature indirection.

---

## 8) Work Estimate by Complexity/Churn/Scope (No Time Estimates)

| Gap Item | Complexity | Churn | Scope | Dependency Notes |
| --- | --- | --- | --- | --- |
| Add `rawr.hq.ts` manifest shell in primary | Medium | Medium | Structural | Foundation for all subsequent cutover work |
| Refactor hosts to mount manifest outputs only | High | Large | Cross-cutting | Depends on manifest shell and adapter registration contract |
| Introduce `plugins/api` + `plugins/workflows` (and optional `mcp`) roots + baseline scaffolding | Medium | Medium | Structural | Can start in parallel with manifest shell |
| Move coordination runtime composition from host into plugin-adapter + manifest flow | High | Large | Cross-cutting | Depends on new roots and manifest contract |
| Update plugin discovery/loaders for expanded surfaces | High | Large | Cross-cutting | Depends on root additions |
| Metadata contract migration (`templateRole/channel/publishTier` -> `rawr.kind/rawr.capability`) | Very High | Very Large | Cross-cutting | Needs compatibility mode and release-governance coordination |
| Remove runtime blocking on `templateRole` in enable path | Medium | Small | Localized | Can be done early if backward compatibility is preserved |
| Add import-boundary lint for plugin-to-plugin runtime imports | Medium | Small | Localized | Should land before broad migration to prevent regressions |
| Add manifest-smoke + host-composition-guard + metadata-contract CI checks | Medium | Medium | Cross-cutting | Depends on manifest existence |
| Update docs/runbooks to manifest-first and new surfaces | Medium | Large | Cross-cutting | Best after initial code cutover to avoid doc drift |
| Resolve duplicate `AXIS_03` canonicality | Low | Small | Localized | Immediate hygiene step |
| Decide deferred helper abstraction (workflow-backed oRPC wrapper) based on evidence threshold | Medium | Small | Localized | Post-migration optimization, not phase-1 blocker |

### Dependency ordering (what should happen first)
1. Establish canonical source of truth and remove duplicate spec ambiguity.
2. Add `rawr.hq.ts` + minimal manifest contract in primary.
3. Add runtime-surface roots and plugin registration contracts.
4. Refactor host composition to mount manifest outputs.
5. Add enforcement checks (import boundary, manifest smoke, host guard).
6. Execute metadata migration bridge and retirement plan.
7. Finish docs/runbook realignment and close deferred decisions when evidence threshold is met.

---

## 9) Standalone Assessment: Is This the Right Direction?

Verdict: **Yes, with changes.**

Reasoning:
- The landed model directly addresses your strongest repeated tensions: single composition authority, reduced touchpoints, clearer runtime boundaries, and stronger AI-agent pathing.
- But in its current state it is still mostly a target architecture packet. The primary codebase and operational tooling remain materially pre-cutover.
- To be “the right direction” in practice, it must be accompanied by a strict migration cut that resolves metadata semantics, loader behavior, and host composition ownership in code.

### Trade-off table

| Decision | Gain | Give Up | Concrete Example |
| --- | --- | --- | --- |
| Keep surface-split plugin roots | Cleaner lifecycle semantics by runtime type | Less one-folder capability colocation | `plugins/api/*` and `plugins/workflows/*` stay separate instead of one capability-root tree |
| Make `rawr.hq.ts` single composition authority | One reviewable wiring surface for agents/humans | Need explicit registration or discovery discipline | Host no longer instantiates runtime composition directly in `apps/server/src/rawr.ts` |
| Keep contracts/logic in packages | Reuse across API/workflows/CLI and better drift resistance | Some package artifacts carry API-shape metadata decisions | oRPC contract in package shared by multiple runtime adapters |
| Disallow plugin-to-plugin runtime imports | Prevent hidden coupling and transitive runtime fragility | Requires moving reusable helpers into package layer | API plugin uses package events/contracts, not workflow plugin internals |
| Minimize runtime metadata semantics | Reduced concept overload and ambiguity | Requires significant migration of existing tooling and docs | `templateRole/channel/publishTier` no longer drive runtime architecture behavior |
| Manual manifest registration first cut | Safer deterministic migration | Slightly more up-front wiring work | `rawr.hq.ts` explicit registration before auto-discovery is revisited |

---

## 10) Acceptance / Rejection Criteria

## Accept this direction if
1. `rawr.hq.ts` exists in primary and is the only multi-surface composition authority.
2. `apps/server` mounts manifest outputs and stops authoring capability composition.
3. Runtime roots + loaders/tooling support the target surface model.
4. Metadata semantics are explicitly bridged and legacy runtime coupling has a closure plan.
5. CI enforces manifest presence, import boundaries, and host composition guardrails.

## Reject or pause this direction if
1. Composition remains split between host fixtures and manifest.
2. Legacy metadata still silently drives runtime architecture behavior with no closure plan.
3. New root model is documented but not wired in code/tooling.
4. Canonical source remains ambiguous (e.g., divergent axis docs continue unchecked).

---

## 11) Evidence Index

## Transcript anchors (selected)
- No-dual-path requirement: `transcript.md:413`, `transcript.md:467`
- Root-manifest recommendation: `transcript.md:504`, `transcript.md:516`
- Steward topology call: `transcript.md:914`
- Boundary leakage acknowledgement: `transcript.md:1015`
- Locked/committed structure markers: `transcript.md:2559`, `transcript.md:3852`
- Spec-packet orchestration and proposal: `transcript.md:4140`..`transcript.md:4176`
- Spec-packet execution: `transcript.md:4699`, `transcript.md:4705`
- Quality rewrite acknowledgement: `transcript.md:4831`
- Contract-boundary clarifications: `transcript.md:4906`, `transcript.md:5147`, `transcript.md:5371`, `transcript.md:5441`, `transcript.md:5566`

## Landed proposal anchors (selected)
- Locked decisions and hard boundaries: `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:11`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:50`
- Composition authority and migration guidance: `FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:317`..`FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:457`
- Manifest contract + metadata + migration phases: `FLAT_RUNTIME_SPEC_PACKET.md:44`..`FLAT_RUNTIME_SPEC_PACKET.md:186`
- Decision register and deferred items: `DECISIONS.md:11`..`DECISIONS.md:15`

## Current-state anchors (selected)
- Host-centric composition path: `apps/server/src/index.ts:36`, `apps/server/src/rawr.ts:101`..`apps/server/src/rawr.ts:118`, `apps/server/src/orpc.ts:310`
- Web-only server plugin loader: `apps/server/src/plugins.ts:119`
- Current plugin roots/docs model: `docs/SYSTEM.md:50`..`docs/SYSTEM.md:54`, `docs/system/PLUGINS.md:66`..`docs/system/PLUGINS.md:70`
- Legacy runtime metadata semantics in docs/tooling: `docs/system/PLUGINS.md:75`..`docs/system/PLUGINS.md:78`, `packages/hq/src/workspace/plugins.ts:10`..`packages/hq/src/workspace/plugins.ts:12`, `plugins/cli/plugins/src/commands/plugins/web/enable.ts:71`

---

## 12) Explicit Unknowns (Not Papered Over)
1. Exact backward-compat window and sunset mechanism for `templateRole/channel/publishTier` in operational tooling.
2. Whether phase-2 should remain manual registration or move to constrained discovery, and what objective threshold triggers that change.
3. Whether workflow-backed oRPC helper abstraction should be introduced after evidence threshold (`DECISIONS.md:14`) or replaced by generation/scaffolding patterns.

These unknowns are implementation-impacting and should remain visible until resolved in the decision register.

---

## Counter-Argument Review (Agent Challenge Pass)

### 1) Executive Verdict (5-10 lines)
- **Verdict:** direction is broadly valid but currently **over-scoped and under-specified at the seam between policy and implementation**.
- **Observed:** target docs lock a single composition authority in `rawr.hq.ts` (`docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:6`, `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:35`), while today-state code still composes in hosts (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`).
- **Observed:** the contract-placement model (contracts in packages, implementation in runtime adapters) is already consistent with today-state and proposal examples (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:1`, `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:306`, `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:401`).
- **Inferred:** the current packet risks over-engineering by requiring full manifest surfaces (`web/cli/agents/mcp`) before there is concrete registration/lifecycle behavior.
- **Inferred:** the minimum viable cut to lock now is: `rawr.hq.ts` for ORPC+Inngest assembly only, package-level capability contracts by default, and strict host-composition guardrails.
- **Inferred:** template-as-SDK/package should be treated as a later strategic option, not a phase-1 implementation dependency.

### 2) Decision Challenge Table

| Current Decision | Status | Why | Evidence | Replacement (if any) | Do now vs later |
| --- | --- | --- | --- | --- | --- |
| `rawr.hq.ts` is sole composition authority across all surfaces immediately | **Revise** | Correct target, but too broad for first cut; today-state has no manifest and only server composition paths | `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310` | Narrow phase-1 manifest scope to ORPC+Inngest; add explicit host guard CI before adding additional surfaces | **Now:** narrow + enforce. **Later:** expand manifest sections as surface registries harden |
| Runtime metadata minimum is `rawr.kind` + `rawr.capability` | **Revise** | Simplicity is good, but capability semantics/cardinality are not yet explicit enough for operators/tooling | `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:123`; `docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md:70`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:43` | Add normative capability semantics: one capability may map to many surface plugins; define enable/disable expectations | **Now:** define semantics. **Later:** automate validation reporting by capability |
| Keep contracts/logic in packages, runtime adapters in plugins | **Keep** | Best balance of reuse, testability, and boundary integrity | `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:34`; `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:6`; `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:306` | N/A | **Now:** lock as default rule |
| Make API plugins the default contract owner for shared capability APIs | **Reject** | Collapses definition/reuse boundary into runtime adapter boundary and increases coupling/drift risk | `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:4900`; `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:642`; `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:721` | Keep shared contracts in `packages/<capability>/src/orpc/*`; allow plugin-owned only for plugin-private endpoints | **Now:** reject as default |
| Support dual-contract model (`internal` + `public`) | **Defer** | Useful when views diverge, but defaulting to two contracts increases drift surface and ceremony | `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:645`; `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:719`; `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5445` | Default one contract per capability; allow dual contracts only with explicit divergence trigger + drift checks | **Now:** single-contract default. **Later:** dual-model when criteria met |
| Workflow-backed ORPC helper deferred pending repetition | **Keep** | Correct anti-premature-abstraction call | `docs/system/spec-packet/DECISIONS.md:14` | N/A | **Now:** keep deferred |
| Convert template to SDK/package as part of this cycle | **Defer** | Current system contracts and governance are local-first/template-baseline, not yet SDK-stable | `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md:9`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md:40`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:100` | Define SDK readiness gate and decide after manifest/metadata stabilization | **Now:** do not convert. **Later:** evaluate against explicit readiness criteria |

### 3) Deep-Dive Findings

#### rawr.hq.ts necessity and capability semantics
- **Direct answer:** `rawr.hq.ts` is not inherently necessary for today-state runtime behavior, but it is necessary as a **single enforceable policy surface** if the target model (multi-surface adapters + host-thin mounting) is to be real rather than advisory.
- **Strongest counter-argument:** we already have working composition in host/runtime files and a package-level root contract (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`), so adding `rawr.hq.ts` can become extra indirection without new capability.
- **Observed evidence:** proposal says “compose only in `rawr.hq.ts`” (`docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:35`), but current hosts compose directly (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`).
- **Inferred recommendation/final call:** keep `rawr.hq.ts`, but reduce v1 scope to ORPC+Inngest only and require `host-composition-guard` before expanding to `web/cli/agents/mcp`.
- **Criteria for reconsideration:**
  - Re-open removal only if, for 2 consecutive releases, no new surface adapters are added and host composition remains stable in one place.
  - Re-open expansion only when each added surface has a concrete registration contract and lifecycle command coverage.

#### oRPC contract placement and dual-model viability
- **Direct answer:** capability contracts should remain package-level by default; plugin-level contract ownership is acceptable only for plugin-private endpoints.
- **Strongest counter-argument:** API boundaries are runtime boundaries, so contracts “belong” with API plugins, and package contracts can leak HTTP semantics (`/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5347`).
- **Observed evidence:** packet examples explicitly separate package contract (`@orpc/contract`) from runtime implementation (`@orpc/server`) (`docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:306`, `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:401`); transcript concerns emphasize contract usefulness, harnessing, and purity tradeoffs (`/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:4900`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5206`, `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5417`).
- **Inferred recommendation/final call:** keep package-owned contracts as baseline, allow optional dual-contract pattern only when public/internal views truly diverge and drift checks are added.
- **Criteria for reconsideration:**
  - Adopt dual-model only if at least one capability has materially different public vs internal procedure surface and OpenAPI mapping cannot be represented cleanly in one contract.
  - Allow plugin-owned contracts only if contract consumers are intentionally confined to that plugin boundary.

#### Template-as-SDK/package strategy
- **Direct answer:** this is a **later** decision, not a now decision.
- **Strongest counter-argument:** packaging template code as SDK could reduce fork maintenance and give cleaner import boundaries across template/personal split.
- **Observed evidence:** current docs explicitly frame template as baseline/fixture with local-first plugin posture, not package distribution as primary model (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md:40`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:100`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:106`); user raised SDK-adjacent concern but not as settled choice (`/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:1518`).
- **Inferred recommendation/final call:** do not convert this cycle; formalize an internal SDK boundary first (manifest type + stable package exports), then decide external packaging with readiness criteria.
- **Criteria for reconsideration:**
  - Release policy centralization is complete (aligned with `DECISIONS.md:15` closure criterion).
  - Manifest/metadata contracts stay stable for at least two releases.
  - Downstream repos repeatedly need reusable imports that sync/runbook workflows cannot satisfy without high churn.

### Concrete Before/After Illustrations

1. **Decision label:** Move composition authority out of host files and into one manifest file.
   - **Before (today files/flow):**
     - `apps/server/src/rawr.ts` creates runtime adapter + Inngest bundle and calls ORPC registration (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`).
     - `apps/server/src/orpc.ts` builds router/handlers and mounts `/rpc`, `/api/orpc`, `/api/orpc/openapi.json` (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310`).
   - **After (proposed files/flow):**
     - `rawr.hq.ts` assembles plugin registrations and exports ORPC/Inngest artifacts (`docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:317`).
     - host file mounts manifest outputs only; no per-capability assembly logic (`docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:360`).
   - **Why this matters now:**
     - Without this move, each new capability still requires host edits, so “single composition authority” remains a document claim rather than an enforced behavior.

2. **Decision label:** Keep capability contracts in packages; keep runtime binding in adapters/plugins.
   - **Before (today files/flow):**
     - shared HQ contract is package-owned in `packages/core/src/orpc/hq-router.ts` (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`).
     - server runtime implements and mounts handlers in `apps/server/src/orpc.ts` (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`).
   - **After (proposed files/flow):**
     - capability package owns contract (`packages/<capability>/src/orpc/contract.ts`) (`docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:178`).
     - API plugin implements that contract and handles boundary concerns (`docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:214`).
     - `rawr.hq.ts` composes capability contracts into HQ router (`docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:336`).
   - **Why this matters now:**
     - This keeps test/client/composition imports stable while still keeping runtime concerns (auth/context/mounting) out of package business logic.

3. **Decision label:** Define what `rawr.capability` drives now vs later.
   - **Before (today files/flow):**
     - current runtime docs are plugin-root oriented (`plugins/web/*`) and operational commands are keyed around plugin IDs (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:43`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md:63`).
     - metadata contract still includes legacy fields (`templateRole`, `channel`, `publishTier`) in docs (`/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:74`).
   - **After (proposed files/flow):**
     - spec requires runtime metadata minimum `rawr.kind` + `rawr.capability` and capability-oriented reporting/checks (`docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:123`, `docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md:70`).
     - legacy fields stop driving runtime behavior (`docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md:25`).
   - **Why this matters now:**
     - If `rawr.capability` semantics are not explicit, enable/disable, sync status, and lifecycle checks will remain inconsistent across surfaces even after refactors.

### 4) Complexity Pruning List

#### Remove now
- Treating full-surface manifest (`web/cli/agents/mcp`) as phase-1 requirement.
  - Impact: cuts initial migration blast radius; focuses on ORPC+Inngest where today-state already exists.
  - Affected surfaces: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:95`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`.
- Any written guidance that permits host-authored cross-surface composition after manifest introduction.
  - Impact: prevents dual-authority drift.
  - Affected surfaces: `docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md:10`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`.
- Using dual-contract examples as implicit default for all capabilities.
  - Impact: lowers ceremony and drift risk for common cases.
  - Affected surfaces: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:645`.

#### Defer safely
- Workflow-backed ORPC helper abstraction.
  - Impact: avoids premature shared wrapper complexity.
  - Affected surfaces: `docs/system/spec-packet/DECISIONS.md:14`.
- External template-as-SDK packaging decision.
  - Impact: avoids mixing release governance work into architecture cutover.
  - Affected surfaces: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:100`.
- Auto-discovery/hot-reload composition behavior.
  - Impact: keeps cutover deterministic while boundaries are being enforced.
  - Affected surfaces: `docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md:82`.

#### Not needed at all
- Dual composition authority (manifest + host fixture composition as co-equal models).
  - Impact: permanently removes ambiguous wiring path.
  - Affected surfaces: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:35`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310`.
- Runtime semantics driven by `templateRole`/`channel`/publish posture fields.
  - Impact: removes semantic overload and policy/runtime conflation.
  - Affected surfaces: `docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md:17`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:74`.

### 5) Simplified Alternative Architectures (max 2)

#### Alternative A: Minimal Manifest Spine (preferred)
Model: introduce `rawr.hq.ts` as a narrow manifest that composes only ORPC+Inngest outputs, with host fixtures mounting those outputs and no additional composition logic; leave web/cli/agents/mcp manifest sections as explicit non-goals for phase 1. This simplifies migration and enforcement because it matches today’s strongest existing runtime paths while still locking single-authority composition. It sacrifices immediate “full-surface symmetry” in the manifest shape. Migration implication: smaller first cut, faster host cutover, clearer CI guard introduction. Preferred over current broad model because it preserves architecture direction while reducing phase-1 complexity debt.

#### Alternative B: Boundary-Local Contract Ownership
Model: keep contracts in API plugins (packages keep schemas/services only), and treat package-level artifacts as implementation-only primitives. This simplifies local plugin authoring and can reduce package-level HTTP metadata debates. It sacrifices cross-surface contract sharing, no-network contract harness portability, and boundary integrity around plugin-to-plugin imports; it also raises drift risk if internal/public views proliferate. Migration implication: easier short-term plugin edits, harder long-term consistency and client/test reuse. Not preferred over current direction because it undermines the package-as-shared-capability boundary that the session repeatedly converged toward.

### 6) Prework / Research Needed Before Final Implementation Plan
- **Blocked decision:** capability semantics and enablement cardinality (`rawr.capability` across surfaces).
  - Owner-role: Runtime composition owner + plugin lifecycle owner.
  - Artifact: short decision note with normative rules and 3 worked examples (single-surface capability, multi-surface capability, disabled capability).
- **Blocked decision:** manifest v1 contract scope and enforcement behavior.
  - Owner-role: Platform architecture steward.
  - Artifact: `RawrHqManifest-v1` spec + `host-composition-guard` test contract (pass/fail examples).
- **Blocked decision:** oRPC dual-contract trigger policy.
  - Owner-role: API platform owner.
  - Artifact: contract placement policy note defining when `contract.internal.ts`/`contract.public.ts` is allowed and required drift checks.
- **Blocked decision:** template-as-SDK now vs later.
  - Owner-role: Release governance owner + cross-repo workflow owner.
  - Artifact: SDK readiness checklist with binary go/no-go gates tied to `DECISIONS.md:15` closure criteria.

### 7) Final Steward Recommendation
- **Recommended path:** take Alternative A (Minimal Manifest Spine), enforce single composition authority for ORPC+Inngest immediately, and keep package-owned capability contracts as default with plugin adapters implementing runtime semantics.
- **What we lock now:** `rawr.hq.ts` is the only cross-surface composition location for phase-1 runtime (ORPC+Inngest), and host fixtures stop composing capabilities directly.
- **What we explicitly do not decide now:** external template-as-SDK/package conversion and default dual-contract (`internal/public`) rollout remain deferred until explicit readiness/trigger criteria are met.
