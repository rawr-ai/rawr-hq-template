import { type Static, Type } from "typebox";

export const JsonConversationMessageSchema = Type.Object(
  {
    role: Type.String({ minLength: 1 }),
    say: Type.String(),
  },
  { additionalProperties: false },
);

export const RawConversationDatesSchema = Type.Object(
  {
    created: Type.Optional(Type.String()),
    updated: Type.Optional(Type.String()),
    exported: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const RawConversationMetadataSchema = Type.Object(
  {
    title: Type.Optional(Type.String()),
    link: Type.Optional(Type.String()),
    dates: Type.Optional(RawConversationDatesSchema),
  },
  { additionalProperties: false },
);

export const RawConversationExportSchema = Type.Object(
  {
    metadata: Type.Optional(RawConversationMetadataSchema),
    messages: Type.Array(JsonConversationMessageSchema),
  },
  { additionalProperties: false },
);

const BaseSourceRecordFields = {
  sourceId: Type.String({ minLength: 1 }),
  relativePath: Type.String({ minLength: 1 }),
  hash: Type.String({ minLength: 1 }),
  sizeBytes: Type.Number({ minimum: 0 }),
  title: Type.String({ minLength: 1 }),
  summary: Type.String(),
  branchDepth: Type.Number({ minimum: 0 }),
} as const;

export const JsonConversationSourceRecordSchema = Type.Object(
  {
    ...BaseSourceRecordFields,
    type: Type.Literal("json_conversation"),
    created: Type.Optional(Type.String()),
    updated: Type.Optional(Type.String()),
    exported: Type.Optional(Type.String()),
    link: Type.Optional(Type.String()),
    messages: Type.Array(JsonConversationMessageSchema),
    messagesHash: Type.String({ minLength: 1 }),
    normalizedTitle: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const MarkdownDocumentSourceRecordSchema = Type.Object(
  {
    ...BaseSourceRecordFields,
    type: Type.Literal("markdown_document"),
    lineCount: Type.Number({ minimum: 0 }),
    headings: Type.Array(Type.String()),
  },
  { additionalProperties: false },
);

export const SourceRecordSchema = Type.Union([
  JsonConversationSourceRecordSchema,
  MarkdownDocumentSourceRecordSchema,
]);

export const SourceSnapshotSchema = Type.Object(
  {
    workspaceRef: Type.String({ minLength: 1 }),
    records: Type.Array(SourceRecordSchema),
    jsonRecords: Type.Array(JsonConversationSourceRecordSchema),
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
export type RawConversationExport = Static<typeof RawConversationExportSchema>;
export type JsonConversationSourceRecord = Static<typeof JsonConversationSourceRecordSchema>;
export type MarkdownDocumentSourceRecord = Static<typeof MarkdownDocumentSourceRecordSchema>;
export type SourceRecord = Static<typeof SourceRecordSchema>;
export type SourceSnapshot = Static<typeof SourceSnapshotSchema>;
export type ReadSourceSnapshotResult = Static<typeof ReadSourceSnapshotOutputSchema>;
