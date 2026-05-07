import { module } from "../module";
import { syncCodexNativeAgentRoles } from "./codex-native-agent-roles.router";
import { resolveProviderContent, runSync } from "./provider-sync.router";

export const router = module.router({
  runSync,
  syncCodexNativeAgentRoles,
  resolveProviderContent,
});
