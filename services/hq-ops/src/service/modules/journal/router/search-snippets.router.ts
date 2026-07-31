import { rankSemanticSnippets } from "../model/policy/semantic-ranking";
import { module } from "../module";

/** Searches the ready Journal index using the caller-selected strategy. */
export const searchSnippets = module.searchSnippets.handler(async ({ context, input }) => {
  if (input.mode === "semantic") {
    const config = context.embeddings.getConfig();
    if (!config) {
      return {
        mode: input.mode,
        warning: "Semantic search not configured (missing embedding provider configuration)",
        snippets: [],
      };
    }

    return {
      mode: input.mode,
      snippets: await context.journalStore.withIndex((index) =>
        rankSemanticSnippets({
          index,
          embeddings: context.embeddings,
          config,
          limit: input.limit,
          query: input.query,
        })
      ),
    };
  }

  return {
    mode: input.mode,
    snippets: await context.journalStore.withIndex((index) =>
      index.searchFts(input.query, input.limit)
    ),
  };
});
