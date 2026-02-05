# `@rawr/journal`

- Repo-local journal storage under `.rawr/journal/` (event/snippet JSON) with an optional sqlite index for search.
- Write path is “best effort”: JSON is the source of truth; sqlite is an index (can be rebuilt).
- Primary consumers are CLI instrumentation + `rawr journal …` commands.

## Next
- `src/index.ts` — public exports
- `src/writer.ts` — `writeEvent()`, `writeSnippet()` (writes JSON; updates sqlite best-effort)
- `src/index-db.ts` — `openJournalDb()`, `tailSnippets()`, `searchSnippetsFts()`
- `src/paths.ts` — `.rawr/journal` path helpers
- `../../apps/cli/src/commands/journal/AGENTS.md` — query UX

