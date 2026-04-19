import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { UNKNOWN_SESSION_FORMAT } from "../../shared/errors";
import {
  ExtractedSessionSchema,
  ExtractOptionsSchema,
  SessionSourceSchema,
} from "./schemas";

export const contract = {
  detect: ocBase
    .meta({ idempotent: true, entity: "transcript" })
    .input(schema(Type.Object({ path: Type.String({ minLength: 1 }) }, { additionalProperties: false })))
    .output(schema(Type.Object({ source: Type.Union([SessionSourceSchema, Type.Literal("unknown")]) }, { additionalProperties: false }))),
  extract: ocBase
    .meta({ idempotent: true, entity: "transcript" })
    .input(
      schema(
        Type.Object(
          {
            path: Type.String({ minLength: 1 }),
            options: ExtractOptionsSchema,
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(ExtractedSessionSchema))
    .errors({ UNKNOWN_SESSION_FORMAT }),
};
