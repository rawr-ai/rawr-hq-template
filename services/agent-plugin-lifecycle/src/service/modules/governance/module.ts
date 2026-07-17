import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.governance
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      runtime: context.deps.governance,
    },
  }));
