import { service } from "../../impl";

export const module = service.search.use(async ({ context, next }) =>
  next({
    context: {
      sourceRuntime: context.deps.sessionSourceRuntime,
      codexDiscoveryStore: context.provided.codexDiscoveryStore,
      searchTextStore: context.provided.searchTextStore,
    },
  })
);
