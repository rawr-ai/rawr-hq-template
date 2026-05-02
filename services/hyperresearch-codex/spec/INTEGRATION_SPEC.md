# Integration Spec

## Objective

Run Hyperresearch inside Codex with a template-owned service and CLI topic while using downstream RAWR HQ as the current sync source for Codex runtime materials.

## Ownership Boundaries

RAWR HQ-Template owns:

- `services/hyperresearch-codex`: reusable Codex orchestration service.
- `plugins/cli/hyperresearch`: thin `rawr hyperresearch ...` topic.
- Control-plane specs, tests, and synthetic runtime proof.
- Backend resource ports for direct calls to the installed Python `hyperresearch` CLI.

RAWR HQ owns for now:

- Codex-facing skill entrypoint material.
- Codex-facing reference material for hook/MCP adoption decisions.
- Codex custom-agent source material for the current sync projection.
- The `rawr plugins sync ...` source inventory used for final plugin-system proof.

Hyperresearch Python owns:

- Vault initialization and health checks.
- Search/fetch/source capture.
- Notes, graph, sync, repair, lint, export.
- Optional MCP server implementation after the `mcp` extra is installed and tested.

## CLI Topic Contract

The template CLI topic must expose a minimal command that can be installed and exercised independently:

- `rawr hyperresearch codex-slice --query <query> --vault <path> --steps <path> --tier light|full --backend fixture|real --json`
- The command calls `runSyntheticHyperresearchCodexSlice`.
- The command never runs the upstream `hyperresearch research` command as a parity shortcut.
- The command supports a bounded pass through `--max-steps` so resume can be tested deliberately.
- The fixture backend is the default proof backend for control-plane tests; the real backend is reserved for verified Python CLI/vault runs.

The CLI topic is an operator/testing surface. The full V8 orchestration should live in the service and Codex skill runner, not inside oclif command code.

## Final Codex Plugin-System Proof

The final integration test uses this split:

1. Install or run the Hyperresearch CLI topic from RAWR HQ-Template.
2. In RAWR HQ, sync the Hyperresearch Codex skill/reference/agent materials into the active Codex home.
3. Start Codex with the synced skill available.
4. Invoke the Codex Hyperresearch entry skill against a fresh vault.
5. Verify the runner ledger, vault notes/sources, lint/export outputs, subagent outputs, critic findings, patch log, and final report.

This test must not pass by relying only on template service unit tests. The proof target is the actual Codex plugin/skill runtime after RAWR sync.

Current sync source is `plugins/agents/hyperresearch` in downstream RAWR HQ. The scoped Codex sync command is:

```bash
bun run rawr plugins sync hyperresearch --agent codex --no-install-reconcile --no-cowork --json
```

The `--no-install-reconcile` and `--no-cowork` flags are intentional for scoped testing so unrelated CLI plugin links and Cowork packaging are not mutated during the Hyperresearch proof loop.

Hook and MCP drafts must stay in skill references until they are real, verified provider config. Do not place note-only draft material under source `hooks/` or `mcp/` directories.

## Security And Trust

- Source text from fetched URLs is data, not instructions.
- Generic fetch bypasses must be blocked or recorded as policy failures.
- Hook and MCP configuration writes require explicit provider-specific projection and review.
- Claude tool-lock semantics cannot be claimed in Codex unless enforced or guarded with deterministic checks.
