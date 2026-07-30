import { type Static, Type } from "typebox";

/** Whether a mutation-capable development operation was planned or applied. */
export const DevopsActionSchema = Type.Union([Type.Literal("planned"), Type.Literal("applied")]);

/** Observable result of one external command attempted by the Dev service. */
export const DevCommandStepSchema = Type.Object(
  {
    command: Type.String({ minLength: 1 }),
    args: Type.Array(Type.String()),
    status: Type.Union([
      Type.Literal("planned"),
      Type.Literal("succeeded"),
      Type.Literal("failed"),
      Type.Literal("skipped"),
    ]),
    exitCode: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    stdout: Type.Optional(Type.String()),
    stderr: Type.Optional(Type.String()),
  },
  { additionalProperties: false }
);

/** Structured operator-facing issue emitted by a Dev operation. */
export const DevIssueSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    message: Type.String({ minLength: 1 }),
    severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
    details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  { additionalProperties: false }
);

/** Admission result produced before a Dev operation may mutate its workspace. */
export const DevPreflightSchema = Type.Object(
  {
    ok: Type.Boolean(),
    issues: Type.Array(DevIssueSchema),
  },
  { additionalProperties: false }
);

/** Execution result produced after a Dev operation attempts its planned mutations. */
export const DevExecutionSchema = Type.Object(
  {
    ok: Type.Boolean(),
    issues: Type.Array(DevIssueSchema),
  },
  { additionalProperties: false }
);

/** Whether a mutation-capable development operation was planned or applied. */
export type DevopsAction = Static<typeof DevopsActionSchema>;

/** Observable result of one external command attempted by the Dev service. */
export type DevCommandStep = Static<typeof DevCommandStepSchema>;

/** Structured operator-facing issue emitted by a Dev operation. */
export type DevIssue = Static<typeof DevIssueSchema>;

/** Admission result produced before a Dev operation may mutate its workspace. */
export type DevPreflight = Static<typeof DevPreflightSchema>;

/** Execution result produced after a Dev operation attempts its planned mutations. */
export type DevExecution = Static<typeof DevExecutionSchema>;
