# Integration Spec

## Objective

Run Hyperresearch inside Codex with a template-owned service and CLI topic while using downstream RAWR HQ as the current sync source for Codex runtime materials.

## Ownership Boundaries

RAWR HQ-Template owns:

- `services/hyperresearch-codex`: reusable Codex orchestration service.
- `plugins/cli/hyperresearch`: thin `rawr hyperresearch ...` topic.
- Control-plane specs, tests, and synthetic runtime proof.
- Backend resource ports for direct calls to the installed Python `hyperresearch` CLI.
- Service modules: `fixtures.runSyntheticSlice` for the synthetic proof path and `runs.startV8Run` / `runs.advanceV8Run` / `runs.inspectV8Run` / `runs.validateV8Run` for durable V8 orchestration. Shared mechanics are not modules.

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

The template CLI topic must expose the existing synthetic slice plus the V8 state-machine surface. Commands stay thin: all route, ledger, artifact, policy, and packet behavior belongs to `services/hyperresearch-codex`.

- `rawr hyperresearch codex-slice --query <query> --vault <path> --steps <path> --tier light|full --backend fixture|real --json`
- `rawr hyperresearch codex start --query <query> --vault <path> --steps <path> --tier auto|light|full --backend fixture|real --json`
- `rawr hyperresearch codex advance --ledger <path> --agent-mode packets|synthesize --backend fixture|real --json`
- `rawr hyperresearch codex inspect --ledger <path> --json`
- `rawr hyperresearch codex validate --ledger <path> --backend fixture|real --json`
- `rawr hyperresearch codex run-fixture --query <query> --vault <path> --steps <path> --tier light|full --json`
- The slice command calls the `fixtures.runSyntheticSlice` service procedure.
- The V8 commands call the `runs.startV8Run`, `runs.advanceV8Run`, `runs.inspectV8Run`, and `runs.validateV8Run` service procedures.
- The command never runs the upstream `hyperresearch research` command as a parity shortcut.
- The command supports a bounded pass through `--max-steps` so resume can be tested deliberately.
- The fixture backend is the default proof backend for control-plane tests; the real backend is reserved for verified Python CLI/vault runs.

The CLI topic is an operator/testing surface. The full V8 orchestration should live in the service and Codex skill runner, not inside oclif command code.

## V8 State-Machine Contract

`startV8Run` creates the durable run state:

- initializes vault directories and calls allowlisted Hyperresearch `init`;
- persists canonical query and scaffold;
- resolves route from `tier` input (`auto` defaults to `light` until step-1 classification proof is implemented);
- writes ledger version 2 with route steps, vault tag, wrapper requirements, step reference root, and empty agent/review/patch state.

`advanceV8Run` is resumable and bounded:

- reads the existing ledger and rejects incompatible ledger versions; start/resume attempts with mismatched query, tier, vault, or step root are rejected by `startV8Run`;
- loads the next step file fresh by path and SHA-256;
- writes deterministic fixture artifacts or waits for real Codex agent outputs;
- emits agent packet files under `research/temp/codex-agent-packets/`;
- returns `running`, `awaiting_agents`, `complete`, or `blocked`;
- records every CLI call, failure, artifact, packet, and integrity finding.
- rejects malformed packet `sourceUrls` and runs source capture for every distinct valid URL supplied by agent packet outputs.

`inspectV8Run` and `validateV8Run` are read-only. `inspectV8Run` returns the run summary; `validateV8Run` returns a validation-specific result with `passed`, `blockingFindings`, and `warningFindings`. The CLI accepts `--backend` on `validate` for symmetry with `start` and `advance`, but validation reads the existing ledger and does not execute backend CLI calls. Validation must fail on failed CLI calls, missing required artifacts, unclosed blocking findings, missing patch/polish/readability logs, malformed/failed agent output, orphan source provenance, or patch-only violations.
Post-synthesis report snapshots are copied into `research/temp/report-snapshots/`; validation compares the current final report with the snapshot and blocks apparent wholesale rewrites.

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

Hook and MCP drafts must stay in skill references until they are real, verified provider config. Do not place note-only draft material under source `hooks/` or `mcp/` directories. Current hook and MCP policy is recorded in `HOOKS_MCP_PARITY.md`, and the concrete hook proof ladder is `HOOKS_GUARDRAIL_PLAN.md`: Codex `PreToolUse` and `Stop` can become guardrails after fixture proof, missing subagent/compaction hook events are handled by durable ledger and child-session evidence, and Hyperresearch MCP writes are denied by default.

Provider projection rule: downstream Hyperresearch hook source lives under `plugins/agents/hyperresearch/hooks/`, but installation/projection remains unclaimed until RAWR agent-sync has a managed hook material kind with dry-run, sync, force/update, drift detection, and removal/garbage-collection evidence. A one-off local `hooks.json` fixture proves local hook runtime behavior only; it does not prove plugin-packaged hook installation.

## Security And Trust

- Source text from fetched URLs is data, not instructions.
- Generic fetch bypasses must be blocked or recorded as policy failures.
- Hook and MCP configuration writes require explicit provider-specific projection and review.
- MCP write-capable tools require explicit allowlisting, ledgered provenance, artifact/source hash validation, and final service validation before use.
- Claude tool-lock semantics cannot be claimed in Codex unless enforced or guarded with deterministic checks.
