import { type Static, Type } from "typebox";

/** Operator-selected enforcement posture for required project scratch records. */
export const ScratchPolicyModeSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("warn"),
  Type.Literal("block"),
]);

/** Optional scratch-policy controls supplied to Dev operations. */
export const ScratchPolicyInputSchema = Type.Object(
  {
    mode: Type.Optional(ScratchPolicyModeSchema),
    bypassed: Type.Optional(Type.Boolean()),
    roots: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    planFileNames: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    workingPadFileNames: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    enforce: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false }
);

/** Deterministic scratch-policy observation shared by guarded Dev operations. */
export const ScratchPolicyCheckSchema = Type.Object(
  {
    mode: ScratchPolicyModeSchema,
    bypassed: Type.Boolean(),
    required: Type.Object(
      {
        planScratch: Type.Boolean(),
        workingPad: Type.Boolean(),
      },
      { additionalProperties: false }
    ),
    missing: Type.Array(Type.String()),
    matches: Type.Object(
      {
        planScratchPaths: Type.Array(Type.String()),
        workingPadPaths: Type.Array(Type.String()),
      },
      { additionalProperties: false }
    ),
    blocked: Type.Boolean(),
  },
  { additionalProperties: false }
);

/** Operator-selected enforcement posture for required project scratch records. */
export type ScratchPolicyMode = Static<typeof ScratchPolicyModeSchema>;

/** Optional scratch-policy controls supplied to Dev operations. */
export type ScratchPolicyInput = Static<typeof ScratchPolicyInputSchema>;

/** Deterministic scratch-policy observation shared by guarded Dev operations. */
export type ScratchPolicyCheck = Static<typeof ScratchPolicyCheckSchema>;
