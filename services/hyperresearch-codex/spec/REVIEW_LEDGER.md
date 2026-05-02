# Review Ledger

## Review Scope

This ledger reviews the current spec and minimal runtime slice before expanding to the full V8 design/implementation loop.

## Findings

| id | severity | status | finding | disposition |
|---|---:|---:|---|---|
| HR-CODEX-001 | blocking | closed | Original plan did not preserve the current split between template-owned service/CLI code and downstream RAWR-owned Codex runtime materials. | Added integration topology to downstream plan and `INTEGRATION_SPEC.md`. |
| HR-CODEX-002 | blocking | closed | A service-only unit test would not prove final Codex plugin-system parity. | Added final plugin-system proof flow and Codex runtime gates. |
| HR-CODEX-003 | blocking | closed | Using `hyperresearch research` could accidentally pass as parity while bypassing the 16-step harness. | Marked `research` unsupported in parity matrix and test plan. |
| HR-CODEX-004 | blocking | closed | First service draft was flat and let the CLI call runner internals directly, violating current service-package topology. | Added `src/service/*`, module contract/router, `createClient`, and moved concrete Node resources into the CLI plugin binding. |
| HR-CODEX-005 | blocking | closed | Initial tests did not call through the service client and would miss package-boundary regressions. | Added service-shape coverage and switched synthetic runtime tests to `createClient(...).runtime.runSyntheticSlice(...)`. |
| HR-CODEX-006 | blocking | closed | Installed Hyperresearch 0.8.5 CLI argument shapes differ from the first synthetic runner draft. | Updated runner calls to `note new --json <title>` and `export json --json`; tests assert exact argument vectors. |
| HR-CODEX-007 | blocking | closed | Downstream `rawr-hq` still lacked Hyperresearch Codex runtime material for the current agent-sync path. | Added `plugins/agents/hyperresearch` with skill, workflow, role agents, and copied spec references; synced it into Codex. Hook/MCP drafts were demoted to references until real configs exist. |
| HR-CODEX-008 | warning | open | Codex hook and plugin-packaged custom-agent semantics are not yet proven in this environment. | Keep as guarded workaround; require fixture before default enablement. |
| HR-CODEX-009 | warning | closed | Full V8 parity matrix still needs one row per step and role agent before workstream 3 can start. | Closed by the V8 step and role-agent adapter matrix in `PARITY_MATRIX.md`. |
| HR-CODEX-010 | warning | closed | New worktree lacked local `node_modules`, so Nx project discovery could fail there even though package metadata is present. | Ran `bun install`; Nx now discovers both new projects and package-scoped Nx typecheck/test gates pass. |
| HR-CODEX-011 | blocking | closed | The new CLI plugin was built to `dist/commands` but its package metadata pointed oclif at the wrong `dist/plugins/...` path. | Updated `plugins/cli/hyperresearch/package.json` to `oclif.commands=./dist/commands`; `apps/cli` fixture smoke now finds `rawr hyperresearch codex-slice`. |
| HR-CODEX-012 | warning | open | Global `rawr plugins sync drift --agent codex` remains red because of pre-existing workspace plugin drift/residuals outside the Hyperresearch plugin. | Hyperresearch scoped sync is conflict-free and in sync; do not treat global drift as introduced by this slice, but keep it visible before final release gating. |
| HR-CODEX-013 | blocking | closed | Service root exposed runner, ledger, step loader, CLI helper, and integrity internals; service behavior lived in top-level files. | Moved runtime internals under `src/service/modules/runtime`, added `src/service/shared/resources.ts`, narrowed root exports, and added a structural service-shape ratchet. |
| HR-CODEX-014 | blocking | closed | Blocking integrity findings did not fail the CLI command path. | `rawr hyperresearch codex-slice` now returns `ok:false` and exits nonzero when blocking integrity findings exist; plugin test covers missing-step failure. |
| HR-CODEX-015 | blocking | closed | Draft hook/MCP notes were under runtime sync directories and could be misread as enabled runtime material. | Moved hook/MCP drafts into skill references and require real verified config before placing anything under `hooks/` or `mcp/`. |
| HR-CODEX-016 | warning | closed | Synced-skill invocation inside an actual Codex session had not been run. | Ran `codex exec` in a fresh read-only session against downstream `rawr-hq`; the session discovered `hyperresearch-codex`, read the installed skill, and reported its required first move/current runtime boundary. This proves skill discoverability only, not full V8 execution. |
| HR-CODEX-017 | blocking | closed | V8 implementation can accidentally move orchestration into the oclif plugin instead of the service state machine. | Added V8 state-machine procedures under `services/hyperresearch-codex`; CLI commands remain service-client callers. |
| HR-CODEX-018 | blocking | closed | V8 implementation can silently continue after required CLI failure or resume mismatched ledger inputs. | Required CLI failures block the active step, failed agent outputs block permanently, V8 start rejects mismatched existing ledgers, and tests cover these paths. |
| HR-CODEX-019 | blocking | closed | Current downstream plugin material documented the slice but did not yet drive the start/advance/agent-packet loop. | Updated downstream skill/workflow/references around `rawr hyperresearch codex start`, `advance --agent-mode packets`, `validate`, and `run-fixture`; scoped Codex sync is conflict-free. |
| HR-CODEX-020 | blocking | closed | Procedure input/output schemas can drift into service entities, making core domain concepts depend on transport surface details. | Procedure schemas now live in `contract.ts`; `entities.ts` keeps resolved durable concepts such as ledgers, steps, agent jobs, integrity findings, and CLI calls. |
| HR-CODEX-021 | warning | closed | Router handlers can become same-shape facades over helpers, adding an extra abstraction without service-level orchestration value. | Runner APIs now take explicit procedure input plus required runtime dependencies rather than optional context-shaped options; router handlers are limited to oRPC context binding, while the service state machine remains in the runtime module. |

## Phase Exit

Spec packet is sufficient for the current minimal runtime slice when:

- `HR-CODEX-001` through `HR-CODEX-003` remain closed.
- Component tests pass.
- Any open warnings are explicitly carried into the next loop.

Full V8 implementation may start after this review loop because the adapter matrix now has rows for all 16 steps and all role agents.

Carried dispositions:

- `HR-CODEX-008`: guarded workaround. Hooks/custom-agent packaging are not the acceptance proof; runner gates and synced skill execution are.
- `HR-CODEX-009`: closed by the V8 step and role-agent adapter matrix in `PARITY_MATRIX.md`.
- `HR-CODEX-012`: release-visible warning only. Hyperresearch scoped sync must be clean; unrelated global drift is not an implementation blocker.
- `HR-CODEX-019`: closed by downstream start/advance workflow material and scoped Codex sync proof.
- `HR-CODEX-020`: closed by keeping public input/output schemas in `contract.ts` and only standalone durable domain schemas in `entities.ts`.
- `HR-CODEX-021`: closed by separating procedure input from runtime dependency injection and avoiding optional-context runner options.
