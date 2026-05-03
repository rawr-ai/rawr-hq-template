import { schema } from "@rawr/hq-sdk";
import { type Static, Type } from "typebox";
import { ocBase } from "../../base";
import { UNKNOWN_SESSION_FORMAT } from "../../shared/errors";
import {
  RoleFilterSchema,
  SessionMessageSchema,
  SessionSourceSchema,
} from "../../shared/entities";

const ExtractOptionsSchema = Type.Object(
  {
    roles: Type.Array(RoleFilterSchema),
    includeTools: Type.Boolean(),
    dedupe: Type.Boolean(),
    offset: Type.Number(),
    maxMessages: Type.Number(),
  },
  { additionalProperties: false },
);

const ExtractedSessionSchema = Type.Object(
  {
    source: SessionSourceSchema,
    sessionId: Type.Optional(Type.String()),
    file: Type.String(),
    cwd: Type.Optional(Type.String()),
    gitBranch: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    modelProvider: Type.Optional(Type.String()),
    modelContextWindow: Type.Optional(Type.Number()),
    sessionMetaCount: Type.Optional(Type.Number()),
    cwdFirst: Type.Optional(Type.String()),
    gitBranchFirst: Type.Optional(Type.String()),
    started: Type.Optional(Type.String()),
    messageCount: Type.Number(),
    messages: Type.Array(SessionMessageSchema),
  },
  { additionalProperties: false },
);
export type ExtractedSession = Static<typeof ExtractedSessionSchema>;

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
