import { type Static, Type } from "typebox";

/** Stable identity shared by canonical Journal records. */
export const JournalRecordIdSchema = Type.String({
  description: "Stable identifier of a canonical Journal record.",
  minLength: 1,
});

/** ISO-compatible timestamp recorded with a canonical Journal record. */
const JournalTimestampSchema = Type.String({
  description: "Timestamp associated with the canonical Journal record.",
  minLength: 1,
});

/** Admitted category of reusable Journal snippet. */
const JournalSnippetKindSchema = Type.Union(
  [
    Type.Literal("command"),
    Type.Literal("workflow"),
    Type.Literal("security"),
    Type.Literal("note"),
  ],
  {
    description: "Domain category assigned to the reusable Journal snippet.",
  }
);

/** One observed step nested within an append-only Journal event. */
const JournalStepSchema = Type.Object(
  {
    name: Type.String({
      description: "Human-readable name of the observed step.",
      minLength: 1,
    }),
    status: Type.String({
      description: "Recorded completion status of the observed step.",
      minLength: 1,
    }),
    durationMs: Type.Optional(
      Type.Number({
        description: "Elapsed step duration in milliseconds when measured.",
      })
    ),
    exitCode: Type.Optional(
      Type.Number({
        description: "Process exit code associated with the step when available.",
      })
    ),
  },
  { additionalProperties: false }
);

/** Canonical append-only record of one HQ operation. */
export const JournalEventSchema = Type.Object(
  {
    id: JournalRecordIdSchema,
    ts: JournalTimestampSchema,
    cwd: Type.String({
      description: "Working directory in which the operation ran.",
      minLength: 1,
    }),
    argv: Type.Array(Type.String(), {
      description: "Ordered command arguments recorded for the operation.",
    }),
    commandId: Type.Optional(
      Type.String({
        description: "Stable command identity when the operation came from a named command.",
        minLength: 1,
      })
    ),
    exitCode: Type.Optional(
      Type.Number({
        description: "Final process exit code when the operation invoked a process.",
      })
    ),
    durationMs: Type.Optional(
      Type.Number({
        description: "Total operation duration in milliseconds when measured.",
      })
    ),
    artifacts: Type.Optional(
      Type.Array(Type.String(), {
        description: "Artifact paths produced by the operation.",
      })
    ),
    steps: Type.Optional(
      Type.Array(JournalStepSchema, {
        description: "Ordered operational steps captured by the event.",
      })
    ),
  },
  { additionalProperties: false }
);

/** Canonical reusable knowledge record stored in the Journal. */
export const JournalSnippetSchema = Type.Object(
  {
    id: JournalRecordIdSchema,
    ts: JournalTimestampSchema,
    kind: JournalSnippetKindSchema,
    title: Type.String({
      description: "Human-readable title of the reusable snippet.",
      minLength: 1,
    }),
    preview: Type.String({
      description: "Short caller-facing preview of the snippet body.",
    }),
    body: Type.String({
      description: "Canonical reusable content of the snippet.",
    }),
    tags: Type.Array(Type.String(), {
      description: "Searchable labels assigned to the snippet.",
    }),
    sourceEventId: Type.Optional(JournalRecordIdSchema),
  },
  { additionalProperties: false }
);

/** Canonical append-only Journal event. */
export type JournalEvent = Static<typeof JournalEventSchema>;

/** Canonical reusable Journal snippet. */
export type JournalSnippet = Static<typeof JournalSnippetSchema>;
