/**
 * hq-ops: journal module.
 *
 * This router implements HQ journaling as a service capability: durable JSON
 * write paths are the source of truth, while the sqlite index is a best-effort
 * acceleration for tail/search operations.
 *
 * Keeping this here prevents projections from owning storage/index policy.
 */
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
  const path = await writeEventJson(context.resources, context.repoRoot, input);
  return { path };
});

const writeSnippet = module.writeSnippet.handler(async ({ context, input }) => {
  const { resources, repoRoot } = context;
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
  return {
    snippet: await readSnippetJson(context.resources, context.repoRoot, input.id),
  };
});

const tailSnippets = module.tailSnippets.handler(async ({ context, input }) => {
  const db = await openJournalDb(context.resources, context.repoRoot);
  try {
    return { snippets: tailIndexedSnippets(db, input.limit) };
  } finally {
    db.close();
  }
});

const searchSnippets = module.searchSnippets.handler(async ({ context, input }) => {
  const db = await openJournalDb(context.resources, context.repoRoot);
  try {
    if (input.mode === "semantic") {
      const config = context.resources.embeddings.getConfig();
      if (!config) {
        return {
          mode: input.mode,
          warning: "Semantic search not configured (missing embedding provider configuration)",
          snippets: [],
        };
      }

      return {
        mode: input.mode,
        snippets: await searchSnippetsSemantic(
          context.resources,
          db,
          config,
          input.query,
          input.limit
        ),
      };
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
