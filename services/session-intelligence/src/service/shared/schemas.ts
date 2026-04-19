import { type Static, Type } from "typebox";

export const SessionSourceSchema = Type.Union([Type.Literal("claude"), Type.Literal("codex")]);
export type SessionSource = Static<typeof SessionSourceSchema>;

export const SessionSourceFilterSchema = Type.Union([SessionSourceSchema, Type.Literal("all")]);
export type SessionSourceFilter = Static<typeof SessionSourceFilterSchema>;

export const OutputFormatSchema = Type.Union([Type.Literal("json"), Type.Literal("text"), Type.Literal("markdown")]);
export type OutputFormat = Static<typeof OutputFormatSchema>;

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

export const SessionFiltersSchema = Type.Object(
  {
    project: Type.Optional(Type.String()),
    cwdContains: Type.Optional(Type.String()),
    branch: Type.Optional(Type.String()),
    model: Type.Optional(Type.String()),
    since: Type.Optional(Type.String()),
    until: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type SessionFilters = Static<typeof SessionFiltersSchema>;

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

export const ResolveResultSchema = Type.Object(
  {
    resolved: Type.Object(
      {
        path: Type.String(),
        source: SessionSourceSchema,
        status: Type.Optional(SessionStatusSchema),
        modified: Type.String(),
        sizeBytes: Type.Number(),
      },
      { additionalProperties: false },
    ),
    metadata: SessionMetadataSchema,
  },
  { additionalProperties: false },
);
export type ResolveResult = Static<typeof ResolveResultSchema>;

export const SearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchCount: Type.Number(),
    matchSnippet: Type.String(),
  },
  { additionalProperties: false },
);
export type SearchHit = Static<typeof SearchHitSchema>;

export const MetadataSearchHitSchema = Type.Object(
  {
    ...SessionListItemSchema.properties,
    matchScore: Type.Number(),
  },
  { additionalProperties: false },
);
export type MetadataSearchHit = Static<typeof MetadataSearchHitSchema>;

export const ReindexResultSchema = Type.Object(
  {
    indexed: Type.Number(),
    total: Type.Number(),
  },
  { additionalProperties: false },
);
export type ReindexResult = Static<typeof ReindexResultSchema>;

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
