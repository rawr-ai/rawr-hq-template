import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.releases
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      releases: context.deps.releases,
    },
  }));
