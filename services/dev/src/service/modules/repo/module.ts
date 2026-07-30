import { createScratchPolicyChecker } from "#dev-service/model/policy/scratch-policy";
import { service } from "../../impl";

/** Curates repository execution, naming, and shared scratch admission capabilities. */
export const module = service.repo.use(async ({ context, next }) =>
  next({
    context: {
      workspaceRoot: context.scope.workspaceRoot,
      process: context.deps.resources.process,
      clock: context.deps.resources.clock,
      checkScratchPolicy: createScratchPolicyChecker({
        workspaceRoot: context.scope.workspaceRoot,
        fs: context.deps.resources.fs,
        path: context.deps.resources.path,
      }),
    },
  })
);
