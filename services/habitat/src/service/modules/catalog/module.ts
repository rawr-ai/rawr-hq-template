import { service } from "../../impl";

/** Catalog implementer with only the vocabulary required by resolve. */
export const module = service.catalog.use(async ({ context, next }) =>
  next({
    context: {
      fileSystem: context.deps.fileSystem,
      path: context.deps.path,
      ruleEvaluation: context.deps.ruleEvaluation,
      workspaceRoot: context.scope.workspaceRoot,
    },
  })
);
