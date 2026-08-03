import { module } from "../module";

/** Clears one session's cached search text or the complete service-owned index. */
export const clearIndex = module.clearIndex.handler(async ({ context, input }) => {
  if (input.path) {
    await context.searchTextStore.clear(input.path);
  } else {
    await context.searchTextStore.clearAll();
  }
  return { cleared: true };
});
