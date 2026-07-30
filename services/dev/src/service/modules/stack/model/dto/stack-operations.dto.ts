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

/** Inputs used to inspect one workspace's Git and Graphite stack health. */
export const StackDoctorInputSchema = Type.Object(
  {
    branch: Type.Optional(Type.String({ minLength: 1 })),
    repo: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false }
);

/** Read-only health report for one workspace's Git and Graphite stack. */
export const StackDoctorResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    repo: Type.Union([Type.String(), Type.Null()]),
    report: Type.Object(
      {
        status: Type.Union([Type.Literal("HEALTHY"), Type.Literal("NEEDS_ATTENTION")]),
        branch: Type.String(),
        checks: Type.Object(
          {
            dirtyWorkingTree: Type.Boolean(),
            detachedHead: Type.Boolean(),
            graphiteAvailable: Type.Boolean(),
            worktreeListReadable: Type.Boolean(),
            needsRestack: Type.Boolean(),
            graphShowsStack: Type.Boolean(),
          },
          { additionalProperties: false }
        ),
        actions: Type.Array(
          Type.Object(
            {
              command: Type.String({ minLength: 1 }),
              reason: Type.String({ minLength: 1 }),
            },
            { additionalProperties: false }
          )
        ),
        raw: Type.Object(
          {
            branch: Type.String(),
            gitStatus: Type.String(),
            gtLs: Type.String(),
            worktreeList: Type.String(),
          },
          { additionalProperties: false }
        ),
      },
      { additionalProperties: false }
    ),
  },
  { additionalProperties: false }
);

/** Controls for one bounded Graphite stack-drain operation. */
export const StackDrainInputSchema = Type.Object(
  {
    apply: Type.Optional(Type.Boolean()),
    maxCycles: Type.Optional(Type.Integer({ minimum: 1 })),
    sleepSeconds: Type.Optional(Type.Number({ minimum: 0 })),
    scratchPolicy: Type.Optional(ScratchPolicyInputSchema),
  },
  { additionalProperties: false }
);

/** Ordered plan and execution result for one Graphite stack drain. */
export const StackDrainResultSchema = Type.Object(
  {
    workspaceRoot: Type.String({ minLength: 1 }),
    action: DevopsActionSchema,
    converged: Type.Boolean(),
    cycles: Type.Array(
      Type.Object(
        {
          cycle: Type.Number(),
          publish: DevCommandStepSchema,
          merge: DevCommandStepSchema,
          sync: DevCommandStepSchema,
          gtLs: Type.String(),
        },
        { additionalProperties: false }
      )
    ),
    plannedCommands: Type.Array(DevCommandStepSchema),
    preflight: DevPreflightSchema,
    execution: DevExecutionSchema,
    scratchPolicy: ScratchPolicyCheckSchema,
  },
  { additionalProperties: false }
);

/** Inputs used to inspect one workspace's Git and Graphite stack health. */
export type StackDoctorInput = Static<typeof StackDoctorInputSchema>;

/** Read-only health report for one workspace's Git and Graphite stack. */
export type StackDoctorResult = Static<typeof StackDoctorResultSchema>;

/** Controls for one bounded Graphite stack-drain operation. */
export type StackDrainInput = Static<typeof StackDrainInputSchema>;

/** Ordered plan and execution result for one Graphite stack drain. */
export type StackDrainResult = Static<typeof StackDrainResultSchema>;
