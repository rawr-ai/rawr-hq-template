# Codex-RAWR Full-Tier Inngest Proof (Repaired)

Purpose: prove the full Hyperresearch Codex V8 service route with real Hyperresearch backend calls, role-agent packet fan-out/fan-in, critic/patch/polish/readability gates, source capture, patch guard, claim trace, export, and final validation.

## Result

- Status: passed
- Command: `bun run --cwd apps/cli rawr hyperresearch codex validate --backend real --json`
- Run id: `hpr-v8-c673c42e-c6da-46e7-b8fa-48c286a9572b`
- Tier: `full`
- Completed steps: 16/16
- Agent jobs: 20 complete
- Source captures: 16 official Inngest URLs
- Final validation: `passed:true`, no blocking or warning findings

## Query

For RAWR HQ runtime realization, which Inngest primitives and operational semantics should the plugin/runtime specs encode for durable plugin workflows? Ground the analysis in the existing RAWR runtime-realization evidence and spec-gap findings, then use official Inngest documentation to answer how `serve()`, `createFunction`, `step.run`, retries/errors, `step.waitForEvent`, batching, flow control, local development, signing keys, and `/api/inngest` ingress should shape plugin workflow boundaries, testing, and production caveats.

## Evidence Files

- `ledger.json`: final V8 ledger.
- `commands/`: start/advance/validate command captures.
- `packets/`: service-generated agent packets.
- `agent-results/`: role-agent expected output JSON files, including repaired packet outputs.
- `final-report.md`: final report after critic patch and polish.
- `claim-trace.json`: final claim trace accepted by service validation.
- `patch-log.json`: patch-only guard log accepted by service validation.
- `source-captures.tsv`: captured URL, step, suggesting job, CLI call, and note-id summary.
- `vault-research/notes-source/`: preserved source note markdown for official Inngest captures.

## Runtime Observations

- The first full-tier Inngest attempt is preserved separately in `../2026-05-03-codex-rawr-full-tier-inngest-proof/`; it correctly blocked on a bad `https://www.inngest.com/docs/platform/deployment` source URL.
- The repaired run replaced that source with fetchable official Inngest docs and completed.
- Two child-agent completion issues were observed and repaired by replacement role packets: an interrupted corpus-critic/fetcher gate and a stuck synthesizer handle after user interruption. The ledger stayed durable and resumed from packet state; this is classified as Codex session/child-completion behavior, not a service fan-in defect.
- The service correctly rejected an insufficient patch log and then accepted a repaired patch log with complete changed-line coverage.
- The service correctly rejected claim-trace `reportLocation` values with `:line` suffixes and accepted repaired safe relative paths.

## Non-Claims

- This earlier full-tier packet proof did not prove Hooks/MCP runtime parity. Hook guardrail proof is tracked separately; MCP remains parked until its config projection, tool lists, read/write policy, and failure modes are separately validated.
- This does not prove production Inngest readiness for RAWR. The report recommends spec and proof gates; production claims still require environment-specific Inngest Dev Server, Cloud, or self-hosted proof.
- This does not resolve unrelated downstream global plugin drift outside scoped Hyperresearch material.
