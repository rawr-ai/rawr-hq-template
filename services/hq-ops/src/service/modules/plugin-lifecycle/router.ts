import { module } from "./module";

const resolveLifecycleTarget = module.resolveLifecycleTarget.handler(async ({ context, input }) => {
  return context.repo.resolveLifecycleTarget(input);
});

const evaluateLifecycleCompleteness = module.evaluateLifecycleCompleteness.handler(async ({ context, input }) => {
  return context.repo.evaluateLifecycleCompleteness(input);
});

const checkScratchPolicy = module.checkScratchPolicy.handler(async ({ context, input }) => {
  return context.repo.checkScratchPolicy(input);
});

const decideMergePolicy = module.decideMergePolicy.handler(async ({ context, input }) => {
  return context.repo.decideMergePolicy(input);
});

export const router = module.router({
  resolveLifecycleTarget,
  evaluateLifecycleCompleteness,
  checkScratchPolicy,
  decideMergePolicy,
});
