import { type Static, Type } from "typebox";

/** Exact optional scratch evidence; omission disables observation. */
export const ScratchInputSchema = Type.Object(
  {
    files: Type.Array(Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }), { minItems: 1 }),
    mode: Type.Optional(Type.Union([Type.Literal("warn"), Type.Literal("block")])),
  },
  { additionalProperties: false }
);

/** Caller intent common to mutation-capable operations, not an execution runner. */
export const MutationInputFields = {
  repositoryPath: Type.String({ minLength: 1, pattern: "^[^\\u0000]+$" }),
  apply: Type.Optional(Type.Boolean()),
  scratch: Type.Optional(ScratchInputSchema),
};

/** Native command observations keep failures separate from unchanged output streams. */
export const CommandStepSchema = Type.Object(
  {
    command: Type.String({ minLength: 1 }),
    args: Type.Array(Type.String()),
    status: Type.Union([
      Type.Literal("planned"),
      Type.Literal("succeeded"),
      Type.Literal("failed"),
      Type.Literal("skipped"),
    ]),
    exitCode: Type.Union([Type.Integer(), Type.Null()]),
    stdout: Type.String(),
    stderr: Type.String(),
    failure: Type.Union([Type.String(), Type.Null()]),
  },
  { additionalProperties: false }
);

/** A domain admission or execution finding with its actual severity. */
export const IssueSchema = Type.Object(
  {
    code: Type.String(),
    message: Type.String(),
    severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]),
  },
  { additionalProperties: false }
);

/** Exact file observations, without claiming anything about their contents. */
export const ScratchReportSchema = Type.Union([
  Type.Null(),
  Type.Object(
    {
      mode: Type.Union([Type.Literal("warn"), Type.Literal("block")]),
      files: Type.Array(
        Type.Object(
          {
            path: Type.String(),
            status: Type.Union([
              Type.Literal("present"),
              Type.Literal("missing"),
              Type.Literal("not-file"),
            ]),
          },
          { additionalProperties: false }
        )
      ),
    },
    { additionalProperties: false }
  ),
]);

/** Common observations carried by each operation's specific result contract. */
export const ResultFields = {
  repositoryRoot: Type.Union([Type.String(), Type.Null()]),
  issues: Type.Array(IssueSchema),
  steps: Type.Array(CommandStepSchema),
  scratch: ScratchReportSchema,
};

export type ScratchInput = Static<typeof ScratchInputSchema>;
export type ScratchReport = Static<typeof ScratchReportSchema>;
export type CommandStep = Static<typeof CommandStepSchema>;
export type Issue = Static<typeof IssueSchema>;
