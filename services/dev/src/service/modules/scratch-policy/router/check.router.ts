import { checkScratchPolicy } from "#dev-service/model/policy/scratch-policy";
import { module } from "../module";

/** Observes scratch artifacts and evaluates the service-owned admission policy. */
export const check = module.check.handler(async ({ context, input }) => {
  return checkScratchPolicy({
    workspaceRoot: context.workspaceRoot,
    fs: context.fs,
    path: context.path,
    request: input,
  });
});
