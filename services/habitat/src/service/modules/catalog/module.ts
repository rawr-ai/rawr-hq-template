import { service } from "../../impl.js";

/** Catalog implementer exposing the vocabulary required by resolve and check. */
export const module = service.catalog.use(async ({ context, next }) =>
  next({
    context: {
      fileSystem: context.deps.fileSystem,
      path: context.deps.path,
      ruleEvaluation: context.deps.ruleEvaluation,
      sourceInventory: context.deps.sourceInventory,
      workspaceRoot: context.scope.workspaceRoot,
      policyPack: context.config.policyPack,
    },
  })
);
