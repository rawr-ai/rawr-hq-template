import { type Static, Type } from "typebox";
import { MutationInputFields, ResultFields, WorktreeSchema } from "../../../../model/dto";

/** Native ancestry selected from current branch to its exact configured trunk. */
export const GraphiteStackSchema = Type.Object(
  {
    trunk: Type.String(),
    branches: Type.Array(
      Type.Object(
        {
          branch: Type.String(),
          parent: Type.String(),
          needsRestack: Type.Boolean(),
        },
        { additionalProperties: false }
      )
    ),
  },
  { additionalProperties: false }
);

/** Doctor always inspects the actual current checkout of an explicit repository. */
export const StackDoctorInputSchema = Type.Object(
  {
    repositoryPath: Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }),
  },
  { additionalProperties: false }
);

/** Native observations, including unknown values when an observation is unavailable. */
export const StackDoctorResultSchema = Type.Object(
  {
    ...ResultFields,
    kind: Type.Union([Type.Literal("Healthy"), Type.Literal("NeedsAttention")]),
    branch: Type.Union([Type.String(), Type.Null()]),
    dirty: Type.Union([Type.Boolean(), Type.Null()]),
    worktrees: Type.Array(WorktreeSchema),
    stack: Type.Union([GraphiteStackSchema, Type.Null()]),
  },
  { additionalProperties: false }
);

/** Requests native merge orchestration; there is deliberately no finalize phase. */
export const StackDrainInputSchema = Type.Object(MutationInputFields, {
  additionalProperties: false,
});

/** Requested means accepted native commands, never completed remote merge or cleanup. */
export const StackDrainResultSchema = Type.Object(
  {
    ...ResultFields,
    kind: Type.Union([
      Type.Literal("Planned"),
      Type.Literal("Refused"),
      Type.Literal("Requested"),
      Type.Literal("Failed"),
    ]),
    branch: Type.Union([Type.String(), Type.Null()]),
    stack: Type.Union([GraphiteStackSchema, Type.Null()]),
  },
  { additionalProperties: false }
);

export type GraphiteStack = Static<typeof GraphiteStackSchema>;
export type StackDoctorInput = Static<typeof StackDoctorInputSchema>;
export type StackDoctorResult = Static<typeof StackDoctorResultSchema>;
export type StackDrainInput = Static<typeof StackDrainInputSchema>;
export type StackDrainResult = Static<typeof StackDrainResultSchema>;
