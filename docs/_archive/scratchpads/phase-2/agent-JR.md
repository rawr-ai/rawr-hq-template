# Agent JR scratchpad — Journal + Reflect

## Ownership
- `packages/journal/**`
- `apps/cli/src/index.ts` instrumentation
- `apps/cli/src/commands/journal/**`
- `apps/cli/src/commands/reflect.ts`

## Notes / decisions

- Journal is repo-local and metadata-first:
  - events: `.rawr/journal/events/*.json`
  - snippets: `.rawr/journal/snippets/*.json`
  - index: `.rawr/journal/index.sqlite` (FTS5)
- CLI instrumentation wraps oclif execution and writes:
  - a `JournalEvent` for every invocation (best-effort)
  - a compact `command` snippet (no stdout/stderr capture by default)
- Retrieval defaults are intentionally small: `--limit 10`, hard cap `15`.
- `journal search --semantic` is optional and only activates when `OPENAI_API_KEY` or `VOYAGE_API_KEY` exists in env.
  - Semantic search is bounded to a recent-candidate window (defaults to 200 snippets) to avoid runaway calls.
