import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.providers
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      runtime: Object.freeze({
        providers: context.deps.providers,
        governance: context.deps.governance,
      }),
    },
  }));
