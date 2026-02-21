export type RepoState = {
  version: 1;
  plugins: {
    enabled: string[];
    disabled?: string[];
    lastUpdatedAt: string;
  };
};

export type RepoStateMutator = (current: RepoState) => RepoState | Promise<RepoState>;

export type RepoStateMutationOptions = {
  lockTimeoutMs?: number;
  retryDelayMs?: number;
  staleLockMs?: number;
};

export type RepoStateMutationResult = {
  state: RepoState;
  statePath: string;
  lockPath: string;
  attempts: number;
  waitedMs: number;
};
