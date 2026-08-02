import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { JournalSearchResultSchema, SearchInputSchema } from "../model/dto/journal.dto";

/** Declares bounded full-text and semantic Journal index search. */
export const searchSnippets = oc
  .meta(procedureMetadata({ idempotent: true, entity: "journal" }))
  .input(standard(SearchInputSchema))
  .output(standard(JournalSearchResultSchema));
