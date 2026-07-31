import { module } from "../module";

/** Returns the newest indexed Journal snippets within the admitted bound. */
export const tailSnippets = module.tailSnippets.handler(async ({ context, input }) => ({
  snippets: await context.journalStore.withIndex((index) => index.tailSnippets(input.limit)),
}));
