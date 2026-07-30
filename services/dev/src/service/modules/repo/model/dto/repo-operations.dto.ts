import { type Static, Type } from "typebox";
import {
  DevCommandStepSchema,
  DevExecutionSchema,
  DevopsActionSchema,
  DevPreflightSchema,
} from "#dev-service/model/dto/operation-outcomes.dto";
import {
  ScratchPolicyCheckSchema,
  ScratchPolicyInputSchema,
} from "#dev-service/model/dto/scratch-policy.dto";

/** Controls for synchronizing one clean workspace with its configured upstream ref. */
export const RepoSyncUpstreamInputSchema = Type.Object(
  {
    apply: Type.Optional(Type.Boolean()),
    upstreamRef: Type.Optional(Type.String({ minLength: 1 })),
    branchPrefix: Type.Optional(Type.String({ minLength: 1 })),
    scratchPolicy: Type.Optional(ScratchPolicyInputSchema),
  },
  { additionalProperties: false }
);

/** Ordered plan and execution result for one upstream synchronization. */
export const RepoSyncUpstreamResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    action: DevopsActionSchema,
    branchName: Type.String({ minLength: 1 }),
    upstreamRef: Type.Object(
      {
        ref: Type.String({ minLength: 1 }),
        source: Type.Union([
          Type.Literal("flag"),
          Type.Literal("git-config"),
          Type.Literal("default"),
        ]),
      },
      { additionalProperties: false }
    ),
    currentBranch: Type.Union([Type.String(), Type.Null()]),
    steps: Type.Array(DevCommandStepSchema),
    preflight: DevPreflightSchema,
    execution: DevExecutionSchema,
    scratchPolicy: ScratchPolicyCheckSchema,
  },
  { additionalProperties: false }
);

/** Controls for synchronizing one clean workspace with its configured upstream ref. */
export type RepoSyncUpstreamInput = Static<typeof RepoSyncUpstreamInputSchema>;

/** Ordered plan and execution result for one upstream synchronization. */
export type RepoSyncUpstreamResult = Static<typeof RepoSyncUpstreamResultSchema>;
