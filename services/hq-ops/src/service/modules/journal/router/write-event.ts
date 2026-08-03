import { module } from "../module";

/** Writes one canonical append-only Journal event. */
export const writeEvent = module.writeEvent.handler(async ({ context, input }) => ({
  path: await context.journalStore.writeEvent(input),
}));
