import { impl } from "../../impl";
import { analytics, observability } from "./middleware";
import { createRepository } from "./repository";

export const module = impl.search
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      repo: createRepository(context.deps.sessionSourceRuntime, context.deps.sessionIndexRuntime),
    },
  }));
