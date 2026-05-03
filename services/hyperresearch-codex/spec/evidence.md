# Hyperresearch Codex Evidence

This file records durable proof claims for the `@rawr/hyperresearch-codex` service package. Keep it aligned with `TESTING_PLAN.md`, `REVIEW_LEDGER.md`, and downstream synced references.

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
