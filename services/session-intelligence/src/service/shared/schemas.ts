import { type Static, Type } from "typebox";

export const SessionSourceSchema = Type.Union([Type.Literal("claude"), Type.Literal("codex")]);
export type SessionSource = Static<typeof SessionSourceSchema>;

export const SessionSourceFilterSchema = Type.Union([SessionSourceSchema, Type.Literal("all")]);
export type SessionSourceFilter = Static<typeof SessionSourceFilterSchema>;

export const RoleFilterSchema = Type.Union([
  Type.Literal("user"),
  Type.Literal("assistant"),
  Type.Literal("tool"),
  Type.Literal("all"),
]);
export type RoleFilter = Static<typeof RoleFilterSchema>;

export const SessionStatusSchema = Type.Union([Type.Literal("live"), Type.Literal("archived")]);
export type SessionStatus = Static<typeof SessionStatusSchema>;

export const SessionMessageRoleSchema = Type.Union([
  Type.Literal("user"),
  Type.Literal("assistant"),
  Type.Literal("tool"),
]);
export type SessionMessageRole = Static<typeof SessionMessageRoleSchema>;

export const SessionMessageSchema = Type.Object(
  {
    role: SessionMessageRoleSchema,
    content: Type.String(),
    timestamp: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type SessionMessage = Static<typeof SessionMessageSchema>;

export const ClaudeSessionMetadataSchema = Type.Object(
  {
    sessionId: Type.Optional(Type.String()),
    summaries: Type.Optional(Type.Array(Type.String())),
    firstUserMessage: Type.Optional(Type.String()),
    cwd: Type.Optional(Type.String()),
    gitBranch: Type.Optional(Type.String()),
    timestamp: Type.Optional(Type.String()),
    lastTimestamp: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    modelProvider: Type.Optional(Type.String()),
    error: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type ClaudeSessionMetadata = Static<typeof ClaudeSessionMetadataSchema>;

export const CodexSessionMetadataSchema = Type.Object(
  {
    sessionId: Type.Optional(Type.String()),
    firstUserMessage: Type.Optional(Type.String()),
    cwd: Type.Optional(Type.String()),
    gitBranch: Type.Optional(Type.String()),
    timestamp: Type.Optional(Type.String()),
    lastTimestamp: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    modelProvider: Type.Optional(Type.String()),
    modelContextWindow: Type.Optional(Type.Number()),
    sessionMetaCount: Type.Optional(Type.Number()),
    cwdFirst: Type.Optional(Type.String()),
    gitBranchFirst: Type.Optional(Type.String()),
    timestampFirst: Type.Optional(Type.String()),
    compactionCount: Type.Optional(Type.Number()),
    compactionAutoWatcherCount: Type.Optional(Type.Number()),
    compactionLastTimestamp: Type.Optional(Type.String()),
    error: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type CodexSessionMetadata = Static<typeof CodexSessionMetadataSchema>;

export const SessionMetadataSchema = Type.Union([ClaudeSessionMetadataSchema, CodexSessionMetadataSchema]);
export type SessionMetadata = Static<typeof SessionMetadataSchema>;

export const SessionListItemSchema = Type.Object(
  {
    path: Type.String(),
    sessionId: Type.Optional(Type.String()),
    source: SessionSourceSchema,
    status: Type.Optional(SessionStatusSchema),
    title: Type.Optional(Type.String()),
    project: Type.Optional(Type.String()),
    cwd: Type.Optional(Type.String()),
    gitBranch: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    modelProvider: Type.Optional(Type.String()),
    modelContextWindow: Type.Optional(Type.Number()),
    modified: Type.String(),
    started: Type.Optional(Type.String()),
    sizeKb: Type.Number(),
  },
  { additionalProperties: false },
);
export type SessionListItem = Static<typeof SessionListItemSchema>;

export const DiscoveredSessionFileSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
    source: SessionSourceSchema,
    status: Type.Optional(SessionStatusSchema),
    project: Type.Optional(Type.String()),
    modifiedMs: Type.Number(),
    sizeBytes: Type.Number(),
  },
  { additionalProperties: false },
);
export type DiscoveredSessionFile = Static<typeof DiscoveredSessionFileSchema>;

export const SessionFileStatSchema = Type.Object(
  {
    modifiedMs: Type.Number(),
    sizeBytes: Type.Number(),
  },
  { additionalProperties: false },
);
export type SessionFileStat = Static<typeof SessionFileStatSchema>;
