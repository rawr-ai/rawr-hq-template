import { checkScratchPolicy as checkScratchPolicyPolicy } from "#dev-service/model/policy/scratch-policy";
import { module } from "./module";

const check = module.check.handler(async ({ context, input }) => {
  return checkScratchPolicyPolicy({
    workspaceRoot: context.workspaceRoot,
    fs: context.fs,
    path: context.path,
    request: input,
  });
});

export const router = module.router({
  check,
});
