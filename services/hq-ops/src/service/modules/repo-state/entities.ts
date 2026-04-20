import { type Static, Type } from "typebox";

export const RepoStateSchema = Type.Object(
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
);

export type RepoState = Static<typeof RepoStateSchema>;

export type RepoStateMutator = (current: RepoState) => RepoState | Promise<RepoState>;

export type RepoStateMutationOptions = {
  lockTimeoutMs?: number;
  retryDelayMs?: number;
  staleLockMs?: number;
};

export type RepoStateMutationResult =
  | {
      ok: true;
      state: RepoState;
      statePath: string;
      lockPath: string;
      attempts: number;
      waitedMs: number;
    }
  | {
      ok: false;
      code: "REPO_STATE_LOCK_TIMEOUT";
      lockPath: string;
    };

export type RepoStateMutationSuccess = Extract<RepoStateMutationResult, { ok: true }>;
export type RepoStateMutationFailure = Extract<RepoStateMutationResult, { ok: false }>;
