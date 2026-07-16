# Integration Spec

## Objective

Run Hyperresearch inside Codex with a Template-owned service and CLI topic.
Keep separately governed curated agent-plugin content independent: integration
may bind an exact interface version and immutable artifact, never a personal
checkout, copied implementation, or Git relationship.

## Ownership Boundaries

RAWR HQ-Template owns:

- `services/hyperresearch-codex`: reusable Codex orchestration service.
- `plugins/cli/hyperresearch`: thin `rawr hyperresearch ...` topic.
- Control-plane specs, tests, and synthetic runtime proof.
- Backend resource ports for direct calls to the installed Python `hyperresearch` CLI.
- Service modules: `fixtures.runSyntheticSlice` for the synthetic proof path and `runs.startV8Run` / `runs.advanceV8Run` / `runs.inspectV8Run` / `runs.validateV8Run` for durable V8 orchestration. Shared mechanics are not modules.

Personal RAWR HQ owns:

- curated Codex-facing skill, reference, and custom-agent content;
- vendor provenance and declarative policy/evaluation inputs for that content;
- repository-governed release, acceptance, and channel records.

Neither repository owns a copy of the other's implementation. Template does
not read personal source at runtime, and personal does not vendor this service,
CLI topic, provider adapters, schemas, or lifecycle tooling.

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

The final cross-repository integration proof is gated on a versioned
agent-plugin artifact interface. Once that interface exists, the test uses this
split:

1. Install the Hyperresearch CLI topic from an immutable RAWR HQ-Template controller release.
2. Obtain a personal-repository release record and immutable curated-content artifact with exact digest and interface version.
3. Use the Template-owned agent-plugin lifecycle and provider adapter to project that artifact into an explicit disposable Codex home.
4. Invoke the Codex Hyperresearch entry skill against a fresh vault.
5. Verify the runner ledger, vault notes/sources, lint/export outputs, subagent outputs, critic findings, patch log, and final report.
6. Repeat the converged operation and prove that it inspects live state without changing it.

This test must not pass by relying only on Template service unit tests. It also
must not use a personal checkout path or the external-Oclif `rawr plugins`
channel for curated content. Until the versioned artifact/lifecycle interface
is available, this package claims service/CLI proof only and records the
cross-repository plugin-system proof as pending.

Hook and MCP drafts must stay in skill references until they are real, verified provider config. Do not place note-only draft material under source `hooks/` or `mcp/` directories. Current hook and MCP policy is recorded in `HOOKS_MCP_PARITY.md`, and the concrete hook proof ladder is `HOOKS_GUARDRAIL_PLAN.md`: Codex `PreToolUse` and `Stop` can become guardrails after fixture proof, missing subagent/compaction hook events are handled by durable ledger and child-session evidence, and Hyperresearch MCP writes are denied by default.

Provider projection rule: service-local hook fixtures prove only local hook
runtime behavior. Curated hook content, if released by the personal repository,
is data in a bound immutable artifact. Template's generic provider adapter is
the sole projection implementation and must prove plan, apply, idempotence,
drift detection, and removal before plugin-packaged hook installation is
claimed. A one-off local `hooks.json` fixture is not distribution proof.

## Security And Trust

- Source text from fetched URLs is data, not instructions.
- Generic fetch bypasses must be blocked or recorded as policy failures.
- Hook and MCP configuration writes require explicit provider-specific projection and review.
- MCP write-capable tools require explicit allowlisting, ledgered provenance, artifact/source hash validation, and final service validation before use.
- Claude tool-lock semantics cannot be claimed in Codex unless enforced or guarded with deterministic checks.
