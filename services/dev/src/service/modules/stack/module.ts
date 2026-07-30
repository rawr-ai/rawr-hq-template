import { createScratchPolicyChecker } from "#dev-service/model/policy/scratch-policy";
import { service } from "../../impl";

/** Curates Graphite execution and shared scratch admission for stack operations. */
export const module = service.stack.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      process: context.deps.resources.process,
      checkScratchPolicy: createScratchPolicyChecker({
        workspaceRoot: context.scope.workspaceRoot,
        fs: context.deps.resources.fs,
        path: context.deps.resources.path,
      }),
    },
  })
);
