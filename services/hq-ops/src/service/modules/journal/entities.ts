import { type Static, Type } from "typebox";

export const JournalSnippetKindSchema = Type.Union([
  Type.Literal("command"),
  Type.Literal("workflow"),
  Type.Literal("security"),
  Type.Literal("note"),
]);

export const JournalStepSchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    status: Type.String({ minLength: 1 }),
    durationMs: Type.Optional(Type.Number()),
    exitCode: Type.Optional(Type.Number()),
  },
  { additionalProperties: false },
);

export const JournalEventSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    ts: Type.String({ minLength: 1 }),
    cwd: Type.String({ minLength: 1 }),
    argv: Type.Array(Type.String()),
    commandId: Type.Optional(Type.String({ minLength: 1 })),
    exitCode: Type.Optional(Type.Number()),
    durationMs: Type.Optional(Type.Number()),
    artifacts: Type.Optional(Type.Array(Type.String())),
    steps: Type.Optional(Type.Array(JournalStepSchema)),
  },
  { additionalProperties: false },
);

export const JournalSnippetSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    ts: Type.String({ minLength: 1 }),
    kind: JournalSnippetKindSchema,
    title: Type.String({ minLength: 1 }),
    preview: Type.String(),
    body: Type.String(),
    tags: Type.Array(Type.String()),
    sourceEventId: Type.Optional(Type.String({ minLength: 1 })),
  },
  { additionalProperties: false },
);

export const JournalSearchRowSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    ts: Type.String({ minLength: 1 }),
    kind: JournalSnippetKindSchema,
    title: Type.String({ minLength: 1 }),
    preview: Type.String(),
    tags: Type.Array(Type.String()),
    sourceEventId: Type.Optional(Type.String({ minLength: 1 })),
    score: Type.Optional(Type.Number()),
  },
  { additionalProperties: false },
);

export type JournalEvent = Static<typeof JournalEventSchema>;
export type JournalSnippet = Static<typeof JournalSnippetSchema>;
export type JournalSearchRow = Static<typeof JournalSearchRowSchema>;
