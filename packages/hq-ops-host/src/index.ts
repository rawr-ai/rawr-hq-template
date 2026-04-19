/// <reference path="./shims/bun-sqlite.d.ts" />

export {
  createNodeHqOpsBoundary,
  type HqOpsBoundary,
  type HqOpsBoundaryInput,
} from "./boundary";
export {
  createNodeConfigStore,
  type ConfigLayeredResult,
  type ConfigLoadResult,
  type ConfigLoadError,
  type ConfigValidationIssue,
  type RawrConfig,
  type SyncSourcesResult,
} from "./config-store";
export {
  createNodeRepoStateStore,
  defaultRepoState,
  disablePlugin,
  enablePlugin,
  getRepoState,
  getRepoStateWithAuthority,
  mutateRepoStateAtomically,
  setRepoState,
  stateLockPath,
  statePath,
  type RepoState,
  type RepoStateMutationOptions,
  type RepoStateMutationResult,
  type RepoStateMutator,
  type RepoStateSnapshot,
} from "./repo-state-store";
export {
  createNodeJournalStore,
  type JournalEvent,
  type JournalSearchResult,
  type JournalSearchRow,
  type JournalSnippet,
  type JournalWriteResult,
} from "./journal/store";
export {
  createNodeSecurityRuntime,
  type GateEnableResult,
  type RiskTolerance,
  type SecurityFinding,
  type SecurityMode,
  type SecurityReport,
} from "./security/runtime";
