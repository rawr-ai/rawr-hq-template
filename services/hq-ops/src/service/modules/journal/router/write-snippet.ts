import { module } from "../module";

/** Writes one canonical Journal snippet before attempting its derived index update. */
export const writeSnippet = module.writeSnippet.handler(async ({ context, input }) => {
  const path = await context.journalStore.writeSnippet(input);

  try {
    await context.journalStore.withIndex((index) => index.upsertSnippet(input));
  } catch {
    // Canonical JSON remains authoritative when the derived index cannot update.
  }

  return { path };
});
