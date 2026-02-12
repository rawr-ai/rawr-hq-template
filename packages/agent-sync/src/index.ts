export { ensureClaudeMarketplace, installAndEnableClaudePlugin } from "./lib/claude-cli";
export { packageCoworkPlugin } from "./lib/cowork-package";
export { effectiveContentForProvider, resolveDefaultCoworkOutDir } from "./lib/effective-content";
export { loadLayeredRawrConfigForCwd } from "./lib/layered-config";
export { resolveSourcePlugin } from "./lib/resolve-source-plugin";
export { retireStaleManagedPlugins } from "./lib/retire-stale-managed";
export { scanSourcePlugin } from "./lib/scan-source-plugin";
export { resolveSourceScopeForPath, scopeAllows } from "./lib/source-scope";
export { planSyncAll } from "./lib/sync-all";
export { runSyncFromCli } from "./lib/sync-cli";
export { runSync } from "./lib/sync-engine";
export {
  PLUGINS_SYNC_UNDO_PROVIDER,
  beginPluginsSyncUndoCapture,
  clearActiveUndoCapsule,
  expireUndoCapsuleOnUnrelatedCommand,
  loadActiveUndoCapsule,
  runUndoForWorkspace,
} from "./lib/sync-undo";
export { resolveTargets } from "./lib/targets";
export type {
  ClaimedSets,
  SourceContent,
  SourcePlugin,
  SyncAction,
  SyncAgent,
  SyncItemResult,
  SyncOptions,
  SyncRunResult,
  SyncScope,
  SyncTargetResult,
} from "./lib/types";
export type {
  UndoApplyItem,
  UndoCapsule,
  UndoCapsuleStatus,
  UndoOperation,
  UndoPathKind,
  UndoRunResult,
} from "./lib/sync-undo";
export { findWorkspaceRoot, listWorkspacePluginDirs, loadSourcePluginFromPath } from "./lib/workspace";
