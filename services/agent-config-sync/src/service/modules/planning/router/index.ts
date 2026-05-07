import { module } from "../module";
import { evaluateFullSyncPolicy } from "./full-sync-policy.router";
import { assessWorkspaceSync, planWorkspaceSync } from "./workspace-sync.router";

export const router = module.router({
  planWorkspaceSync,
  assessWorkspaceSync,
  evaluateFullSyncPolicy,
});
