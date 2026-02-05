# `rawr journal …`

- Read/query UX for `.rawr/journal/**` snippets (JSON + sqlite index).
- Uses `@rawr/journal`’s sqlite helpers (`openJournalDb`, `tailSnippets`, `searchSnippetsFts`).
- `journal search --semantic` is currently a UX flag only (falls back to keyword search).

## Next
- `tail.ts` — show recent snippets
- `search.ts` — FTS search over snippets
- `show.ts` — show one snippet by id
- `../../../../packages/journal/AGENTS.md` — storage + indexing details

