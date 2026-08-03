# 2026-05-03 Codex-RAWR Runtime Proof

This directory preserves the reviewable subset of the first higher-order runtime proof for `@rawr/hyperresearch-codex`.

## Claim

The active RAWR forked Codex CLI drove a real-backend light V8 route through the service-owned `rawr hyperresearch codex` control plane, resumed the same Codex session after an `awaiting_agents` gate, spawned Hyperresearch role agents, captured four official PyPA source URLs through the Hyperresearch CLI backend, produced a final report, accepted a repaired claim trace from hashed readability packet artifacts, and passed final service validation.

This is a short multi-source runtime proof. It is stronger than the earlier packet-provenance light proof, but it still does not claim full-tier long-form research parity, Hooks/MCP runtime parity, or release readiness.

## Command Surface

- Initial session: `codex-rawr exec --dangerously-bypass-approvals-and-sandbox --json`
- Resume session: `codex-rawr exec resume 019debf6-73ab-7622-8d58-3afc26212616 --dangerously-bypass-approvals-and-sandbox --json`
- Service commands used by the Codex session:
  - `rawr hyperresearch codex start --tier light --backend real --json`
  - `rawr hyperresearch codex advance --agent-mode packets --backend real --json`
  - `rawr hyperresearch codex validate --backend real --json`

The run did not use `hyperresearch research`.

## Run Summary

- Codex thread/session id: `019debf6-73ab-7622-8d58-3afc26212616`
- Fresh repair thread id: `019dec0f-f43d-7952-a60a-bc2390962c3e`
- Vault: `/tmp/hyperresearch-codex-runtime-vault-rSLoGr`
- Proof wrapper dir: `/tmp/hr-codex-runtime-proof-Zsld23`
- Ledger: `/tmp/hyperresearch-codex-runtime-vault-rSLoGr/research/temp/hyperresearch-codex-run.json`
- Run id: `hpr-v8-7cf4660d-4219-496f-8d69-12d9abe1a529`
- Tier: `light`
- Backend: `real`
- Final status: `complete`
- Final validation: `passed:true`
- Completed steps: `01-decompose`, `02-width-sweep`, `10-triple-draft`, `15-polish`, `16-readability-audit`

## Sources

The ledger records four source captures with CLI call indexes, note IDs, and both width-sweep packet jobs as `suggestedByAgentJobIds`:

- `https://packaging.python.org/en/latest/specifications/pyproject-toml/`
- `https://packaging.python.org/en/latest/specifications/core-metadata/`
- `https://packaging.python.org/en/latest/specifications/dependency-groups/`
- `https://packaging.python.org/en/latest/tutorials/packaging-projects/`

## Role-Agent Evidence

The Codex event logs include native `spawn_agent` calls for these Hyperresearch roles. The normal packet passes also preserve completed `wait` / `close_agent` cycles; the readability repair pass is covered by the integrity gate caveat below.

- `hyperresearch-fetcher`
- `hyperresearch-source-analyst`
- `hyperresearch-draft-orchestrator`
- `hyperresearch-polish-auditor`
- `hyperresearch-readability-recommender`

The ledger records five completed packet jobs matching those roles, and `codex-agent-results/*.json` records hashed `artifactWrites` for the assigned packet artifacts.

## Resume Evidence

The initial Codex session stopped at `awaiting_agents` for `02-width-sweep`. The resumed session continued against the same ledger, and the final ledger records:

```json
{
  "at": "2026-05-03T04:00:20.072Z",
  "reason": "codex-rawr exec resume higher-order runtime proof",
  "nextStepId": "02-width-sweep"
}
```

## Integrity Gate

`commands/advance-05.json` is intentionally preserved as a blocked gate: the first readability packet used `sources` as URL strings in `research/claim-trace.json`, and service integrity blocked the completed run with `missing-claim-trace` findings.

The repair is artifact/service-gate proven, not clean child-completion proven. The preserved event logs show fresh `spawn_agent` attempts for the repair, but the parent `wait` calls did not complete normally. The repaired artifacts nevertheless exist on disk with matching packet-result hashes: `research/claim-trace.json` uses `sources` as objects containing captured `url` values, and the packet result JSON records the updated hashes. `commands/advance-06.json` then returned `ok:true`, `status:"complete"`, and `integrity:[]`; `commands/validate.json` returned `passed:true`, `blockingFindings:[]`, and `warningFindings:[]`.

Two wrapper waits around the readability repair were manually terminated after the repaired artifacts were already written because the wrapper remained stuck waiting on the child completion event. The artifact writes, hashes, source-object schema, successful `advance-06`, and successful `validate` are the acceptance evidence; normal child completion for the repair pass is not proven and remains a runtime orchestration caveat to keep visible before release.

## Contents

- `commands/`: parsed JSON outputs from `start`, all `advance` calls, and `validate`.
- `ledger.json`: final V8 ledger.
- `codex-agent-packets/`: packet JSON emitted by the service.
- `codex-agent-results/`: role-agent packet results with `artifactWrites`.
- `claim-trace.json`: final validated claim trace.
- `notes/`: captured source notes and final report.
- `research-temp/`: reviewable temp artifacts written by packet agents.
- `exports/vault.json`: Hyperresearch export JSON from the disposable vault.
- `run-wrapper/`: Codex prompts, stderr, and event streams used for the initial run, resume, final readability step, and repair.

The SQLite vault database, full temp vault internals, secrets, and unrelated workspace drift are intentionally omitted.
