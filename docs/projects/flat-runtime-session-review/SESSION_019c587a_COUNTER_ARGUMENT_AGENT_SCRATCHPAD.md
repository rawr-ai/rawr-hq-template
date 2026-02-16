# SESSION_019c587a Counter-Argument Agent Scratchpad

## Execution Log
- 2026-02-16: Verified scoped worktree path and branch.
  - `pwd`: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
  - branch: `docs/flat-runtime-proposal`
- 2026-02-16: Opened source-of-truth packet.
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_COUNTER_ARGUMENT_REVIEW_AGENT_PACKET.md`
- 2026-02-16: Created verbatim plan artifact (copied packet verbatim).
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_COUNTER_ARGUMENT_AGENT_PLAN_VERBATIM.md`
- 2026-02-16: Appended initial counter-argument review section into main scratch doc.
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`
- 2026-02-16: Applied wording-clarity refinement with explicit before/after operational illustrations.
  - Added subsection: `Concrete Before/After Illustrations`
  - File: `docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`
- 2026-02-16: Added explicit `Reject` decision row so major recommendations cover Keep/Revise/Reject/Defer states.
  - File: `docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`

## Required Upfront Introspection Phase

### A) Required stack skills
- [x] `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- [x] `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- [x] `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- [x] `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`

### B) Repo-navigation/architecture skills
- [x] `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
- [x] `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
- [x] `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`

### C) Repo routing/process docs
- [x] `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md`
- [x] `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/GRAPHITE.md`
- [x] `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/RUNBOOKS.md`

## Evidence Map (Live)
- Introspection complete before substantive analysis.
- Skill constraints and routing guardrails:
  - Observed: oRPC skill defines contract-first as first-class artifact and dual transports from one procedure set (RPC + OpenAPI), with contract/implementation/transport separation.
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:13`
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md:50`
  - Observed: Elysia guidance requires fetch/mount interop and warns body parsing can break forwarded handlers unless parse is disabled.
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md:137`
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md:157`
  - Observed: Inngest guidance frames durable execution and step-boundary/idempotency requirements; relevant to architecture responsibility boundaries.
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md:38`
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md:52`
  - Observed: TypeScript guidance prioritizes boundary-first design, explicit invariant encoding, consistent error strategy, and incremental refactor seams.
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:30`
    - Evidence: `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md:45`
- Repo/process guardrails:
  - Observed: Template is upstream baseline; downstream HQ owns personal customization. Command surfaces must not be mixed.
    - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md:9`
    - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md:16`
  - Observed: Graphite is required and branch/stack operations should remain Graphite-first.
    - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md:22`
    - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/GRAPHITE.md:7`
  - Observed: Runbooks index is canonical CLI/plugin workflow entrypoint and reasserts command-surface separation.
    - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/RUNBOOKS.md:3`
    - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/RUNBOOKS.md:39`
- Primary analysis targets (from packet):
  - Transcript evidence: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md`
  - Proposal docs in scoped proposal worktree: `docs/system/*` and `docs/system/spec-packet/*`
  - Today-state code/docs in primary worktree (read-only evidence): server runtime files + system docs listed in packet.

## Claim Ledger (Observed vs Inferred)
- Challenge area 1: `rawr.hq.ts` necessity + capability semantics
  - Observed:
    - Proposal/spec repeatedly treat `rawr.hq.ts` as sole composition authority.
      - Evidence: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:6`
      - Evidence: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:35`
    - Current primary runtime has no `rawr.hq.ts`; composition is host-authored in `apps/server/src/rawr.ts` + `apps/server/src/orpc.ts`.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
    - Current ORPC root composition already exists (in package `core`) independent of manifest.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
    - Current server plugin loader is single-surface (`plugins/web`) and therefore not manifest-driven multi-surface composition.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/plugins.ts:119`
  - Inferred:
    - `rawr.hq.ts` adds net value only if it becomes enforceable policy artifact (CI + host-composition guard), not if it is another optional assembly file.
    - Capability semantics are under-specified: docs define `rawr.capability` but do not yet specify invariant cardinality across surfaces (1 capability -> many plugins).

- Challenge area 2: oRPC contract placement + dual-model viability
  - Observed:
    - Proposal chooses package-level oRPC contracts and runtime plugin implementations.
      - Evidence: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:19`
      - Evidence: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:306`
      - Evidence: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:401`
    - Proposal explicitly introduces dual-contract pattern (`contract.internal.ts` RPC-only and `contract.public.ts` HTTP/OpenAPI) as optional when views diverge.
      - Evidence: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:645`
      - Evidence: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:719`
    - Transcript pressure concentrated on: plugin-local contracts, harness utility, and HTTP metadata purity costs.
      - Evidence: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:4900`
      - Evidence: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5347`
      - Evidence: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:5417`
    - Today-state primary code already stores contracts in packages and implements in server runtime.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:1`
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
  - Inferred:
    - Dual-model (internal + public contracts) is technically valid but should be deferred by default because it adds drift risk and two change surfaces per procedure.
    - Plugin-owned contracts are acceptable only for plugin-private endpoints with no shared consumer/import expectations.

- Challenge area 3: template-as-SDK/package option (now vs later)
  - Observed:
    - Repo is explicitly private workspace monorepo; not configured as publishable SDK package.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/package.json:3`
    - System docs frame template as upstream baseline and fixture source; operational work belongs downstream personal HQ.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md:40`
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md:9`
    - Plugin docs keep local-only default posture and block template plugin publishing by default.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:100`
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:106`
    - Transcript contains direct concern around “core service adapter/package ... make the SDK useful” but no committed architecture decision for SDK conversion.
      - Evidence: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:1518`
  - Inferred:
    - Full “template-as-npm-SDK” now likely increases migration surface (versioning, publish policy, compatibility guarantees) before core manifest/runtime semantics stabilize.
    - Better near-term path is “internal SDK boundary in repo” (clear package API contracts + manifest contract) with explicit trigger criteria before external packaging.

- Additional evidence to reflect in final section:
  - Required challenge to remove unnecessary complexity:
    - manifest + host dual-path in migration phases still acknowledged in packet.
      - Evidence: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:166`
  - Existing documentation mismatch risk:
    - current SYSTEM/PLUGINS docs still describe 3 plugin roots and Channel B as `plugins/web/*`.
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md:52`
      - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:43`

## Breadcrumbs (Steering Checkpoint)

### 1) Sources checked (explicit list)
- Packet and destination:
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_COUNTER_ARGUMENT_REVIEW_AGENT_PACKET.md`
  - `docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`
- Required skill set:
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
- Required routing/process docs:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/GRAPHITE.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/RUNBOOKS.md`
- Proposal evidence docs:
  - `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md`
  - `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md`
  - `docs/system/spec-packet/DECISIONS.md`
  - `docs/system/spec-packet/AXIS_01_TECH_CORRECTNESS.md`
  - `docs/system/spec-packet/AXIS_02_ARCHITECTURE_LIFECYCLE.md`
  - `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md`
  - `docs/system/spec-packet/AXIS_04_SYSTEM_TESTING_SYNC.md`
  - `docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md`
- Transcript:
  - `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md`
- Primary-worktree today-state evidence (packet list):
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/index.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/plugins.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md`
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md`

### 2) Unresolved questions and resolution path
- Q1: Is `rawr.hq.ts` functionally necessary now, or just conceptual cleanup?
  - Resolution approach: compare proposal “sole authority” claims vs today-state host composition code.
  - Resolved to: necessary as enforceable policy artifact for target state, but should be narrowed for phase 1.
  - Evidence: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:35`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`.
- Q2: Should contracts live in runtime plugins because they are boundaries?
  - Resolution approach: evaluate transcript challenges + AXIS_03 concrete patterns + today-state placement.
  - Resolved to: package-level as default, plugin-local only for plugin-private endpoints.
  - Evidence: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:306`; `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:4900`.
- Q3: Is template-as-SDK a now decision?
  - Resolution approach: compare docs on template/personal role + local-only plugin posture + decision register.
  - Resolved to: defer; introduce explicit readiness triggers.
  - Evidence: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/SYSTEM.md:40`; `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:100`; `docs/system/spec-packet/DECISIONS.md:15`.

### 3) Major conclusion refs for final append
- Conclusion: Move host-authored runtime composition out of `apps/server/src/rawr.ts` and `apps/server/src/orpc.ts` into manifest+plugin adapters.
  - Before refs: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`.
  - After refs (proposal examples): `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:317`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:360`.
- Conclusion: Keep package-owned contracts by default, defer dual-contract complexity unless needed.
  - Before refs: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`.
  - After refs: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:306`, `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:645`.
- Conclusion: Do not convert to template-as-SDK in this cycle.
  - Evidence refs: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md:9`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/system/PLUGINS.md:106`.

### 4) Refinement loop (wording clarity and operational specificity)
- Steering requirement: replace abstract recommendations with concrete move-language (“what code moves, where, what changes, what does not change”).
- Resolution:
  - Added explicit before/after for composition move with today-state files and proposed manifest/host mount files.
  - Added explicit before/after for package contract vs runtime adapter split.
  - Added explicit before/after for `rawr.capability` semantics and metadata behavior.
- Major refs used in the clarity rewrite:
  - Today composition: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`, `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
  - Proposed composition: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:317`, `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:360`
  - Metadata transition: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:123`, `docs/system/spec-packet/AXIS_05_SIMPLICITY_LEGACY_REMOVAL.md:25`

## Completion Summary

### 1) Files changed
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_COUNTER_ARGUMENT_AGENT_PLAN_VERBATIM.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_COUNTER_ARGUMENT_AGENT_SCRATCHPAD.md`
- `docs/projects/flat-runtime-session-review/SESSION_019c587a_LINEAGE_DIFF_SCRATCH.md`

### 2) Key conclusions (5 bullets)
- Keep `rawr.hq.ts` as the single composition authority, but narrow phase 1 to ORPC + Inngest mounting only.
- Move host-authored runtime composition out of `apps/server/src/rawr.ts` and `apps/server/src/orpc.ts`; hosts should mount manifest outputs only.
- Keep shared capability contracts in `packages/*`; reject plugin-owned contracts as the default for shared capability APIs.
- Defer dual-contract (`internal/public`) pattern by default and allow it only when public/internal API views truly diverge.
- Defer template-as-SDK/package conversion until explicit readiness criteria are met (stable manifest/metadata + release-policy closure).

### 3) Residual ambiguities explicitly left open
- Exact operational semantics for `rawr.capability` across multi-surface plugins (identity/cardinality/enablement behavior) still need a normative rule.
- Phase-1 manifest boundary is clear for ORPC/Inngest, but timeline/conditions for adding `web/cli/agents/mcp` to manifest governance remain open.
- Final trigger policy for when dual-contract oRPC becomes justified (and required drift checks) is still deferred.
