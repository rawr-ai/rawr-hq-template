import { type Static, Type } from "typebox";
import {
  RoleFilterSchema,
  SessionMessageSchema,
  SessionSourceSchema,
} from "../../shared/schemas";

export { SessionMessageSchema, SessionSourceSchema };

export type SessionSource = Static<typeof SessionSourceSchema>;
export type SessionMessage = Static<typeof SessionMessageSchema>;

export const ExtractOptionsSchema = Type.Object(
  {
    roles: Type.Array(RoleFilterSchema),
    includeTools: Type.Boolean(),
    dedupe: Type.Boolean(),
    offset: Type.Number(),
    maxMessages: Type.Number(),
  },
  { additionalProperties: false },
);
export type ExtractOptions = Static<typeof ExtractOptionsSchema>;

export const ExtractedSessionSchema = Type.Object(
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
