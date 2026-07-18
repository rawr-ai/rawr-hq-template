import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.packaging
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      packaging: context.deps.packaging,
    },
  }));
