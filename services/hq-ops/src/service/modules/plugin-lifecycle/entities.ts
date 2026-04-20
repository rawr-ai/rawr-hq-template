import { type Static, Type } from "typebox";

export const LifecycleTypeSchema = Type.Union([
  Type.Literal("cli"),
  Type.Literal("web"),
  Type.Literal("agent"),
  Type.Literal("skill"),
  Type.Literal("workflow"),
  Type.Literal("composed"),
]);

export const LifecycleTargetSchema = Type.Object(
  {
    input: Type.String({ minLength: 1 }),
    absPath: Type.String({ minLength: 1 }),
    relPath: Type.String(),
    type: LifecycleTypeSchema,
  },
  { additionalProperties: false },
);

export const LifecycleCheckDataSchema = Type.Object(
  {
    status: Type.Union([Type.Literal("pass"), Type.Literal("fail")]),
    target: LifecycleTargetSchema,
    missingTests: Type.Array(Type.String()),
    missingDocs: Type.Array(Type.String()),
    missingDependents: Type.Array(Type.String()),
    syncVerified: Type.Boolean(),
    driftVerified: Type.Boolean(),
    driftDetected: Type.Boolean(),
    details: Type.Object(
      {
        changedFilesConsidered: Type.Array(Type.String()),
        relevantChangedFiles: Type.Array(Type.String()),
        dependentFiles: Type.Array(Type.String()),
        codeChanged: Type.Array(Type.String()),
        testChanged: Type.Array(Type.String()),
        docsChanged: Type.Array(Type.String()),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type LifecycleType = Static<typeof LifecycleTypeSchema>;
export type LifecycleTarget = Static<typeof LifecycleTargetSchema>;
export type LifecycleCheckData = Static<typeof LifecycleCheckDataSchema>;
