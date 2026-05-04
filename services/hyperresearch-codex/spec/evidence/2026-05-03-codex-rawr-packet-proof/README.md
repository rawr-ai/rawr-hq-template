# 2026-05-03 Codex-RAWR Packet Proof

This directory preserves the reviewable subset of a fresh `codex-rawr exec` proof for `@rawr/hyperresearch-codex`.

## Claim

The active RAWR forked Codex CLI invoked the installed `hyperresearch-codex` skill, drove the service-owned `rawr hyperresearch codex start` / `advance --agent-mode packets --backend real` loop, wrote packet-owned artifacts with SHA-256 commitments, captured `https://www.python.org/about/` through the real Hyperresearch CLI backend, produced a claim trace for three material final-report claims, and passed validation.

The preserved Codex run attempted `validate --backend real`, exposed that `validate` was the only V8 command still missing the backend flag, then passed validation with the supported ledger-only command shape. The implementation now accepts `validate --backend real|fixture` for command-surface symmetry, and a post-fix app-level validation against this same ledger with `--backend real` passed.

This is a packet-provenance light proof. It does not claim Hooks/MCP runtime parity, actual Codex-session resume, or a long research-quality V8 run with 2-4 sources.

## Contents

- `run-wrapper/`: prompt, final output, and event stream from the `codex-rawr exec` invocation.
- `commands/`: JSON outputs captured from `start`, each `advance`, and `validate`.
- `ledger.json`: final `research/temp/hyperresearch-codex-run.json` ledger.
- `codex-agent-packets/`: packet files emitted by the service at agent gates.
- `codex-agent-results/`: result files written by the Codex session for packet fan-in.
- `claim-trace.json`: final claim trace for the completed run.
- `notes/`: source note and final report note.
- `exports/vault.json`: Hyperresearch export JSON from the disposable vault.

The source vault lived at `/tmp/hyperresearch-codex-proof.CD9fhB`; the wrapper files lived at `/tmp/hr-codex-rawr-live-2uSGMZ`. The SQLite database and full temp vault are intentionally not checked in.
