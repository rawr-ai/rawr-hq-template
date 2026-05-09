import { module } from "./module";
import { checkScratchPolicy as checkScratchPolicyHelper } from "./helpers";

const check = module.check.handler(async ({ context, input }) => {
  return checkScratchPolicyHelper({
    workspaceRoot: context.workspaceRoot,
    resources: context.resources,
    request: input,
  });
});

export const router = module.router({
  check,
});
