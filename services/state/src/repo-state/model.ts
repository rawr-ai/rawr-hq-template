import { Type } from "typebox";

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

export const RepoStateSchema = Type.Unsafe<RepoState>(
  Type.Object(
    {
      version: Type.Literal(1),
      plugins: Type.Object(
        {
          enabled: Type.Array(Type.String()),
          disabled: Type.Optional(Type.Array(Type.String())),
          lastUpdatedAt: Type.String(),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
);
