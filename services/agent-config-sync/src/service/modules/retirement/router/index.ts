import { module } from "../module";
import { cleanupBehindProviderSync } from "./cleanup-behind-provider-sync.router";
import { retireStaleManaged } from "./retire-stale-managed.router";

export const router = module.router({
  retireStaleManaged,
  cleanupBehindProviderSync,
});
