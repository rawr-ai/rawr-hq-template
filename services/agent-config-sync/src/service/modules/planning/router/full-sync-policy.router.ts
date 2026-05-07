import { module } from "../module";
import { evaluateFullSyncPolicy as evaluatePolicy } from "../repositories/full-sync-policy-repository";

export const evaluateFullSyncPolicy = module.evaluateFullSyncPolicy.handler(async ({ input }) => {
  return evaluatePolicy(input);
});
