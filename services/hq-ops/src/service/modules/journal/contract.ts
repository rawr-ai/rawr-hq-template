import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  JournalEventSchema,
  JournalSearchRowSchema,
  JournalSnippetSchema,
} from "./entities";

const JournalWriteResultSchema = Type.Object(
  {
    path: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

const JournalSearchResultSchema = Type.Object(
  {
    mode: Type.Union([Type.Literal("fts"), Type.Literal("semantic")]),
    warning: Type.Optional(Type.String({ minLength: 1 })),
    snippets: Type.Array(JournalSearchRowSchema),
  },
  { additionalProperties: false },
);

const JournalGetSnippetResultSchema = Type.Object(
  {
    snippet: Type.Union([JournalSnippetSchema, Type.Null()]),
  },
  { additionalProperties: false },
);

const JournalTailResultSchema = Type.Object(
  {
    snippets: Type.Array(JournalSearchRowSchema),
  },
  { additionalProperties: false },
);

const SnippetIdInputSchema = schema(
  Type.Object(
    {
      id: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

const TailInputSchema = schema(
  Type.Object(
    {
      limit: Type.Integer({ minimum: 1, maximum: 100 }),
    },
    { additionalProperties: false },
  ),
);

const SearchInputSchema = schema(
  Type.Object(
    {
      query: Type.String({ minLength: 1 }),
      limit: Type.Integer({ minimum: 1, maximum: 100 }),
      mode: Type.Union([Type.Literal("fts"), Type.Literal("semantic")]),
    },
    { additionalProperties: false },
  ),
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
