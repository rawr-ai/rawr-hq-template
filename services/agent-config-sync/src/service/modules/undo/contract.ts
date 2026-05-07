import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { UndoApplyItemSchema } from "./entities";

/**
 * Undo request mode; dry runs report the reverse operations without touching
 * destination homes.
 */
const RunUndoInputSchema = Type.Object(
  {
    dryRun: Type.Boolean(),
  },
  { additionalProperties: false },
);

/**
 * Undo command result, either the applied operation ledger or the operator-safe
 * reason the capsule could not be replayed.
 */
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

export type UndoRunResult = Static<typeof UndoRunResultSchema>;

export const contract = {
  runUndo: ocBase
    .meta({ idempotent: false, entity: "undo" })
    .input(schema(RunUndoInputSchema))
    .output(schema(UndoRunResultSchema)),
};
