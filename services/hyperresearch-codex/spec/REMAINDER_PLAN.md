# Hyperresearch Codex Remainder Plan

This is the service-package working plan for finishing Hyperresearch Codex
parity. Implementation planning, acceptance criteria, review findings, and
working notes for the Template-owned runtime live beside the
`@rawr/hyperresearch-codex` service. Personal curated content is separately
governed and can enter proof only as a bound immutable artifact through an
explicit versioned interface.

## Baseline

- Template worktree: `codex/hyperresearch-codex-parity`, building forward from `220885d1 test(hyperresearch): prove codex rawr packet workflow`. The corrected packet-provenance implementation baseline remains `4f22bc9a feat(hyperresearch): enforce packet provenance gates`.
- Historical personal-repository commits recorded in older evidence are audit provenance only. They are not a source, dependency, baseline, or integration path for this package.
- Current template implementation proves V8 runner/control-plane behavior: fresh step loads, durable ledger, light/full fixture routes, packet-mode pause/resume with atomic fan-in, source URL validation, CLI capture after packet fan-in, report snapshots, patch-only integrity checks, a fresh Codex-RAWR packet-mode light proof using the real Hyperresearch backend, a short multi-source Codex-RAWR runtime proof with actual resume, role-agent fan-out, four official source captures, five traced claims, and final validation, a repaired full-tier Inngest proof with all 16 V8 steps, 20 role-agent packet jobs, 16 official source captures, critic/patch/polish/readability gates, backend sync/lint/export, claim trace, final validation, and explicit child-resume recovery for cold-resumed child handles. Ledgered replacement attempts are fallback hardening for child attempts that still classify non-clean.
- It does not claim native clean child-handle resume, automatic descendant rehydration from bare parent `codex-rawr exec resume`, lifecycle hook parity, plugin-packaged hook projection, or production Inngest readiness. MCP is intentionally parked and is not part of the active parity claim.

## Non-Negotiable Frame

- Keep building forward from `220885d1`; do not reset below the corrected `4f22bc9a` packet-provenance service topology.
- The service is the right implementation shape: Codex owns orchestration, durable state, step loading, agent packets, fan-in, resume, critique/patch gates, and validation; the Python Hyperresearch CLI remains the backend for vault/search/fetch/note/lint/sync/export.
- Do not use `hyperresearch research` as a parity substitute. It does not prove the 16-step V8 harness.
- Fixture mode proves the Hyperresearch Codex control-plane contract only; it does not prove live research quality or source-backed final-report correctness.
- Core `PreToolUse` and `Stop` hook guardrails are fixture-proven. Service-local fixtures live under `spec/fixtures/hooks/`. Curated hook content is owned by its content repository; generic projection is owned by Template and remains unclaimed until a versioned artifact interface and provider-adapter proof exist. MCP is parked until a future spec justifies it; it is not a blocker for the active parity claim because the direct Hyperresearch CLI backend owns the authoritative loop. Current hook/MCP boundaries live in `HOOKS_MCP_PARITY.md`; the concrete hook proof ladder lives in `HOOKS_GUARDRAIL_PLAN.md`; child wait/completion evidence requirements live in `CHILD_AGENT_COMPLETION_CONTRACT.md`.
- Do not pivot to app-server, Codex SDK, or OpenAI SDK by assumption. `NATIVE_CODEX_SURFACE_REVIEW.md` records the current review: the TypeScript Codex SDK wraps `codex exec`, raw OpenAI SDKs are a different runtime, and app-server is the native diagnostic/recovery surface. The active child lifecycle strategy is parent resume plus explicit child resume for known child ids before wait/close; replacement-attempt packet fan-in remains fallback hardening for non-clean child attempts.
- Personal repository or provider-home drift is not part of service-only proof. Cross-repository acceptance begins only when its owning lifecycle container supplies an exact artifact/interface binding and an explicit disposable provider home.

## Service Package Ownership

The service package owns:

- this remainder plan and implementation working notes,
- the integration spec, parity matrix, flow spec, test plan, review ledger, and DRA runbook,
- the TypeScript service/client/CLI-topic runtime,
- fixture and runtime tests,
- evidence for service-level acceptance.

Personal RAWR HQ independently owns curated Codex-facing
skill/workflow/agent content and its governed lifecycle records. This package
does not direct personal source changes and does not import, copy, sync, or
execute that checkout. Future interoperability is limited to an explicit
versioned schema/protocol and immutable artifact.

## Implementation Phases

### 0. Hooks Guardrail Track

This track is complete for the two core runtime guardrails and remains open for managed projection only.

- Core parity-adjacent hook work is limited to `PreToolUse` source-bypass guard and `Stop` validation guard.
- `PreToolUse` proof captured actual Codex/RAWR Bash payload shape and direct block/allow behavior under `spec/evidence/20260503T235332Z-codex-hooks-proof/`.
- `Stop` proof captured runtime payload shape plus direct missing/red/green ledger decisions under `spec/evidence/20260503T235332Z-codex-hooks-proof/`; live final-answer interruption is not claimed because the observed runtime payload had `stop_hook_active:false`.
- `PermissionRequest`, `PostToolUse`, `SessionStart`, and `UserPromptSubmit` are easy ergonomics only after the two core guards pass.
- `SubagentStart`, `SubagentStop`, `PreCompact`, `SessionEnd`, and `Notification` remain explicit non-claims.
- Plugin-packaged hook installation remains unclaimed until the Template-owned provider adapter accepts a versioned content artifact and has install/update/removal evidence.
- See `HOOKS_GUARDRAIL_PLAN.md`.

### 1. Topology And Documentation Pre-Gate

Goal: make the current service easy to extend without reintroducing the topology drift that caused the failed pass.

- Split `runs/router.ts` into a small procedure-flow router plus `modules/runs/helpers/*` for agent packets/output validation, source capture, artifact writing, V8 ledger handling, V8 step loading, V8 integrity validation, and result/status construction.
- Keep synthetic fixture-only ledger/step/integrity behavior under `modules/fixtures/helpers/*`; do not route fixture business logic through `runs` or `shared`.
- Keep procedure schemas in `modules/runs/contract.ts`.
- Keep shared durable entities/resources in `service/common`; the only shared adapter is the low-level Hyperresearch CLI backend wrapper. Do not put V8 business logic in top-level `shared/helpers`.
- Do not create `modules/common`, `modules/*/services`, or decorative pass-through runner facades.
- Tighten public exports so consumers import service DTOs from an explicit type surface instead of broad contract-derived internals.
- Refresh stale docs: service spec index, parity matrix, testing plan, review ledger, and CLI/plugin README wording.

Exit gate:

- Structural tests still forbid bad topology.
- Structural tests forbid module-root implementation files, top-level `shared/helpers`, `modules/common`, `modules/runtime`, and `modules/*/services`.
- Typecheck and service tests pass.
- Docs say fixture/control-plane proof, not live parity.

### 2. Agent-Owned Artifact Contracts

Goal: packet mode becomes artifact-real. Agents must produce step-specific artifacts that the service validates and uses instead of synthetic fixture artifacts.

- Extend agent packets with a role/step-specific artifact contract. Packets include assigned required artifacts for that job and the full step artifact set for fan-in context.
- Require packet outputs, across the step's returned jobs, to declare `artifactWrites` for every required artifact listed across the step. The declaration is an artifact commitment: it applies to newly written artifacts and carried-forward artifacts whose current content the agent verified.
- Validate that required artifacts for agent-owned steps exist before completing the step.
- Keep fan-in atomic: if only some expected outputs exist, the service keeps every job pending and rereads all output files on the next advance before completing the step.
- In packet mode, do not synthesize missing substantive artifacts for steps that require agent output.
- Keep synthesize mode available only as fixture/control-plane proof.

Exit gate:

- Tests prove packet-mode completion blocks when an agent omits required artifact writes.
- Tests prove successful packet-mode completion records agent-written artifact paths on the step and later steps can read them.
- Tests prove staggered packet output arrival does not lose artifact commitments or mark partial jobs complete.

### 3. Source Provenance And Claim Trace

Goal: source capture becomes final-report-auditable instead of only URL-auditable.

- Introduce durable source-capture ledger entries with URL, CLI call index, captured note/source identifiers when available, suggested-by agent job, and step provenance.
- Deduplicate URL capture while preserving every suggesting job. A URL already captured through a ledgered CLI call is not fetched again by later packet fan-in.
- Require final report claim trace artifacts with claim text that appears in the report, report location, supporting captured note/source IDs or URLs, confidence, uncertainty where applicable, and reviewer disposition.
- Validate that material claims in the final report trace to captured sources or explicit uncertainty.

Exit gate:

- Tests prove duplicate URLs are captured once but retain multiple suggested-by links.
- Tests prove validation blocks a completed run with missing claim trace for a final report.
- A short live runtime proof can trace at least three material claims to vault/source evidence across 2-4 sources. The current Codex-RAWR runtime proof traces five claims to four captured official PyPA source URLs and passes service validation. The repaired full-tier Inngest proof traces five final-report claims to 16 captured official Inngest URLs or explicit parity-scope uncertainty and passes service validation.

### 4. Patch-Only Guard Hardening

Goal: post-synthesis changes are patch-auditable, not merely retained-line-ratio checked.

- Add patch log schema for critic IDs, accepted findings, patch hunks, rationale, touched report sections, and before/after hashes. Validate that logged hunks correspond to the pre/post report text and cover added/removed changed lines.
- Require patch log entries for full-tier patch/polish/readability steps when the final report changes after synthesis.
- Keep wholesale rewrite detection as a backstop.

Exit gate:

- Tests prove unlogged report changes after snapshot block validation.
- Tests prove logged small patches pass while wholesale rewrites still block.

### 5. Versioned Curated-Content Integration

Goal: independently released Codex-facing content binds exactly to a published
service/lifecycle interface without repository coupling.

- Publish the exact Template-owned schema/protocol version required by packet instructions.
- Accept only an immutable curated-content artifact with release-set digest and governed release/acceptance/channel records.
- Keep hook/MCP content declarative unless promoted by verified runtime tests and a Template-owned provider adapter.
- Exercise the future agent-plugin lifecycle only in an explicit disposable provider home; never read or project from a personal checkout.

Exit gate:

- The artifact digest, interface version, release-set digest, and record digests are bound in proof.
- Installed skill/workflow/agent material matches the packet schema and service CLI commands.
- Repeating the converged operation performs reads only.

### 6. Proof Ladder

Run proof gates in this order:

- `bunx nx show projects`
- `bunx nx show project @rawr/hyperresearch-codex --json`
- `bun run --cwd services/hyperresearch-codex typecheck`
- `bunx vitest run --project hyperresearch-codex`
- `bun run --cwd plugins/cli/hyperresearch typecheck`
- `bunx vitest run --project plugin-hyperresearch`
- CLI fixture light/full routes using absolute `--steps` paths or copied temporary step references.
- Negative CLI fixture with a missing step file.
- Real-backend packet-mode light smoke with real Hyperresearch CLI calls recorded in the ledger.
- Validate a released curated-content artifact against the exact published interface when the owning lifecycle container makes that interface available.
- Actual Codex skill execution through the artifact-backed install, proving it uses `rawr hyperresearch codex start/advance/validate` and not `hyperresearch research`.
- Actual Codex packet/subagent gate where Codex agents write packet outputs.
- Short live provenance proof with 2-4 sources and at least three material final-report claims traced.

The Codex-RAWR packet-provenance light proof, short multi-source runtime proof, repaired full-tier Inngest V8 proof, app-server explicit-child-resume proof, and core hook guardrail proof are green; see `evidence.md`. The focused `codex-rawr exec resume` diagnostic remains important failure evidence for bare parent resume: same-process children pass, but pre-resume child handles become `not_found` when the resumed parent waits/closes them without explicit child resume. The accepted strategy is now parent resume plus explicit child resume for known child ids, then wait/close. If that still cannot cleanly complete an attempt, classify the original attempt as non-clean, complete the same logical packet job with a ledgered replacement output, and require artifact hashes, source capture, claim trace, patch log, and final validation to pass. Parked MCP work, production Inngest readiness, automatic descendant rehydration, managed hook projection, and lifecycle hook parity remain separate tracks unless explicitly promoted.

## Review Loop

- Use default agents only for review/help.
- Give review agents complete context, including this plan and the service laws.
- Run review after each major phase: topology/doc pre-gate, packet artifact contracts, source/claim provenance, patch guard, versioned artifact integration, and final proof ladder.
- Record accepted findings in `REVIEW_LEDGER.md`; do not rely on chat-only dispositions.

## Working Log

Entries below preserve historical proof provenance. Any former checkout-sync or
cross-repository projection wording is superseded by the independent-repository
boundary above and cannot authorize reuse of that mechanism.

- 2026-05-03: Moved canonical remainder planning into the `@rawr/hyperresearch-codex` service package. The later repository-boundary correction removed the then-used checkout projection from current authority.
- 2026-05-03: Implemented service-side topology pre-gate cleanup, explicit `/types` consumer imports, packet artifact-commit validation, source-capture provenance, claim-trace validation, and patch-log hash/hunk coverage. Component tests now cover these gates, including packet-mode snapshots for agent-written final reports.
- 2026-05-03: Exercised the then-current external material projection and passed a real-backend artifact packet smoke via the service CLI with `sourceCaptures` and `passed:true`. That projection is historical evidence, not an accepted integration path.
- 2026-05-03: Corrected a topology regression where run business helpers were left as module-root files and V8 ledger/step/integrity behavior lived in top-level `shared/helpers`. V8 internals now live under `modules/runs/helpers`, fixture internals live under `modules/fixtures/helpers`, `shared/helpers` was removed, and service-shape tests ratchet this boundary.
- 2026-05-03: Closed the second review loop findings: packet fan-in is atomic across staggered outputs, packets now carry role-assigned required artifact sets, source URL capture skips already captured URLs while preserving suggested-by provenance, and patch logs must be accepted and cover changed lines.
- 2026-05-03: Replaced the stale Codex CLI/model blocker with a fresh `codex-rawr exec` proof. The RAWR forked Codex CLI (`v0.126.0-alpha.3`, `gpt-5.5`, `CODEX_HOME=~/.codex-rawr`) invoked `hyperresearch-codex`, drove `start`/`advance --agent-mode packets`/`validate`, wrote five packet outputs with hashed artifact commitments, captured `https://www.python.org/about/` through the real Hyperresearch backend, completed the light route, and passed validation. Added `validate --backend real|fixture` command-surface support after the proof exposed that `validate` was the only V8 command missing the backend flag. Preserved a reviewable evidence subset under `spec/evidence/2026-05-03-codex-rawr-packet-proof/`.
- 2026-05-03: Completed the first higher-order runtime proof. `codex-rawr exec` session `019debf6-73ab-7622-8d58-3afc26212616` resumed from a real `awaiting_agents` gate, spawned Hyperresearch role agents, captured four official PyPA URLs, produced a final report and five-claim trace, blocked once on invalid claim-trace source shape, repaired that packet output through a role-agent pass, and passed `advance-06` plus `validate --backend real`. Preserved evidence under `spec/evidence/2026-05-03-codex-rawr-runtime-proof/`. Keep the stuck readability wait as an open runtime caveat before long-run release claims.
- 2026-05-03: Opened the full parity closure loop in `FULL_PARITY_CLOSURE_PLAN.md` for real backend operations, full role-agent fan-out, zero-context resume evidence, critic/patch artifacts, claim trace, review, and repository release checks.
- 2026-05-03: Completed the repaired full-tier Inngest proof. Run `hpr-v8-c673c42e-c6da-46e7-b8fa-48c286a9572b` completed all 16 V8 steps with 20 completed role-agent packet jobs, 16 official Inngest source captures, critic findings, accepted patch log, polish/readability artifacts, safe claim trace, backend `sync`/`lint`/`export`, and `validate --backend real` returning `passed:true`. Preserved the initial source-selection block and repaired passing evidence under `spec/evidence/`.
- 2026-05-03: Fixed an evidence-found service gap where deterministic `prompt-decomposition.json` was still a placeholder. The runs helper now writes structured query atoms, named topics, evidence requirements, and proof boundaries, with focused V8 test coverage.
- 2026-05-03: Captured remaining child-agent completion and Hooks/MCP boundaries in service-local prework docs. The next implementation track is the focused `codex-rawr` child-wait diagnostic. Hook guard fixtures are separate follow-up work unless explicitly selected, and MCP remains parked.
- 2026-05-03: Ran two child-focused parallel review teams across lifecycle state, interruption/resume evidence, fixture reproducibility, acceptance boundaries, service topology implications, and next-session usability. Accepted findings hardened `CHILD_AGENT_COMPLETION_CONTRACT.md` with an executable diagnostic packet, schemas, state/result taxonomies, timeout/process evidence, replacement-attempt rules, a Hyperresearch-shaped packet-loop case, negative/classification cases, closure rules, and topology-safe hardening boundaries.
- 2026-05-03: Executed the child-agent completion diagnostic. Same-process `codex-rawr exec` child lifecycle passed for one child, three children, and a Hyperresearch-shaped packet child; malformed output classified correctly. The resume case failed: after `codex-rawr exec resume`, `wait` and `close_agent` returned `not_found` for the three child handles spawned before resume while the child output files existed and hashed. Preserved evidence under `spec/evidence/20260503T193257Z-child-agent-completion/` and opened `HR-CODEX-035` as a blocking runtime ergonomics issue.
- 2026-05-03: Ran two fresh paired native-surface deep-research teams. Both SDK reviewers rejected a TypeScript SDK pivot because it wraps `codex exec --experimental-json` and resumes via `exec resume`. The app-server reviewers found app-server is a real native diagnostic path: it supports thread start/resume, loaded-thread listing, thread/read, turn streaming, live reconnect, and collaborative-agent tool-call items. The remaining gap was precise: public parent `thread/resume` had not proven automatic descendant child-handle rehydration, while internal descendant resume exists behind `AgentControl::resume_agent_from_rollout`. Updated `NATIVE_CODEX_SURFACE_REVIEW.md` with the executable app-server diagnostic shape.
- 2026-05-03: Preserved app-server child-lifecycle smoke under `spec/evidence/20260503T201420Z-app-server-child-lifecycle/`. Same-process app-server spawn/wait/close passed and emitted typed `collabAgentToolCall` items. Cold parent `thread/resume` after app-server restart failed wait/close against the original child id with structured `notFound`. This confirms app-server is the right reproduction surface but not a fix; the remaining work is Codex/RAWR descendant resume behavior or explicit claim re-scope.
- 2026-05-03: Preserved the initial app-server explicit-child-resume smoke under `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/`. Before the Codex runtime fix, cold parent resume plus model-driven `resume_agent` recovered the original child handle to `pendingInit` and avoided `notFound`, but `wait` timed out and `closeAgent` only observed previous status `pendingInit`. This narrowed the runtime issue to resumed-child status reconstruction.
- 2026-05-03: Re-ran the app-server explicit-child-resume smoke after the Codex/RAWR status-seeding repair. Cold parent `thread/resume` plus explicit `resume_agent` recovered the original child id to `Completed`, `wait` returned without timeout, and `closeAgent` observed previous status `Completed`. This is the accepted child-resume closure evidence for known child ids after parent resume; it does not claim bare parent resume automatically rehydrates descendants.
- 2026-05-03: Added replacement-attempt fallback hardening for cold-resumed pending child attempts that still classify non-clean after explicit child resume. Replacement packet outputs preserve the original attempt classification, complete the same logical packet job through validated artifact/source/provenance gates, and avoid claiming clean original-child completion.
- 2026-05-03: Proved core Codex hook guardrails in a disposable `CODEX_HOME`. `PreToolUse` source-bypass and `Stop` ledger-validation guards now have runtime payload evidence, direct block/allow outputs, focused tests, and service-local fixtures under `spec/fixtures/hooks/`. Separately governed curated hook content was observed in historical proof, but managed artifact-backed projection, lifecycle hook parity, and MCP remain unclaimed.
