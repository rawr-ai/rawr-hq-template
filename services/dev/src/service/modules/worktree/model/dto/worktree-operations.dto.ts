import { type Static, Type } from "typebox";
import {
  DevCommandStepSchema,
  DevExecutionSchema,
  DevopsActionSchema,
  DevPreflightSchema,
} from "../../../../model/dto/operation-outcomes.dto";
import {
  ScratchPolicyCheckSchema,
  ScratchPolicyInputSchema,
} from "../../../../model/dto/scratch-policy.dto";

/** Controls for selecting and optionally removing qualified Git worktrees. */
export const WorktreeCleanupInputSchema = Type.Object(
  {
    apply: Type.Optional(Type.Boolean()),
    prefix: Type.String({ minLength: 1 }),
    mergedOnly: Type.Optional(Type.Boolean()),
    trunk: Type.Optional(Type.String({ minLength: 1 })),
    pinnedPaths: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    pinnedBranches: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    scratchPolicy: Type.Optional(ScratchPolicyInputSchema),
  },
  { additionalProperties: false }
);

/** Ordered selection and execution result for one Git worktree cleanup. */
export const WorktreeCleanupResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    action: DevopsActionSchema,
    prefix: Type.String({ minLength: 1 }),
    candidates: Type.Array(
      Type.Object(
        {
          path: Type.String({ minLength: 1 }),
          branch: Type.Union([Type.String(), Type.Null()]),
          reason: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false }
      )
    ),
    skipped: Type.Array(
      Type.Object(
        {
          path: Type.String({ minLength: 1 }),
          reason: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false }
      )
    ),
    removed: Type.Array(DevCommandStepSchema),
    followUpCommands: Type.Array(DevCommandStepSchema),
    preflight: DevPreflightSchema,
    execution: DevExecutionSchema,
    scratchPolicy: ScratchPolicyCheckSchema,
  },
  { additionalProperties: false }
);

/** Controls for selecting and optionally removing qualified Git worktrees. */
export type WorktreeCleanupInput = Static<typeof WorktreeCleanupInputSchema>;

/** Ordered selection and execution result for one Git worktree cleanup. */
export type WorktreeCleanupResult = Static<typeof WorktreeCleanupResultSchema>;
