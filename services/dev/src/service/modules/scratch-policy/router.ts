import { checkScratchPolicy as checkScratchPolicyPolicy } from "#dev-service/model/policy/scratch-policy";
import { module } from "./module";

const check = module.check.handler(async ({ context, input }) => {
  return checkScratchPolicyPolicy({
    workspaceRoot: context.workspaceRoot,
    resources: context.resources,
    request: input,
  });
});

export const router = module.router({
  check,
});
