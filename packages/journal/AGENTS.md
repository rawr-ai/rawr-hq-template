# @rawr/journal

## TOC
- [Purpose](#purpose)
- [Entry points](#entry-points)
- [Tests](#tests)
- [Consumers](#consumers)

## Purpose
- Repo-local journal storage under `.rawr/journal/` (event/snippet JSON) with an optional SQLite index for search.

## Entry points
- `src/index.ts`: exports journal types + helpers.
- `src/writer.ts`: `writeEvent`, `writeSnippet` (writes JSON; best-effort updates sqlite index).
- `src/index-db.ts`: `openJournalDb`, `upsertSnippet`, `tailSnippets`, `searchSnippetsFts` (Bun `bun:sqlite`).
- `src/paths.ts`: `.rawr/journal` path helpers.

## Tests
- No package-local tests currently (script uses `vitest run` if/when tests exist).

## Consumers
- `apps/cli` (`@rawr/cli`).

## Reflection skill
- Canonical agent reflection guidance lives at `packages/journal/skills/reflect/SKILL.md`.
- Journaling is the storage/retrieval substrate; reflection is the agent-facing usage practice.
