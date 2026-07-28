import { service } from "../../impl";

export const module = service.catalog.use(async ({ context, next }) =>
  next({
    context: {
      sourceRuntime: context.deps.sessionSourceRuntime,
      indexRuntime: context.deps.sessionIndexRuntime,
    },
  })
);
