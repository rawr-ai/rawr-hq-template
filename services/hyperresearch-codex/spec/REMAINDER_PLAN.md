# Hyperresearch Codex Remainder Plan

This is the service-package working plan for finishing Hyperresearch Codex parity. It supersedes cross-repo planning notes that placed the canonical remainder plan in downstream `rawr-hq`. Downstream still owns the currently synced Codex skill/workflow/agent material, but implementation planning, acceptance criteria, review findings, and working notes for the runtime now live beside the `@rawr/hyperresearch-codex` service.

## Baseline

- Template worktree: `codex/hyperresearch-codex-parity`, building forward from `220885d1 test(hyperresearch): prove codex rawr packet workflow`. The corrected packet-provenance implementation baseline remains `4f22bc9a feat(hyperresearch): enforce packet provenance gates`.
- Downstream sync source: `rawr-hq` branch `docs/compatibility-substrate-spike`, building on `0f359d33 docs(hyperresearch): sync packet provenance contract`, ahead of origin by six commits before the current proof-sync commit.
- Current template implementation proves V8 runner/control-plane behavior: fresh step loads, durable ledger, light/full fixture routes, packet-mode pause/resume with atomic fan-in, source URL validation, CLI capture after packet fan-in, report snapshots, patch-only integrity checks, a fresh Codex-RAWR packet-mode light proof using the real Hyperresearch backend, a short multi-source Codex-RAWR runtime proof with actual resume, role-agent fan-out, four official source captures, five traced claims, and final validation, and a repaired full-tier Inngest proof with all 16 V8 steps, 20 role-agent packet jobs, 16 official source captures, critic/patch/polish/readability gates, backend sync/lint/export, claim trace, and final validation.
- It does not yet claim clean child-session completion, Hooks runtime parity, production Inngest readiness, or unrelated global downstream plugin drift. MCP is intentionally parked and is not part of the active parity claim.

## Non-Negotiable Frame

- Keep building forward from `220885d1`; do not reset below the corrected `4f22bc9a` packet-provenance service topology.
- The service is the right implementation shape: Codex owns orchestration, durable state, step loading, agent packets, fan-in, resume, critique/patch gates, and validation; the Python Hyperresearch CLI remains the backend for vault/search/fetch/note/lint/sync/export.
- Do not use `hyperresearch research` as a parity substitute. It does not prove the 16-step V8 harness.
- Fixture mode proves the Hyperresearch Codex control-plane contract only; it does not prove live research quality or source-backed final-report correctness.
- Hooks remain reference-only until feature flags, config projection, and failure paths are verified in this environment. MCP is parked until a future spec justifies it; it is not a blocker for the active parity claim because the direct Hyperresearch CLI backend owns the authoritative loop. Current hook/MCP boundaries live in `HOOKS_MCP_PARITY.md`; child wait/completion evidence requirements live in `CHILD_AGENT_COMPLETION_CONTRACT.md`.
- Global downstream plugin drift is not a Hyperresearch blocker. Hyperresearch sync proof must use scoped flags to avoid unrelated install reconciliation.

## Service Package Ownership

The service package owns:

- this remainder plan and implementation working notes,
- the integration spec, parity matrix, flow spec, test plan, review ledger, and DRA runbook,
- the TypeScript service/client/CLI-topic runtime,
- fixture and runtime tests,
- evidence for service-level acceptance.

Downstream `rawr-hq` owns only the active sync source for Codex-facing skill/workflow/agent material during the current transition. Any downstream changes must be driven by a concrete service contract change or proof-gate requirement from this package.

## Implementation Phases

### 1. Topology And Documentation Pre-Gate

Goal: make the current service easy to extend without reintroducing the topology drift that caused the failed pass.

- Split `runs/router.ts` into a small procedure-flow router plus `modules/runs/helpers/*` for agent packets/output validation, source capture, artifact writing, V8 ledger handling, V8 step loading, V8 integrity validation, and result/status construction.
- Keep synthetic fixture-only ledger/step/integrity behavior under `modules/fixtures/helpers/*`; do not route fixture business logic through `runs` or `shared`.
- Keep procedure schemas in `modules/runs/contract.ts`.
- Keep shared durable entities/resources in `service/shared`; the only shared adapter is the low-level Hyperresearch CLI backend wrapper. Do not put V8 business logic in top-level `shared/helpers`.
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

### 5. Downstream Runtime Material Refresh

Goal: synced Codex-facing material exactly matches the service contract.

- Refresh downstream skill/workflow/agent packet instructions only after the service contract changes are stable.
- Keep hook/MCP material under references unless promoted by verified runtime tests.
- Use scoped sync:

```bash
BUN_TMPDIR=/tmp TMPDIR=/tmp bun run rawr plugins sync hyperresearch --dry-run --agent codex --no-install-reconcile --no-cowork --json
```

Exit gate:

- Scoped Hyperresearch dry-run reports no conflicts.
- Installed skill/workflow/agent material matches the updated packet schema and service CLI commands.

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
- Scoped downstream sync dry-run and sync.
- Actual Codex skill execution through the synced skill, proving it uses `rawr hyperresearch codex start/advance/validate` and not `hyperresearch research`.
- Actual Codex packet/subagent gate where Codex agents write packet outputs.
- Short live provenance proof with 2-4 sources and at least three material final-report claims traced.

The Codex-RAWR packet-provenance light proof, short multi-source runtime proof, and repaired full-tier Inngest V8 proof are now green; see `evidence.md`. The next concrete track is the focused child-agent lifecycle diagnostic in `CHILD_AGENT_COMPLETION_CONTRACT.md`. If it passes, active Hyperresearch Codex parity is clean/green/done for the service plus Codex packet orchestration path. Hooks, parked MCP work, production Inngest readiness, and unrelated global downstream plugin drift remain separate tracks unless explicitly promoted.

## Review Loop

- Use default agents only for review/help.
- Give review agents complete context, including this plan and the service laws.
- Run review after each major phase: topology/doc pre-gate, packet artifact contracts, source/claim provenance, patch guard, downstream sync material, and final proof ladder.
- Record accepted findings in `REVIEW_LEDGER.md`; do not rely on chat-only dispositions.

## Working Log

- 2026-05-03: Moved canonical remainder planning into the `@rawr/hyperresearch-codex` service package per user direction. Downstream remains the active sync source for Codex material only.
- 2026-05-03: Implemented service-side topology pre-gate cleanup, explicit `/types` consumer imports, packet artifact-commit validation, source-capture provenance, claim-trace validation, and patch-log hash/hunk coverage. Component tests now cover these gates, including packet-mode snapshots for agent-written final reports.
- 2026-05-03: Refreshed downstream Hyperresearch skill/workflow references, force-synced the scoped Codex material, and confirmed the scoped dry-run is clean. Real-backend artifact packet smoke passed via the service CLI with `sourceCaptures` and `passed:true`.
- 2026-05-03: Corrected a topology regression where run business helpers were left as module-root files and V8 ledger/step/integrity behavior lived in top-level `shared/helpers`. V8 internals now live under `modules/runs/helpers`, fixture internals live under `modules/fixtures/helpers`, `shared/helpers` was removed, and service-shape tests ratchet this boundary.
- 2026-05-03: Closed the second review loop findings: packet fan-in is atomic across staggered outputs, packets now carry role-assigned required artifact sets, source URL capture skips already captured URLs while preserving suggested-by provenance, and patch logs must be accepted and cover changed lines.
- 2026-05-03: Replaced the stale Codex CLI/model blocker with a fresh `codex-rawr exec` proof. The RAWR forked Codex CLI (`v0.126.0-alpha.3`, `gpt-5.5`, `CODEX_HOME=~/.codex-rawr`) invoked `hyperresearch-codex`, drove `start`/`advance --agent-mode packets`/`validate`, wrote five packet outputs with hashed artifact commitments, captured `https://www.python.org/about/` through the real Hyperresearch backend, completed the light route, and passed validation. Added `validate --backend real|fixture` command-surface support after the proof exposed that `validate` was the only V8 command missing the backend flag. Preserved a reviewable evidence subset under `spec/evidence/2026-05-03-codex-rawr-packet-proof/`.
- 2026-05-03: Completed the first higher-order runtime proof. `codex-rawr exec` session `019debf6-73ab-7622-8d58-3afc26212616` resumed from a real `awaiting_agents` gate, spawned Hyperresearch role agents, captured four official PyPA URLs, produced a final report and five-claim trace, blocked once on invalid claim-trace source shape, repaired that packet output through a role-agent pass, and passed `advance-06` plus `validate --backend real`. Preserved evidence under `spec/evidence/2026-05-03-codex-rawr-runtime-proof/`. Keep the stuck readability wait as an open runtime caveat before long-run release claims.
- 2026-05-03: Opened the full parity closure loop in `FULL_PARITY_CLOSURE_PLAN.md`. The next gate is a full-tier `codex-rawr exec` proof with real backend operations, full role-agent fan-out, zero-context resume evidence, critic/patch artifacts, claim trace, downstream sync, review, and Graphite release checks.
- 2026-05-03: Completed the repaired full-tier Inngest proof. Run `hpr-v8-c673c42e-c6da-46e7-b8fa-48c286a9572b` completed all 16 V8 steps with 20 completed role-agent packet jobs, 16 official Inngest source captures, critic findings, accepted patch log, polish/readability artifacts, safe claim trace, backend `sync`/`lint`/`export`, and `validate --backend real` returning `passed:true`. Preserved the initial source-selection block and repaired passing evidence under `spec/evidence/`.
- 2026-05-03: Fixed an evidence-found service gap where deterministic `prompt-decomposition.json` was still a placeholder. The runs helper now writes structured query atoms, named topics, evidence requirements, and proof boundaries, with focused V8 test coverage.
- 2026-05-03: Captured remaining child-agent completion and Hooks/MCP boundaries in service-local prework docs. The next implementation track is the focused `codex-rawr` child-wait diagnostic. Hook guard fixtures are separate follow-up work unless explicitly selected, and MCP remains parked.
- 2026-05-03: Ran two child-focused parallel review teams across lifecycle state, interruption/resume evidence, fixture reproducibility, acceptance boundaries, service topology implications, and next-session usability. Accepted findings hardened `CHILD_AGENT_COMPLETION_CONTRACT.md` with an executable diagnostic packet, schemas, state/result taxonomies, timeout/process evidence, replacement-attempt rules, a Hyperresearch-shaped packet-loop case, negative/classification cases, closure rules, and topology-safe hardening boundaries.
