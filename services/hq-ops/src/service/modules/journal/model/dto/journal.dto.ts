import { type Static, Type } from "typebox";
import { JournalRecordIdSchema, JournalSnippetSchema } from "../../entities";

/** Ranked or recent snippet projection returned by Journal queries. */
export const JournalSearchRowSchema = Type.Interface(
  [Type.Omit(JournalSnippetSchema, ["body"])],
  {
    score: Type.Optional(
      Type.Number({
        description: "Semantic relevance score when semantic ranking was requested.",
      })
    ),
  },
  {
    additionalProperties: false,
    description: "Ranked or recent snippet projection returned by Journal queries.",
  }
);

/** Result returned after a canonical Journal record is written. */
export const JournalWriteResultSchema = Type.Object(
  {
    path: Type.String({
      description: "Filesystem path of the canonical Journal record written by the operation.",
      minLength: 1,
    }),
  },
  { additionalProperties: false }
);

/** Input that selects one canonical Journal snippet by identity. */
export const SnippetIdInputSchema = Type.Object(
  {
    id: JournalRecordIdSchema,
  },
  { additionalProperties: false }
);

/** Result of retrieving one canonical Journal snippet. */
export const JournalGetSnippetResultSchema = Type.Object(
  {
    snippet: Type.Union([JournalSnippetSchema, Type.Null()], {
      description:
        "Canonical Journal snippet, or null when no snippet has the supplied identifier.",
    }),
  },
  { additionalProperties: false }
);

/** Input that bounds a reverse-chronological Journal query. */
export const TailInputSchema = Type.Object(
  {
    limit: Type.Integer({
      description: "Maximum number of recent snippets the caller requests.",
      minimum: 1,
      maximum: 100,
    }),
  },
  { additionalProperties: false }
);

/** Result of a reverse-chronological Journal query. */
export const JournalTailResultSchema = Type.Object(
  {
    snippets: Type.Array(JournalSearchRowSchema, {
      description: "Most recent indexed Journal snippets in reverse chronological order.",
    }),
  },
  { additionalProperties: false }
);

/** Search strategy admitted by Journal query operations. */
const JournalSearchModeSchema = Type.Union([Type.Literal("fts"), Type.Literal("semantic")], {
  description: "Search strategy requested for ranking Journal snippets.",
});

/** Input that selects and bounds a Journal search strategy. */
export const SearchInputSchema = Type.Object(
  {
    query: Type.String({
      description: "Caller-supplied text used to rank relevant Journal snippets.",
      minLength: 1,
    }),
    limit: Type.Integer({
      description: "Maximum number of ranked snippets the search may return.",
      minimum: 1,
      maximum: 100,
    }),
    mode: JournalSearchModeSchema,
  },
  { additionalProperties: false }
);

/** Result of a full-text or semantic Journal search. */
export const JournalSearchResultSchema = Type.Object(
  {
    mode: JournalSearchModeSchema,
    warning: Type.Optional(
      Type.String({
        description: "Reason the requested search strategy could not be honored exactly.",
        minLength: 1,
      })
    ),
    snippets: Type.Array(JournalSearchRowSchema, {
      description: "Ranked Journal snippets selected by the effective search strategy.",
    }),
  },
  { additionalProperties: false }
);

/** Ranked or recent Journal snippet projection. */
export type JournalSearchRow = Static<typeof JournalSearchRowSchema>;
