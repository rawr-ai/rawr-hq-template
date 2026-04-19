// Transitional seam for the agent-config-sync cutover.
// Command surfaces should import through this file so the final package flip
// to services/agent-config-sync + packages/agent-config-sync-host stays local.

// Future service-owned surface.
export {
  beginPluginsSyncUndoCapture,
  effectiveContentForProvider,
  planSyncAll,
  PLUGINS_SYNC_UNDO_PROVIDER,
  resolveSourceScopeForPath,
  retireStaleManagedPlugins,
  runSync,
  scopeAllows,
} from "@rawr/agent-sync";

// Future host-owned surface.
export {
  installAndEnableClaudePlugin,
  packageCoworkPlugin,
  resolveDefaultCoworkOutDir,
  resolveSourcePlugin,
  resolveTargets,
  scanSourcePlugin,
} from "@rawr/agent-sync";

export type {
  SourceContent,
  SourcePlugin,
  SyncItemResult,
  SyncRunResult,
  SyncScope,
} from "@rawr/agent-sync";
