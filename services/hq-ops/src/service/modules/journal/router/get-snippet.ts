import { module } from "../module";

/** Reads one canonical Journal snippet by stable identity. */
export const getSnippet = module.getSnippet.handler(async ({ context, input }) => ({
  snippet: await context.journalStore.getSnippet(input.id),
}));
