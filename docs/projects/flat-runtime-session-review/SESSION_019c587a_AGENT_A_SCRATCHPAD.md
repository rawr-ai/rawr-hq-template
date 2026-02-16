# Agent A Scratchpad

## Baseline
- Timestamp: 2026-02-16 (local)
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
- Verified `pwd`: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal`
- Verified branch: `docs/flat-runtime-proposal`
- Initial git status (observed):
  - Untracked files already present:
    - `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACHES_COMPARE_CONTRAST_SCRATCH.md`
    - `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACHES_MEDIATOR_SCRATCHPAD.md`

## Logging Conventions
- `Observed`: directly seen in source files/code/transcript.
- `Inferred`: reasoned conclusion from observed evidence.

## Task Position (Given)
- Packages are pure domain logic.
- Packages can expose contracts for pure functions and can implement those contracts in-package.
- No runtime/event/timeful orchestration semantics in package domain layer.
- Runtime plugins import and call package capabilities.

## Pending Required Reads
- Skills introspection (7 required SKILL.md files).
- Process guardrails (`AGENTS.md`, `GRAPHITE.md`, `RUNBOOKS.md`).
- Evidence corpus (transcript, proposal docs, today-state code).

## Upfront Skill Introspection (Required)

### 1) oRPC Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
- Observed: Defines contract-first model (`contract -> implement() -> router -> transport`) and supports exposing same procedures over RPC/OpenAPI.
- Observed: Calls out monorepo boundary hygiene (contract package vs impl package) and warns against route/prefix mismatches.
- Inferred: Approach A can keep contract+domain implementation in package layer while runtime plugin mounts transports.

### 2) Inngest Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
- Observed: Emphasizes durable/timeful concerns live in step-based workflow runtime and side effects must be within `step.*` boundaries.
- Observed: Positions Inngest as orchestration/durability mechanism, not domain state model.
- Inferred: Supports separation where package domain stays pure and workflow plugin owns orchestration semantics.

### 3) Elysia Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
- Observed: Elysia app/plugin composition and route mounting are runtime-layer concerns; warns about request body consumption and adapter boundaries.
- Observed: Encourages schema-first typed routes and plugin composition.
- Inferred: API plugin can be the boundary adapter that imports package contracts/handlers and exposes HTTP transport.

### 4) TypeScript Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
- Observed: Recommends strict boundary separation (domain invariants inside, I/O/time outside) and compiler-guided refactors.
- Observed: Advocates explicit extension points (ports/adapters) and stable public surfaces.
- Inferred: Reinforces service-module package design with runtime adapters layered above.

### 5) Plugin Architecture Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
- Observed: Core invariant states logic should live in `packages/` and plugin entry points should remain thin.
- Observed: Distinguishes runtime route surfaces from domain logic and preserves command-surface boundaries.
- Inferred: Approach A aligns strongly: package domain module as reusable engine, runtime plugins as composition/mount points.

### 6) RAWR HQ Orientation Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
- Observed: Defines template vs personal repo role split and explicit command-surface routing rules.
- Observed: Notes optional runtime surfaces (`apps/server`, `apps/web`) as capability edges.
- Inferred: Package domain should remain channel-agnostic while runtime apps/plugins host integrations.

### 7) Architecture Skill
- Source: `/Users/mateicanavra/.codex-rawr/skills/architecture/SKILL.md`
- Observed: Requires separation of current state vs target state vs transition docs.
- Observed: Requires grounded claims with pointers and deletion targets for transitional bridges.
- Inferred: Final doc should present Approach A target architecture, plus explicit migration slices from current state.

## Repo/Process Guardrails (Required)

### AGENTS Root Guardrail
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/AGENTS.md`
- Observed: Template repo is upstream baseline; personal customization routes downstream unless intentionally promoted.
- Observed: Graphite is required and trunk must remain `main`.
- Observed: Command-surface invariant is strict (`rawr plugins ...` vs `rawr plugins web ...`) and must not be mixed.
- Inferred: Approach A doc should stay template-level and avoid personal-runtime coupling.

### Graphite Workflow
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/GRAPHITE.md`
- Observed: Graphite-first branch/stack operations are required; git is for inspection.
- Observed: Parallel/worktree safety defaults include `gt sync --no-restack` and `gt restack --upstack` for own stack only.
- Inferred: Any optional follow-up branch operations should preserve stack-local safety and avoid ad-hoc rewrite flows.

### Runbooks Index
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/docs/process/RUNBOOKS.md`
- Observed: Canonical process entrypoint with strict channel separation and plugin lifecycle runbooks.
- Observed: Scratch-first policy exists for mutating multi-phase commands.
- Inferred: Documentation-oriented architecture proposal should explicitly keep runtime channels and lifecycle phases distinct.

## Evidence Ledger (Required Sources)

### Transcript Signals
- Source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:400`
- Observed: User explicitly frames `packages/*` as "pure-ish domain logic and contracts" and rejects mixing runtime composition/routing in package space.
- Source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:411`
- Observed: User target ceremony is ~3 touchpoints (domain package + plugin(s) + one composition point).
- Source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:413`
- Observed: User requires one standard path, no dual composition paths, with `rawr.hq.ts` named as desired root manifest.
- Source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:523`
- Observed: Prior convergence statement already aligned on packages as library/domain and `rawr.hq.ts` for composition.
- Source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:1308`
- Observed: Prior policy explicitly disallows runtime plugin-to-plugin imports and routes API↔workflow interaction through package contracts/services.
- Source: `/tmp/takeover-session-full/019c587a-4dd3-7a12-829a-060e0c70cc54/transcript.md:2703`
- Observed: Prior flow distinguishes package business operations from API/workflow transport implementations.
- Inferred: Approach A should stay strict on package-owned business operations and plugin-owned runtime adapters.

### Current Proposal Baseline
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:19`
- Observed: Locked decision keeps capability/domain authoring in `packages/*`.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:23`
- Observed: Locked decision disallows runtime plugin-to-plugin imports.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:27`
- Observed: Locked decision puts composition only in `rawr.hq.ts`; apps mount outputs.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:30`
- Observed: `packages/hq` is for HQ domain logic only, not runtime wiring.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:214`
- Observed: Example API plugin implements contract and triggers workflow event via Inngest client.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:269`
- Observed: Example workflow plugin owns Inngest function/retries/step semantics.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:317`
- Observed: `rawr.hq.ts` example composes package+plugin outputs into ORPC + Inngest manifest.
- Source: `docs/system/FLAT_RUNTIME_SURFACES_RECOMMENDED_PROPOSAL.md:443`
- Observed: Migration guidance already calls for moving composition out of app files into `rawr.hq.ts`.

### Spec Packet + Decisions
- Source: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:33`
- Observed: Decision summary preserves surface-split plugin roots with package-first contracts/logic.
- Source: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:35`
- Observed: Compose only in `rawr.hq.ts` is a declared architecture boundary.
- Source: `docs/system/spec-packet/FLAT_RUNTIME_SPEC_PACKET.md:36`
- Observed: Plugin-to-plugin runtime imports are prohibited.
- Source: `docs/system/spec-packet/DECISIONS.md:11`
- Observed: D-001 closes workflow-to-API model as API procedures + workflow functions + package-owned event/contracts.
- Source: `docs/system/spec-packet/DECISIONS.md:13`
- Observed: D-003 locks explicit/manual registration in `rawr.hq.ts` for phase 1.
- Source: `docs/system/spec-packet/DECISIONS.md:14`
- Observed: D-004 defers workflow-backed ORPC helper abstraction pending repetition evidence.

### Axis 03 Example Evidence
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:6`
- Observed: Axis defines packages as runtime-agnostic implementation home; plugins as runtime binding layers.
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:25`
- Observed: Clarifies implementation *is* in package, but as runtime-agnostic services rather than runtime framework handlers.
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:307`
- Observed: Contract stays in package with `@orpc/contract`, not server runtime handler.
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:401`
- Observed: API plugin binds deps and implements contract router.
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:471`
- Observed: Workflow plugin owns function definition; business behavior stays in package service.
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:535`
- Observed: `rawr.hq.ts` wires surfaces together to avoid plugin-to-plugin imports.
- Source: `docs/system/spec-packet/AXIS_03_END_TO_END_EXAMPLES.md:639`
- Observed: Supports multiple API contract views in package (`contract.internal.ts` vs `contract.public.ts`) while API plugin chooses implementation.
- Inferred: This directly maps to required variants A1 (mount package contract/router) and A2 (extend boundary-specific contract view).

### Today-State Code (Current Reality)
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:101`
- Observed: Server host currently instantiates runtime adapter and Inngest bundle in app layer, then mounts `/api/inngest`.
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/rawr.ts:113`
- Observed: ORPC route registration is currently invoked from app layer (`registerOrpcRoutes`).
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:20`
- Observed: ORPC routes import a static contract from `@rawr/core/orpc` and implement router in app file.
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:104`
- Observed: `createOrpcRouter()` implements contract handlers directly in server layer.
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/apps/server/src/orpc.ts:310`
- Observed: Server file mounts RPC/OpenAPI handler routes and context assembly.
- Source: `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template/packages/core/src/orpc/hq-router.ts:5`
- Observed: `hqContract` currently contains fixed `coordination` + `state` namespace contract composition in package/core.
- Inferred: Current state still has app-level runtime composition; migration to Approach A requires extracting capability runtime adapters out of app files and introducing root manifest composition authority.

## Drafting Notes Before Final Doc
- Observed: Required output must include both API variants (A1 mount/re-export, A2 extend for boundary behavior) and workflow integration while keeping package domain runtime-free.
- Inferred: Best way to satisfy both is a layered package structure:
  - `domain/*` pure logic + contracts/effects as data.
  - optional package-local API mapping module for reusable contract/handler pairing.
  - runtime plugins stay thin and own transport/lifecycle semantics.
- Observed: Today-state app layer still owns ORPC/Inngest composition (`apps/server/src/rawr.ts`, `apps/server/src/orpc.ts`).
- Inferred: Migration should first introduce `rawr.hq.ts` manifest and redirect app host to mount manifest outputs before capability-by-capability extraction.
- Observed: Spec packet already defers helper abstraction (D-004) until repeated boilerplate appears.
- Inferred: A2 extension path should be explicit but optional, and triggered by boundary needs (auth/policy/public view split) rather than default complexity.

## Final Doc Drafted
- Output created: `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Included required sections:
  - concrete end-to-end file tree,
  - contract/implementation/client placement,
  - API variant A1 and A2,
  - workflow integration with domain/runtime split,
  - `rawr.hq.ts` composition + host mount path,
  - simpler/harder table,
  - migration path from current state,
  - explicit Observed vs Inferred classification,
  - placeholder section for future "Counter-Review of Approach B" once Agent B doc path arrives.

## Cross-Critique Phase (Completed)
- Reviewed Agent B doc:
  - `/Users/mateicanavra/Documents/.nosync/DEV/rawr-hq-template-wt-flat-runtime-proposal/docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_B_BOUNDARY_OR_RUNTIME_CENTRIC_E2E.md`
- Updated section in Agent A final doc:
  - `## Counter-Review of Approach B`
  - Includes strongest objections, where B is stronger, concrete A-vs-B file/flow comparison, and recommendation-change decision.
- Outcome:
  - Baseline recommendation remains Approach A.
  - Added conditional promotion rule: move boundary glue to boundary package only after proven duplication threshold.
