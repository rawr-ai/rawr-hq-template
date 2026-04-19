import { module } from "./module";

const planWorkspaceSync = module.planWorkspaceSync.handler(async ({ context, input }) => {
  return context.repo.planWorkspaceSync(input);
});

const assessWorkspaceSync = module.assessWorkspaceSync.handler(async ({ context, input }) => {
  return context.repo.assessWorkspaceSync(input);
});

const evaluateFullSyncPolicy = module.evaluateFullSyncPolicy.handler(async ({ context, input }) => {
  return context.repo.evaluateFullSyncPolicy(input);
});

export const router = module.router({
  planWorkspaceSync,
  assessWorkspaceSync,
  evaluateFullSyncPolicy,
});
