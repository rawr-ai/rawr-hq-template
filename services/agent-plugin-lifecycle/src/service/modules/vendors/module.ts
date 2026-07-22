import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.vendors
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) =>
    next({
      context: {
        contentWorkspace: context.deps.contentWorkspace,
        clock: context.deps.clock,
      },
    })
  );
