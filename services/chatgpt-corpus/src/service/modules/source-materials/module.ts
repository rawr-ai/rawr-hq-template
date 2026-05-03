import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.sourceMaterials
  .use(observability)
  .use(analytics)
  .use(async ({ context, next }) => next({
    context: {
      workspaceStore: context.deps.workspaceStore,
      workspaceRef: context.scope.workspaceRef,
    },
  }));
