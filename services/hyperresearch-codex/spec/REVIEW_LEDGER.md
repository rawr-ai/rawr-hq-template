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
| HR-CODEX-009 | warning | open | Full V8 parity matrix still needs one row per step and role agent before workstream 3 can start. | Treat the current matrix as a workstream-2 control-plane matrix only. |
| HR-CODEX-010 | warning | closed | New worktree lacked local `node_modules`, so Nx project discovery could fail there even though package metadata is present. | Ran `bun install`; Nx now discovers both new projects and package-scoped Nx typecheck/test gates pass. |
| HR-CODEX-011 | blocking | closed | The new CLI plugin was built to `dist/commands` but its package metadata pointed oclif at the wrong `dist/plugins/...` path. | Updated `plugins/cli/hyperresearch/package.json` to `oclif.commands=./dist/commands`; `apps/cli` fixture smoke now finds `rawr hyperresearch codex-slice`. |
| HR-CODEX-012 | warning | open | Global `rawr plugins sync drift --agent codex` remains red because of pre-existing workspace plugin drift/residuals outside the Hyperresearch plugin. | Hyperresearch scoped sync is conflict-free and in sync; do not treat global drift as introduced by this slice, but keep it visible before final release gating. |
| HR-CODEX-013 | blocking | closed | Service root exposed runner, ledger, step loader, CLI helper, and integrity internals; service behavior lived in top-level files. | Moved runtime internals under `src/service/modules/runtime`, added `src/service/shared/resources.ts`, narrowed root exports, and added a structural service-shape ratchet. |
| HR-CODEX-014 | blocking | closed | Blocking integrity findings did not fail the CLI command path. | `rawr hyperresearch codex-slice` now returns `ok:false` and exits nonzero when blocking integrity findings exist; plugin test covers missing-step failure. |
| HR-CODEX-015 | blocking | closed | Draft hook/MCP notes were under runtime sync directories and could be misread as enabled runtime material. | Moved hook/MCP drafts into skill references and require real verified config before placing anything under `hooks/` or `mcp/`. |
| HR-CODEX-016 | warning | open | Synced-skill invocation inside an actual Codex session has not been run. | Service/CLI fixture proof and Codex sync are green, but runtime gate 3 remains pending before claiming final plugin-system proof. |

## Phase Exit

Spec packet is sufficient for the current minimal runtime slice when:

- `HR-CODEX-001` through `HR-CODEX-003` remain closed.
- Component tests pass.
- Any open warnings are explicitly carried into the next loop.

Full V8 implementation must not start until the adapter matrix has rows for all 16 steps and all role agents, and `HR-CODEX-008`, `HR-CODEX-009`, `HR-CODEX-012`, and `HR-CODEX-016` have explicit dispositions.
