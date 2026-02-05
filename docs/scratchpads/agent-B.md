# Agent B Scratchpad (CLI + core)

## Slice scope

- Worktree: `worktrees/wt-agent-B-rawr-cli`
- Owned paths: `apps/cli/**`, `packages/core/**`

## Decisions / contracts

### `@rawr/core` — `RawrCommand`

- Shared flags: `--json`, `--dry-run`, `--yes` (also `-y`).
- JSON output shape (minimal):
  - Success: `{ ok: true, data?: T, meta?: Record<string, unknown> }`
  - Failure: `{ ok: false, error: { message, code?, details? }, meta? }`
- Human output default:
  - success: prints `ok`
  - error: prints `error: <message>`

### CLI command stubs (stable UX)

- `rawr tools export`
  - `--json`: structured list of known commands.
  - human: prints `command - description` per line.
- `rawr plugins list`
  - lists directories under workspace `./plugins` and uses plugin `package.json#name` if present.
  - `--json`: returns `{ workspaceRoot, plugins: [{ id, name?, dirName, absPath }] }`.
- `rawr plugins enable <id>`
  - `id` can be plugin dir name (e.g. `hello`) or package name (e.g. `@rawr/plugin-hello`).
  - MVP does not persist enablement; just runs gate + reports.
- `rawr security check`
  - wraps `@rawr/security.runSecurityCheck`.
  - human: prints `ok` / `failed` based on `report.ok === false`.
- `rawr security report`
  - wraps `@rawr/security.getSecurityReport`.
  - human: prints JSON report.

## Ask to Agent C (`@rawr/security` minimal API)

CLI currently expects these exports (names + args are the contract):

- `runSecurityCheck(opts: { cwd: string; dryRun?: boolean; yes?: boolean }): Promise<{ ok: boolean; [k: string]: unknown }>`
- `getSecurityReport(opts: { cwd: string }): Promise<unknown>` (can be `{ ok: boolean, ... }` or `null`; CLI just prints it)
- `evaluateEnablement(pluginId: string, opts: { cwd: string; dryRun?: boolean; yes?: boolean }): Promise<unknown>`

Notes:
- CLI treats missing exports as `NOT_IMPLEMENTED` and exits `2` (until engine lands).
- If you prefer different names/arg shapes, tell me and I’ll adjust the call sites.

## Test notes

- Added `apps/cli/test/stubs.test.ts` covering:
  - `tools export --json` returns expected shape.
  - `plugins list --json` finds `@rawr/plugin-hello`.
  - `plugins enable`, `security check`, `security report` currently fail with exit code `2` until `@rawr/security` exports land.

