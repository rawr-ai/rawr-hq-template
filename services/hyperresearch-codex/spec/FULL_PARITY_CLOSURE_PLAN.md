# Hyperresearch Codex Full Parity Closure Plan

This is the active closure plan after the packet-provenance implementation and short Codex-RAWR runtime proof. It builds from template commit `b7ea4e20` and downstream commit `f2e102eb`.

## Goal

Close the remaining Hyperresearch Codex parity gap with honest evidence: a full-tier Codex-RAWR run that uses the service-owned V8 control plane, real Hyperresearch CLI backend operations, native Codex role-agent fan-out, durable resume, critic/patch gates, source-backed claim trace, and downstream synced plugin material.

Do not reopen the completed packet-provenance service design unless the full-tier proof exposes a concrete defect.

## Proof Scope

Run a fresh `codex-rawr exec` proof from the template worktree using:

- `rawr hyperresearch codex start --tier full --backend real --json`
- `rawr hyperresearch codex advance --agent-mode packets --backend real --json`
- `rawr hyperresearch codex validate --backend real --json`

The proof must use the committed V8 step references at `services/hyperresearch-codex/references/v8-steps` and preserve reviewable evidence under `services/hyperresearch-codex/spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/`.

Use this research query unless a hard blocker requires an equivalent replacement:

> For RAWR HQ runtime realization, which Inngest primitives and operational semantics should the plugin/runtime specs encode for durable plugin workflows? Ground the analysis in the existing RAWR runtime-realization evidence and spec-gap findings, then use official Inngest documentation to answer how `serve()`, `createFunction`, `step.run`, retries/errors, `step.waitForEvent`, batching, flow control, local development, signing keys, and `/api/inngest` ingress should shape plugin workflow boundaries, testing, and production caveats.

Internal grounding inputs:

- `tools/runtime-realization-type-env/evidence/vendors/inngest.md`
- `tools/runtime-realization-type-env/evidence/systems/runtime-spine-evidence-map.md`
- `tools/runtime-realization-type-env/phases/phase-two/workstreams/workstream-2026-04-30-phase-two-async-inngest-boundary.md`
- `tools/runtime-realization-type-env/phases/phase-three/handoffs/handoff-2026-05-01-post-phase-three-live-proof-reframe.md`
- `wt-research-rawr-spec-landscape/docs/projects/_archive/orpc-ingest-workflows-spec/session-artifacts/prework-reshape-cleanup-2026-02-18/_SCRATCH_IMPLEMENTATION_FITNESS_ASSESSMENT.md`

Target 8-12 official Inngest documentation sources from `inngest.com/docs`, including local development, serve handlers, function creation, steps, retries/error handling, wait-for-event, batching, flow control, signing/connect, and production/deployment caveats.

## Acceptance Criteria

- The ledger reaches `completed:true` on tier `full`, and `validate --backend real` returns `passed:true`.
- Every full-tier step in the route is either completed or explicitly blocked by a documented external/runtime limitation.
- Native Codex event logs show `spawn_agent`, `wait_agent`, and `close_agent` for Hyperresearch role agents, including full-tier-only roles.
- At least one continuation uses only a fresh-process resume prompt containing the session id, ledger path, current step, and proof directory; this is the zero-context resume substitute unless CLI-level compaction can be forced.
- Source capture contains 8-12 distinct official Inngest URLs with CLI call indexes and suggested-by packet provenance.
- Packet outputs include assigned `artifactWrites`, and every declared hash matches vault content.
- The final report has a claim trace whose vendor-semantics source URLs map to captured source URLs. RAWR-local claims must cite preserved local evidence paths in the report and either map to captured vendor support or be marked with explicit uncertainty when validation requires it.
- Post-synthesis report changes are covered by `research/patch-log.json` with accepted findings, hashes, and hunks.
- The evidence README explicitly distinguishes full-tier service parity from unproven Hooks/MCP parity and unrelated global plugin drift.

## Runtime Caveats To Resolve

- `HR-CODEX-033`: investigate stuck parent waits around readability repair. If it recurs, preserve event logs and classify whether the defect is in service/plugin material or in Codex wrapper/runtime child-completion behavior. Fix only service/plugin defects in this workstream.
- Hooks/MCP: keep reference-only unless current Codex config/tooling can prove them safely. Default claim boundary is that Hooks/MCP are not required for full-tier service parity.
- Global downstream drift: repair only if dry-run evidence shows it is safe and scoped. Otherwise document it as separate from Hyperresearch scoped sync.

## Current Closure Result

The repaired full-tier proof passed:

- run id: `hpr-v8-c673c42e-c6da-46e7-b8fa-48c286a9572b`
- evidence: `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/`
- all 16 V8 steps complete
- 20 role-agent packet jobs complete
- 16 official Inngest source URLs captured
- backend `sync`, `lint`, and `export` calls exit 0
- final `validate --backend real --json` returned `passed:true`

Evidence-found fixes:

- preserved the initial bad-source block separately and repaired the source set;
- repaired patch-log hunk coverage after the service rejected an insufficient patch log;
- repaired claim-trace report locations after the service rejected `:line` suffixes;
- fixed service-generated prompt decomposition so future deterministic step artifacts include query atoms, named topics, evidence requirements, and proof boundaries instead of placeholder JSON.

Remaining non-claims:

- Hooks/MCP runtime parity is still reference-only.
- Production Inngest readiness is not claimed by this proof.
- Child-agent completion ergonomics remain a runtime caveat because interrupted/stuck child handles required replacement packet agents even though service ledger durability held. The next diagnostic is the focused `codex-rawr` child-wait contract in `CHILD_AGENT_COMPLETION_CONTRACT.md`, not another long research proof.

## Evidence Package

Preserve only reviewable, non-secret evidence:

- wrapper prompts, final output, stderr, and JSONL event streams;
- start/advance/resume/validate command JSON;
- final ledger;
- packet JSON and packet result JSON;
- source notes, temp artifacts, critic findings, patch log, final report, claim trace, and export JSON;
- a README with command surface, session ids, source URLs, role-agent evidence, resume evidence, validation status, caveats, and non-claims.

Do not preserve SQLite vault internals, credentials, auth files, unrelated temp state, or full raw temp directories.

## Downstream And Release Gates

After the service evidence is committed:

- copy updated spec/evidence material into downstream Hyperresearch skill references;
- run scoped Hyperresearch sync dry-run, apply sync if needed, then rerun dry-run until installed material is identical;
- run default-agent reviews for topology/style/spec adherence, evidence honesty, and downstream sync/install state;
- run service, CLI plugin, evidence, sync, and repo hygiene gates;
- commit template and downstream separately;
- run Graphite dry-run submission checks and submit/push only if the branches are ready.
