import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import {
  JournalEventSchema,
  JournalGetSnippetResultSchema,
  JournalSearchResultSchema,
  JournalSnippetSchema,
  JournalTailResultSchema,
  JournalWriteResultSchema,
} from "./schemas";

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
