# Replacement Attempt Proof

Status: passed.

This proof shows fallback Hyperresearch service behavior for a cold-resumed/non-clean child attempt after explicit child resume would still be classified non-clean. The run reached the `02-width-sweep` packet gate, completed logical job `02-width-sweep-1-fetcher` through replacement attempt `02-width-sweep-1-fetcher-a2`, preserved replaced attempt `02-width-sweep-1-fetcher-a1` as `non_clean` with original classification `wait_timeout`, completed the light route, and passed `validate --backend real`.

Key evidence:

- `ledger.json`: durable run ledger with attempt metadata and accepted output hashes.
- `codex-agent-packets/`: packet contracts with expected attempt metadata.
- `codex-agent-results/`: packet outputs including replacement attempt metadata, artifact writes, and source URLs.
- `claim-trace.json`: final claim trace with report locations, source URL objects, confidence, and reviewer disposition.
- `run/advance-05-complete.json`: completed light route with no integrity findings.
- `run/validate-real.json`: final validation with `passed: true`.

Non-claims:

- This does not replace the explicit child-resume closure proof.
- This does not prove bare parent resume automatic descendant rehydration.
- This does not promote Hooks or MCP parity.
- This does not resolve unrelated global plugin drift.
