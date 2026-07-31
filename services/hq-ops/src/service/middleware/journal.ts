import { base } from "../base";
import { createJournalStore } from "../db/stores/journal";

/** Projects the narrow service-owned Journal store through the provided context lane. */
export const middleware = base.middleware(async ({ context, next }) => {
  const resources = context.deps.resources;
  const journalStore = createJournalStore({
    fs: resources.fs,
    path: resources.path,
    repoRoot: context.scope.repoRoot,
    indexDatabase: resources.journalIndexDatabase,
  });

  return next({
    context: {
      provided: {
        ...context.provided,
        journalStore,
      },
    },
  });
});
