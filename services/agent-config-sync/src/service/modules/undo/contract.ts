import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";

const UndoApplyItemSchema = Type.Object(
  {
    seq: Type.Number(),
    type: Type.Union([Type.Literal("create-path"), Type.Literal("restore-path")]),
    target: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal("planned"),
      Type.Literal("restored"),
      Type.Literal("deleted"),
      Type.Literal("skipped-missing"),
      Type.Literal("failed"),
    ]),
    message: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

const UndoRunResultSchema = Type.Union([
  Type.Object(
    {
      ok: Type.Literal(true),
      capsuleId: Type.String({ minLength: 1 }),
      provider: Type.String({ minLength: 1 }),
      dryRun: Type.Boolean(),
      status: Type.Union([Type.Literal("ready"), Type.Literal("ready-partial")]),
      operations: Type.Array(UndoApplyItemSchema),
      summary: Type.Object(
        {
          planned: Type.Number(),
          restored: Type.Number(),
          deleted: Type.Number(),
          skippedMissing: Type.Number(),
          failed: Type.Number(),
        },
        { additionalProperties: false },
      ),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      ok: Type.Literal(false),
      code: Type.Union([
        Type.Literal("UNDO_NOT_AVAILABLE"),
        Type.Literal("UNDO_PROVIDER_UNSUPPORTED"),
        Type.Literal("UNDO_FAILED"),
      ]),
      message: Type.String({ minLength: 1 }),
      details: Type.Optional(Type.Unknown()),
    },
    { additionalProperties: false },
  ),
]);

export const contract = {
  runUndo: ocBase
    .meta({ idempotent: false, entity: "undo" })
    .input(
      schema(
        Type.Object(
          {
            dryRun: Type.Boolean(),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(UndoRunResultSchema)),
};
