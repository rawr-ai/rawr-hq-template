# Hyperresearch Codex Full-Tier Initial Proof Boundary

## Paths

- PROOF_DIR: /tmp/hyperresearch-codex-full-proof.MGcDm8
- VAULT_ROOT: /tmp/hyperresearch-codex-full-vault.px1Yg1
- LEDGER_PATH: /tmp/hyperresearch-codex-full-vault.px1Yg1/research/temp/hyperresearch-codex-run.json

## Status

- CURRENT_STATUS: blocked
- CURRENT_STEP: 02-width-sweep
- SESSION_ID: not visible
- service runId: hpr-v8-de11ec6b-bdad-4622-a4bf-57de8edab8bb

## Evidence Preserved

- Command captures: commands/
- Agent packet prompts: agent-prompts/
- Agent final messages: agent-finals/
- Agent packet outputs: agent-results/
- Packet JSON: packets/
- Ledger snapshots: ledger-snapshots/
- Agent artifact hashes: notes/agent-artifact-sha256.txt
- Source block classification: notes/source-fetch-block.md
- Minimal resume packet: resume-packet.md
- Broader resume prompt: resume-prompt.md

## Boundary Claim

This pass proves the initial acceptance slice: a real full-tier run reached a packet gate, native Codex custom role agents were spawned without full-history fork_context, both role agents wrote packet outputs with artifactWrites and official Inngest sourceUrls, and the parent service attempted real source capture through the RAWR control plane. It does not claim final parity.

The run blocked after fan-in because the Hyperresearch CLI fetch failed for one official docs URL: https://www.inngest.com/docs/platform/deployment. Eleven official Inngest URLs were captured successfully before that block.
