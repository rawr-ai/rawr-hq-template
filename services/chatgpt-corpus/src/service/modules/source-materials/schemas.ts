import { type Static, Type } from "typebox";

export const JsonConversationMessageSchema = Type.Object(
  {
    role: Type.String({ minLength: 1 }),
    say: Type.String(),
  },
  { additionalProperties: false },
);

export const SourceRecordSchema = Type.Object(
  {
    sourceId: Type.String({ minLength: 1 }),
    relativePath: Type.String({ minLength: 1 }),
    type: Type.Union([
      Type.Literal("json_conversation"),
      Type.Literal("markdown_document"),
    ]),
    hash: Type.String({ minLength: 1 }),
    sizeBytes: Type.Number({ minimum: 0 }),
    title: Type.String({ minLength: 1 }),
    summary: Type.String(),
    created: Type.Optional(Type.String()),
    updated: Type.Optional(Type.String()),
    exported: Type.Optional(Type.String()),
    link: Type.Optional(Type.String()),
    messages: Type.Optional(Type.Array(JsonConversationMessageSchema)),
    messagesHash: Type.Optional(Type.String()),
    normalizedTitle: Type.Optional(Type.String()),
    branchDepth: Type.Number({ minimum: 0 }),
    lineCount: Type.Optional(Type.Number({ minimum: 0 })),
    headings: Type.Optional(Type.Array(Type.String())),
  },
  { additionalProperties: false },
);

export const SourceSnapshotSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    records: Type.Array(SourceRecordSchema),
    jsonRecords: Type.Array(SourceRecordSchema),
    markdownDocCount: Type.Number({ minimum: 0 }),
  },
  { additionalProperties: false },
);

export const ReadSourceSnapshotOutputSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    sourceCounts: Type.Object(
      {
        jsonConversations: Type.Number({ minimum: 0 }),
        markdownDocuments: Type.Number({ minimum: 0 }),
        totalSources: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    snapshot: SourceSnapshotSchema,
  },
  { additionalProperties: false },
);

export type JsonConversationMessage = Static<typeof JsonConversationMessageSchema>;
export type SourceRecord = Static<typeof SourceRecordSchema>;
export type SourceSnapshot = Static<typeof SourceSnapshotSchema>;
export type ReadSourceSnapshotResult = Static<typeof ReadSourceSnapshotOutputSchema>;
