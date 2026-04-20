import { searchSnippetsSemantic } from "./helpers/semantic";
import {
  openJournalDb,
  readSnippetJson,
  searchSnippetsFts,
  tailIndexedSnippets,
  upsertSnippet,
  writeEventJson,
  writeSnippetJson,
} from "./helpers/storage";
import { module } from "./module";

const writeEvent = module.writeEvent.handler(async ({ context, input }) => {
  const path = await writeEventJson(context.deps.resources, context.scope.repoRoot, input);
  return { path };
});

const writeSnippet = module.writeSnippet.handler(async ({ context, input }) => {
  const resources = context.deps.resources;
  const repoRoot = context.scope.repoRoot;
  const path = await writeSnippetJson(resources, repoRoot, input);

  let db: Awaited<ReturnType<typeof openJournalDb>> | undefined;
  try {
    db = await openJournalDb(resources, repoRoot);
    upsertSnippet(db, input);
  } catch {
    // JSON remains the source of truth even if the sqlite index is unavailable.
  } finally {
    db?.close();
  }

  return { path };
});

const getSnippet = module.getSnippet.handler(async ({ context, input }) => {
  return { snippet: await readSnippetJson(context.deps.resources, context.scope.repoRoot, input.id) };
});

const tailSnippets = module.tailSnippets.handler(async ({ context, input }) => {
  const db = await openJournalDb(context.deps.resources, context.scope.repoRoot);
  try {
    return { snippets: tailIndexedSnippets(db, input.limit) };
  } finally {
    db.close();
  }
});

const searchSnippets = module.searchSnippets.handler(async ({ context, input }) => {
  const db = await openJournalDb(context.deps.resources, context.scope.repoRoot);
  try {
    if (input.mode === "semantic") {
      try {
        return {
          mode: input.mode,
          snippets: await searchSnippetsSemantic(context.deps.resources, db, input.query, input.limit),
        };
      } catch (error) {
        return {
          mode: input.mode,
          warning: error instanceof Error ? error.message : String(error),
          snippets: [],
        };
      }
    }

    return { mode: input.mode, snippets: searchSnippetsFts(db, input.query, input.limit) };
  } finally {
    db.close();
  }
});

export const router = module.router({
  writeEvent,
  writeSnippet,
  getSnippet,
  tailSnippets,
  searchSnippets,
});
