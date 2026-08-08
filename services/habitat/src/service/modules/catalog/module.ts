import { service } from "../../impl.js";
import { currentCatalog } from "./middleware/index.js";

/** Catalog implementer exposing the vocabulary required by resolve and check. */
export const module = service.catalog.use(currentCatalog).use(async ({ context, next }) =>
  next({
    context: {
      currentCatalog: context.currentCatalog,
      fileSystem: context.deps.fileSystem,
      path: context.deps.path,
      ruleEvaluation: context.deps.ruleEvaluation,
      sourceInventory: context.deps.sourceInventory,
      workspaceRoot: context.scope.workspaceRoot,
    },
  })
);
