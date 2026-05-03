Resume the Hyperresearch Codex full-tier parity proof from this evidence boundary.

Known state:
- PROOF_DIR: /tmp/hyperresearch-codex-full-proof.MGcDm8
- VAULT_ROOT: /tmp/hyperresearch-codex-full-vault.px1Yg1
- LEDGER_PATH: /tmp/hyperresearch-codex-full-vault.px1Yg1/research/temp/hyperresearch-codex-run.json
- service runId: hpr-v8-de11ec6b-bdad-4622-a4bf-57de8edab8bb
- current status: blocked
- current step: 02-width-sweep
- Codex SESSION_ID: not visible in the parent session

What already happened:
- Started a temp full-tier real-backend run using RAWR control plane only.
- Reached real full-tier awaiting_agents at 02-width-sweep.
- Spawned hyperresearch-fetcher agent 019decd2-eeed-7943-bfea-59a5b52db04b without fork_context.
- Spawned hyperresearch-source-analyst agent 019decd3-f3c6-7410-8b6f-e912951cf349 without fork_context.
- Both agents wrote expected output JSON, artifactWrites, sha256 hashes, and official Inngest sourceUrls.
- Fan-in captured 11 official Inngest docs URLs and blocked on fetch exit code 1 for https://www.inngest.com/docs/platform/deployment.

Do next:
1. Do not edit the blocked ledger by hand.
2. Use /tmp/hyperresearch-codex-full-proof.MGcDm8 as the evidence wrapper for this interruption proof.
3. For continuation, start a fresh temp vault full-tier run with the same query and the same steps, and at the first 02-width-sweep packet gate instruct agents to omit https://www.inngest.com/docs/platform/deployment or replace it with a currently fetchable official Inngest docs URL.
4. Preserve the new run evidence in a new temp proof dir or a child dir of /tmp/hyperresearch-codex-full-proof.MGcDm8.

First verification command for the existing blocked ledger:

```bash
bun run --cwd apps/cli rawr hyperresearch codex validate --ledger "/tmp/hyperresearch-codex-full-vault.px1Yg1/research/temp/hyperresearch-codex-run.json" --backend real --json
```
