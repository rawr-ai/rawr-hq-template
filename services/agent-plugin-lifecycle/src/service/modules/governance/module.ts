import { impl } from "../../impl";
import { analytics, observability, repositories } from "./middleware";

export const module = impl.governance
  .use(observability)
  .use(analytics)
  .use(repositories)
  .use(async ({ context, next }) =>
    next({
      context: {
        git: context.provided.git,
      },
    })
  );
