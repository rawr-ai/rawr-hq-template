import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { JournalEventSchema, JournalSearchRowSchema, JournalSnippetSchema } from "./entities";

const JournalWriteResultSchema = Type.Object(
  {
    path: Type.String({
      description: "Filesystem path of the journal record written by the operation.",
      minLength: 1,
    }),
  },
  { additionalProperties: false }
);

const JournalSearchResultSchema = Type.Object(
  {
    mode: Type.Union([Type.Literal("fts"), Type.Literal("semantic")], {
      description: "Search strategy requested for the returned result.",
    }),
    warning: Type.Optional(
      Type.String({
        description: "Reason the requested search strategy could not be honored exactly.",
        minLength: 1,
      })
    ),
    snippets: Type.Array(JournalSearchRowSchema, {
      description: "Ranked journal snippets selected by the effective search strategy.",
    }),
  },
  { additionalProperties: false }
);

const JournalGetSnippetResultSchema = Type.Object(
  {
    snippet: Type.Union([JournalSnippetSchema, Type.Null()], {
      description:
        "Requested journal snippet, or null when no snippet has the supplied identifier.",
    }),
  },
  { additionalProperties: false }
);

const JournalTailResultSchema = Type.Object(
  {
    snippets: Type.Array(JournalSearchRowSchema, {
      description: "Most recent journal snippets in reverse chronological order.",
    }),
  },
  { additionalProperties: false }
);

const SnippetIdInputSchema = schema(
  Type.Object(
    {
      id: Type.String({
        description: "Stable identifier of the journal snippet to retrieve.",
        minLength: 1,
      }),
    },
    { additionalProperties: false }
  )
);

const TailInputSchema = schema(
  Type.Object(
    {
      limit: Type.Integer({
        description: "Maximum number of recent snippets the caller requests.",
        minimum: 1,
        maximum: 100,
      }),
    },
    { additionalProperties: false }
  )
);

const SearchInputSchema = schema(
  Type.Object(
    {
      query: Type.String({
        description: "Caller-supplied text used to rank relevant journal snippets.",
        minLength: 1,
      }),
      limit: Type.Integer({
        description: "Maximum number of ranked snippets the search may return.",
        minimum: 1,
        maximum: 100,
      }),
      mode: Type.Union([Type.Literal("fts"), Type.Literal("semantic")], {
        description: "Search strategy requested for ranking journal snippets.",
      }),
    },
    { additionalProperties: false }
  )
);

export const contract = {
  writeEvent: ocBase
    .meta({ idempotent: false, entity: "journal" })
    .input(schema(JournalEventSchema))
    .output(schema(JournalWriteResultSchema)),
  writeSnippet: ocBase
    .meta({ idempotent: false, entity: "journal" })
    .input(schema(JournalSnippetSchema))
    .output(schema(JournalWriteResultSchema)),
  getSnippet: ocBase
    .meta({ idempotent: true, entity: "journal" })
    .input(SnippetIdInputSchema)
    .output(schema(JournalGetSnippetResultSchema)),
  tailSnippets: ocBase
    .meta({ idempotent: true, entity: "journal" })
    .input(TailInputSchema)
    .output(schema(JournalTailResultSchema)),
  searchSnippets: ocBase
    .meta({ idempotent: true, entity: "journal" })
    .input(SearchInputSchema)
    .output(schema(JournalSearchResultSchema)),
};
