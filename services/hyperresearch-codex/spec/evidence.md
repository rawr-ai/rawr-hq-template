# Hyperresearch Codex Evidence

This file records durable proof claims for the `@rawr/hyperresearch-codex` service package. Keep it aligned with `TESTING_PLAN.md`, `REVIEW_LEDGER.md`, and downstream synced references.

## Current Hook Evidence Status

Status: fixture-proven guardrails, reference-only installation.

Core Hyperresearch-specific `PreToolUse` and `Stop` runtime fixture evidence is committed under `services/hyperresearch-codex/spec/evidence/20260503T235332Z-codex-hooks-proof/`.

Proof summary:

- Disposable `CODEX_HOME` with the Codex-required top-level `hooks` object invoked both `PreToolUse` and `Stop` during `codex-rawr exec`.
- Runtime `PreToolUse` payload shape and matched Bash command are preserved at `spec/evidence/20260503T235332Z-codex-hooks-proof/payloads/pre-tool-use-runtime.jsonl`.
- Direct fixture execution blocked `curl https://example.com/source` with `hookSpecificOutput.permissionDecision=deny`; see `logs/source-guard-block.txt`.
- Direct fixture execution allowed Hyperresearch service commands; allow stdout/stderr are expected-empty, so the decision is recorded in `logs/hook-events.jsonl`.
- Direct fixture execution allowed an explicitly routed source URL; allow stdout/stderr are expected-empty, so the decision and reason are recorded in `logs/hook-events-routed-source.jsonl`.
- Runtime `Stop` payload is preserved at `payloads/stop-runtime.jsonl`.
- Direct fixture execution blocked missing/incomplete/red ledgers and allowed a green ledger with `validation.passed:true`; see `logs/stop-red.txt` and `logs/hook-events.jsonl`. `logs/stop-green.txt` is expected-empty because allow decisions emit empty stdout/stderr.
- The runtime `Stop` payload had `stop_hook_active:false`, so red/green closure blocking is direct-fixture evidence rather than live final-answer interruption evidence.
- The evidence bundle preserves the initial negative config probe where a missing top-level `hooks` wrapper did not run hooks.
- Focused tests cover malformed JSON, unsupported event names, missing commands, source bypass detection, allowed Hyperresearch/routed-source commands, missing/incomplete/red ledgers, missing passed validation marker, ledger path precedence, green ledgers, and timeout classification.

Projection status: reference-only. Candidate material exists under `services/hyperresearch-codex/references/codex-hooks/`, but managed agent-sync hook projection has no install, update, dry-run, drift, or removal evidence yet.

Current claim boundary: service plus packet parity remains authoritative. Hooks are guardrails only. MCP, lifecycle hook parity, plugin-packaged hook projection, automatic descendant rehydration, production readiness, and unrelated global plugin drift remain unclaimed.

## 2026-05-03 Child Agent Completion Diagnostic

Status: failed for bare `codex-rawr exec resume`, with the service proof still intact.

Purpose: test whether Codex/RAWR child sessions can be spawned, waited, closed, and then observed again across `codex-rawr exec resume`, separately from Hyperresearch's disk-backed packet fan-in.

Durable evidence subset:

- `spec/evidence/20260503T193257Z-child-agent-completion/README.md`
- `spec/evidence/20260503T193257Z-child-agent-completion/commands.sh`
- `spec/evidence/20260503T193257Z-child-agent-completion/manifest/manifest.json`
- `spec/evidence/20260503T193257Z-child-agent-completion/manifest/*.json`
- `spec/evidence/20260503T193257Z-child-agent-completion/events/*.jsonl`
- `spec/evidence/20260503T193257Z-child-agent-completion/logs/*.stderr`
- `spec/evidence/20260503T193257Z-child-agent-completion/process/*.txt`
- `spec/evidence/20260503T193257Z-child-agent-completion/outputs/*.json`
- `spec/evidence/20260503T193257Z-child-agent-completion/sessions/session-resolution.json`
- `spec/evidence/20260503T193257Z-child-agent-completion/hyperresearch-shaped/selected-packet.json`
- `spec/evidence/20260503T193257Z-child-agent-completion/sha256sums.txt`

Run summary:

- `codex-rawr --version`: `codex-cli 0.126.0-alpha.3`
- `hyperresearch --version`: `hyperresearch v0.8.5`
- template head: `aaa94c8c1d9ac9b6b6c6dfa5a13114e128eed273`
- proof root: `/tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion`
- aggregate verdict: `failed_child_handles_not_durable_across_exec_resume`

Scenario results:

- `single-happy`: passed as `clean_completed`; one child spawned, waited, closed, and hashed.
- `multi-happy`: passed as `clean_completed`; three children spawned before wait, then waited, closed, and hashed.
- `multi-resume-happy`: failed as `stuck_final_no_wait`; the resumed parent process resumed the same parent thread, but `wait` and `close_agent` returned `not_found` for all three child handles created before resume. The child output files existed and hashed.
- `hyperresearch-shaped-packet-loop`: passed as `clean_completed`; the role-like child wrote the selected Hyperresearch packet result and the service accepted that selected packet output. The second packet job intentionally remained outside this lifecycle scenario.
- `bad-output`: classified negative as `artifact_only_succeeded`; child lifecycle completed, but malformed JSON blocked clean artifact success.

Conclusion:

- Same-process Codex/RAWR child lifecycle is usable for immediate packet work.
- Child handles are not durable enough across bare `codex-rawr exec resume` to claim native clean child-completion parity.
- This does not invalidate Hyperresearch service parity evidence: packet outputs, artifact hashes, source capture, claim trace, patch log, and final validation remain disk/ledger-backed and valid.
- This failure evidence is superseded for `HR-CODEX-035` closure by the explicit child-resume proof. It remains the boundary evidence that bare parent resume is not enough.

Non-claims:

- MCP was parked and not installed, registered, or tested.
- Hooks were not tested.
- This run does not prove a native app-server or SDK alternative; that is a separate review track.

## 2026-05-03 App-Server Child Lifecycle Smoke

Status: failed cold-resume child-handle durability, with stronger structured evidence.

Purpose: determine whether the Codex app-server provides a better native path for the child-agent completion diagnostic, and whether it fixes the resume failure.

Durable evidence subset:

- `spec/evidence/20260503T201420Z-app-server-child-lifecycle/README.md`
- `spec/evidence/20260503T201420Z-app-server-child-lifecycle/manifest.json`
- `spec/evidence/20260503T201420Z-app-server-child-lifecycle/harness/*.mjs`
- `spec/evidence/20260503T201420Z-app-server-child-lifecycle/same-process/*`
- `spec/evidence/20260503T201420Z-app-server-child-lifecycle/cold-resume/*`
- `spec/evidence/20260503T201420Z-app-server-child-lifecycle/sha256sums.txt`

Research summary:

- Two app-server reviewers and two SDK reviewers inspected the local Codex vendor checkout under `/Users/mateicanavra/Documents/.nosync/DEV/habitat/vendors/codex`.
- The TypeScript SDK was rejected as a pivot because it wraps `codex exec --experimental-json` and resumes via `exec resume <threadId>`.
- Hosted OpenAI SDKs were rejected for this parity issue because they are not the local Codex workspace/session/RAWR custom-agent runtime.
- App-server was accepted as the preferred diagnostic surface. It supports thread start/resume, `thread/read`, `thread/loaded/list`, turn streaming, live reconnect, and collaborative-agent lifecycle items.
- A local no-model app-server probe confirmed `codex-rawr app-server --listen stdio://` can initialize with a temp `CODEX_HOME`, create a thread, read the thread without turns, and list the loaded thread. The probe also showed `thread/read includeTurns:true` is unavailable before the first user turn materializes the rollout, so the real diagnostic must run `turn/start` before relying on turn history.
- A mock-provider app-server smoke then proved same-process app-server `spawnAgent`/`wait`/`closeAgent` emits typed collab lifecycle items and passes.
- The same smoke proved cold parent `thread/resume` after app-server restart fails wait/close against the original child id with structured `notFound`.

Decision:

- Do not refactor Hyperresearch service code around the SDK.
- Use app-server as the preferred reproduction surface for Codex/RAWR runtime work.
- The native runtime repair belongs in Codex/RAWR child-handle descendant resume behavior rather than Hyperresearch service design. The active Hyperresearch service plus packet-orchestration claim is parent resume plus explicit child resume for known child ids before wait/close; replacement-attempt packet fan-in remains fallback hardening for child attempts that still classify non-clean.

## 2026-05-03 App-Server Explicit Child Resume Smoke

Status: passed as the accepted child-resume closure evidence for known child ids after parent resume.

Purpose: test the remaining app-server question: after cold parent `thread/resume`, can model-driven `resume_agent` recover the original child id before `wait` and `closeAgent`?

Durable evidence subset:

- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/manifest.json`
- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/harness/app-server-cold-resume-explicit-child-resume-harness.mjs`
- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/prompts/*.md`
- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/explicit-child-resume/summary.json`
- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/explicit-child-resume/jsonrpc.jsonl`
- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/explicit-child-resume/mock-responses-requests.jsonl`
- `spec/evidence/20260503T213000Z-app-server-explicit-child-resume/sha256sums.txt`

Result:

- Codex runtime repair commit: `24d8fb32aa fix(agent): seed resumed status from rollout`.
- Parent thread: `019defb9-b353-7493-bca5-1d0b4e9676a2`.
- Original child thread: `019defb9-b389-7220-8621-4fbeb3a623e2`.
- After cold parent resume, `resumeAgent` against the original child completed and returned `completed` with `{"explicit_child_result":"ok"}`.
- `wait` completed with `timed_out: false` and observed the same completed child status.
- `closeAgent` completed against the child and returned previous status `completed`.
- No `notFound` status appeared in this explicit-child-resume run.

Conclusion:

- App-server plus model-driven `resume_agent` recovers the original child handle after cold parent resume and lets parent `wait`/`closeAgent` observe clean completion.
- This is the accepted recovery strategy for known child ids after parent resume; Hyperresearch parity does not depend on automatic descendant rehydration.
- It does not prove automatic descendant rehydration from bare parent `thread/resume` or bare `codex-rawr exec resume`.

## 2026-05-03 Replacement-Attempt Fallback Proof

Status: passed.

Purpose: preserve the service-level proof that a logical packet job can complete through a ledgered replacement attempt while preserving the original attempt as non-clean and still passing final validation.

Durable evidence subset:

- `spec/evidence/20260503T215805Z-replacement-attempt-proof/README.md`
- `spec/evidence/20260503T215805Z-replacement-attempt-proof/ledger.json`
- `spec/evidence/20260503T215805Z-replacement-attempt-proof/run/*.json`
- `spec/evidence/20260503T215805Z-replacement-attempt-proof/codex-agent-packets/*.json`
- `spec/evidence/20260503T215805Z-replacement-attempt-proof/codex-agent-results/*.json`
- `spec/evidence/20260503T215805Z-replacement-attempt-proof/replacement/*.json`
- `spec/evidence/20260503T215805Z-replacement-attempt-proof/sha256sums.txt`

Result:

- Run id: `hpr-v8-042d0668-3d5c-46c5-b9e0-5bab9ca69cf0`.
- `02-width-sweep-1-fetcher` completed through replacement attempt `02-width-sweep-1-fetcher-a2`.
- The ledger kept the replaced attempt `02-width-sweep-1-fetcher-a1` as `non_clean` with original classification `wait_timeout`.
- The accepted replacement output declared assigned artifact writes and source URLs for two official Python Packaging Authority sources.
- The light route completed, and `validate --backend real` returned `passed:true`.

Conclusion:

- Replacement attempts are valid fallback service durability behavior for non-clean child attempts.
- This bundle is not the primary `HR-CODEX-035` closure proof and does not prove bare parent resume automatic descendant rehydration.

## 2026-05-03 Codex-RAWR Full-Tier Inngest Proof

Status: passed, with bounded runtime caveats.

Purpose: prove the full Hyperresearch Codex V8 route on a RAWR-runtime/Inngest research query, using real Hyperresearch backend calls, full-tier Codex role-agent packet fan-out/fan-in, source capture, critic/patch/polish/readability gates, patch-only integrity, final claim trace, backend sync/lint/export, and final service validation.

Durable evidence subset:

- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/README.md`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/ledger.json`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/final-report.md`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/claim-trace.json`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/patch-log.json`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/commands/*`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/packets/*`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/agent-results/*`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/source-captures.tsv`
- `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof-repaired/vault-research/notes-source/*`

Run summary:

- run id: `hpr-v8-c673c42e-c6da-46e7-b8fa-48c286a9572b`
- vault: `/tmp/hyperresearch-codex-full-vault-repaired.u8a3Ul`
- tier: `full`
- backend: `real`
- validation passed: `true`
- completed step IDs: all 16 V8 steps
- role-agent jobs completed: 20
- source captures: 16 official Inngest URLs
- CLI operations recorded: `init`, `search`, 16 `fetch` calls, `note`, `lint`, `sync`, `lint`, `export`

Source capture scope:

- `https://www.inngest.com/docs/reference/serve`
- `https://www.inngest.com/docs/reference/typescript/functions/create`
- `https://www.inngest.com/docs/learn/inngest-steps`
- `https://www.inngest.com/docs/learn/how-functions-are-executed`
- `https://www.inngest.com/docs/guides/error-handling`
- `https://www.inngest.com/docs/features/inngest-functions/error-retries/rollbacks`
- `https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event`
- `https://www.inngest.com/docs/guides/batching`
- `https://www.inngest.com/docs/guides/flow-control`
- `https://www.inngest.com/docs/learn/security`
- `https://www.inngest.com/docs/local-development`
- `https://www.inngest.com/docs/setup/connect`
- `https://www.inngest.com/docs/deploy/render`
- `https://www.inngest.com/docs/self-hosting`
- `https://www.inngest.com/docs/guides/throttling`
- `https://www.inngest.com/docs/guides/rate-limiting`

Observed caveats and fixes:

- The initial full-tier attempt, preserved under `spec/evidence/2026-05-03-codex-rawr-full-tier-inngest-proof/`, blocked on a bad source URL (`https://www.inngest.com/docs/platform/deployment`). The repaired run used fetchable official Inngest docs and passed.
- Two child-agent completion issues were observed and repaired through replacement role packets. The ledger remained durable and resumed from packet state; classify this as Codex session/child-completion behavior, not a service fan-in defect. Clean original child-session completion remains unclaimed for bare resume; future resumed coordinators use explicit child resume before fallback replacement attempts.
- The service rejected an insufficient patch log and later accepted a repaired patch log with complete changed-line coverage.
- The service rejected claim-trace `reportLocation` values with `:line` suffixes and accepted repaired safe relative paths.
- A critic found that deterministic `prompt-decomposition.json` was still a placeholder. The service now writes a structured decomposition artifact with query atoms, named topics, evidence requirements, and proof boundaries; `v8-runner.test.ts` covers this.

Non-claims:

- This does not prove Hooks/MCP runtime parity.
- This does not prove production Inngest readiness for RAWR.
- This does not prove clean child-session completion or parent wait/close ergonomics.
- This does not resolve unrelated downstream global plugin drift outside scoped Hyperresearch material.

## 2026-05-03 Codex-RAWR Runtime Proof

Status: passed, with a recorded orchestration caveat.

Purpose: prove the first higher-order runtime gate after the packet-provenance contract: a fresh `codex-rawr exec` run, real backend, actual `codex-rawr exec resume`, native Hyperresearch role-agent fan-out, four official source captures, final-report claim trace, and service validation.

Durable evidence subset:

- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/README.md`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/ledger.json`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/claim-trace.json`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/commands/*.json`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/codex-agent-packets/*.json`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/codex-agent-results/*.json`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/notes/*.md`
- `spec/evidence/2026-05-03-codex-rawr-runtime-proof/run-wrapper/*.jsonl`

Command surface:

```bash
CODEX_HOME=/Users/mateicanavra/.codex-rawr codex-rawr exec \
  --dangerously-bypass-approvals-and-sandbox --json \
  -C /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity

CODEX_HOME=/Users/mateicanavra/.codex-rawr codex-rawr exec resume \
  019debf6-73ab-7622-8d58-3afc26212616 \
  --dangerously-bypass-approvals-and-sandbox --json
```

Run summary:

- thread/session id: `019debf6-73ab-7622-8d58-3afc26212616`
- repair thread id: `019dec0f-f43d-7952-a60a-bc2390962c3e`
- vault: `/tmp/hyperresearch-codex-runtime-vault-rSLoGr`
- ledger: `/tmp/hyperresearch-codex-runtime-vault-rSLoGr/research/temp/hyperresearch-codex-run.json`
- run id: `hpr-v8-7cf4660d-4219-496f-8d69-12d9abe1a529`
- tier: `light`
- backend: `real`
- validation passed: `true`
- completed step IDs: `01-decompose`, `02-width-sweep`, `10-triple-draft`, `15-polish`, `16-readability-audit`
- role-agent jobs completed: `hyperresearch-fetcher`, `hyperresearch-source-analyst`, `hyperresearch-draft-orchestrator`, `hyperresearch-polish-auditor`, `hyperresearch-readability-recommender`
- CLI operations recorded: `init`, `search`, `fetch`, `fetch`, `fetch`, `fetch`, `note`, `lint`, `sync`, `lint`, `export`

Source capture URLs:

- `https://packaging.python.org/en/latest/specifications/pyproject-toml/`
- `https://packaging.python.org/en/latest/specifications/core-metadata/`
- `https://packaging.python.org/en/latest/specifications/dependency-groups/`
- `https://packaging.python.org/en/latest/tutorials/packaging-projects/`

Observed caveat:

- `commands/advance-05.json` records a useful failure: the readability packet's first `claim-trace.json` used string sources, and service integrity blocked the completed run with `missing-claim-trace` findings.
- A follow-up repair produced a claim trace using source objects with captured `url` values and updated artifact hashes. This repair is artifact/service-gate proven, not clean child-completion proven: the preserved event logs show repair `spawn_agent` attempts, but the parent `wait` calls did not complete normally. `commands/advance-06.json` then returned `status:"complete"` with no integrity findings, and `commands/validate.json` returned `passed:true`.
- Two wrapper waits around readability repair were manually terminated after the repaired artifacts existed because the parent wait remained stuck on a child completion event. Treat that as a runtime-orchestration caveat before release; it did not bypass the final service gates.

Non-claims:

- This is not a full-tier long research-quality proof.
- This does not prove Hooks/MCP runtime parity.
- This does not resolve unrelated global downstream plugin drift.

## 2026-05-03 Codex-RAWR Exec Packet Proof

Status: passed.

Purpose: prove that the active RAWR forked Codex CLI can invoke the synced Hyperresearch Codex skill, drive the service-owned V8 start/advance/validate workflow, write packet-owned artifacts, capture sources through the real Hyperresearch CLI backend, and pass final integrity validation.

Durable evidence subset:

- `spec/evidence/2026-05-03-codex-rawr-packet-proof/README.md`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/ledger.json`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/claim-trace.json`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/commands/*.json`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/codex-agent-packets/*.json`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/codex-agent-results/*.json`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/notes/*.md`
- `spec/evidence/2026-05-03-codex-rawr-packet-proof/run-wrapper/{prompt.md,final.txt,events.jsonl}`

The original vault path below was a disposable `/tmp` run. The checked-in subset is the durable evidence; the SQLite vault database and unrelated temp files are intentionally omitted.

Command surface:

```bash
codex-rawr exec --dangerously-bypass-approvals-and-sandbox \
  -C /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity \
  -o /tmp/hr-codex-rawr-live-2uSGMZ/final.txt \
  < /tmp/hr-codex-rawr-live-2uSGMZ/prompt.md
```

Observed Codex CLI:

- wrapper: `/Users/mateicanavra/.local/bin/codex-rawr`
- binary: `/Users/mateicanavra/.local/bin/codex-rawr-bin`
- reported version: `OpenAI Codex v0.126.0-alpha.3`
- model: `gpt-5.5`
- `CODEX_HOME`: `~/.codex-rawr`
- session id: `019debca-b051-77e3-bb05-738b1e0649ed`

Run summary:

- vault: `/tmp/hyperresearch-codex-proof.CD9fhB`
- ledger: `/tmp/hyperresearch-codex-proof.CD9fhB/research/temp/hyperresearch-codex-run.json`
- tier: `light`
- backend: `real`
- final status: `complete`
- validation passed: `true`
- completed step IDs: `01-decompose`, `02-width-sweep`, `10-triple-draft`, `15-polish`, `16-readability-audit`
- agent job count: `5`
- source capture URL: `https://www.python.org/about/`
- CLI operations recorded: `init`, `search`, `fetch`, `note`, `lint`, `sync`, `lint`, `export`

Packet and provenance evidence:

- The Codex session used `hyperresearch-codex`, read the service-local remainder plan, and used `rawr hyperresearch codex start`, `advance --agent-mode packets`, and `validate`; it did not use `hyperresearch research`.
- The run stopped at packet gates, read packet JSON files, wrote the declared `expectedOutputPath` files, and supplied `artifactWrites` with SHA-256 hashes for assigned artifacts.
- The real backend captured `https://www.python.org/about/` through the Hyperresearch CLI and ledgered the `fetch` call.
- The final report contained these exact material claims:
  - Python is a programming language that lets you work quickly and integrate systems effectively.
  - The Python Software Foundation is the organization behind Python.
  - Python runs on Windows, Linux/Unix, macOS, and has been ported to Java and .NET virtual machines.
- `research/claim-trace.json` cited `https://www.python.org/about/` for all three material claims.

Follow-up fixed by implementation:

- The first proof prompt attempted `rawr hyperresearch codex validate --backend real`, but the command did not accept `--backend`. The CLI now accepts `--backend real|fixture` on `validate` for start/advance/validate command-surface symmetry. Validation remains ledger-only and does not execute backend CLI calls.
