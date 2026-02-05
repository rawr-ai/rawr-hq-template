# Reflect Current Surface (Implemented Only)

This reference documents only behavior that exists now.

## Storage model

- Repo-local journal root: `.rawr/journal`
- Event JSON files: `.rawr/journal/events/*.json`
- Snippet JSON files: `.rawr/journal/snippets/*.json`
- SQLite index: `.rawr/journal/index.sqlite`

Code pointers:
- `packages/journal/src/paths.ts`
- `packages/journal/src/writer.ts`
- `packages/journal/src/index-db.ts`

## Automatic journaling behavior

The CLI attempts to write, per invocation:

1. A `JournalEvent` with runtime metadata:
   - `cwd`, `argv`, `commandId`, `exitCode`, `durationMs`, optional `steps` and `artifacts`
2. A compact `command` snippet linked by `sourceEventId`

These writes are best-effort and do not block command execution on failure.

Code pointers:
- `apps/cli/src/index.ts`
- `apps/cli/src/lib/journal-context.ts`
- `packages/journal/src/types.ts`

## Command surface

### `rawr journal tail`
- Description: show most recent snippets.
- Flag: `--limit` default `10`, min `1`, max `15`.

Code pointers:
- `apps/cli/src/commands/journal/tail.ts`

### `rawr journal search`
- Description: search journal snippets.
- Flags:
  - `--query` required
  - `--limit` default `10`, min `1`, max `15`
  - `--semantic` optional (falls back to keyword search if unavailable)
- Semantic search uses provider env keys and bounded candidate window.

Code pointers:
- `apps/cli/src/commands/journal/search.ts`
- `packages/journal/src/semantic.ts`
- `packages/control-plane/src/index.ts` (semantic candidateLimit clamped/defaulted)

### `rawr journal show <id>`
- Description: show one snippet body by id.
- Reads snippet JSON at `.rawr/journal/snippets/<id>.json`.

Code pointers:
- `apps/cli/src/commands/journal/show.ts`

### `rawr reflect`
- Description: suggest durable commands/workflows from recent activity.
- Flag: `--limit` default `10`, min `3`, max `15`.
- Heuristic:
  - considers recent snippets from SQLite tail
  - only `kind === "command"` snippets
  - groups by command tag
  - proposes a suggestion when count >= `3`
  - returns up to `10` suggestions

Code pointers:
- `apps/cli/src/commands/reflect.ts`

## Explicit exclusions in current implementation

- No command to directly author arbitrary reflection notes via CLI.
- No implemented `rawr journal gc`.
- No implemented `rawr journal redact`.
- No retention automation command surface in current CLI.
