import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.search
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      sourceRuntime: context.deps.sessionSourceRuntime,
      indexRuntime: context.deps.sessionIndexRuntime,
    },
  }));
