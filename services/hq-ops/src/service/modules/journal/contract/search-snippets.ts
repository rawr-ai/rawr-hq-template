import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { JournalSearchResultSchema, SearchInputSchema } from "../model/dto/journal.dto";

/** Declares bounded full-text and semantic Journal index search. */
export const searchSnippets = oc
  .meta(procedureMetadata({ idempotent: true, entity: "journal" }))
  .input(standard(SearchInputSchema))
  .output(standard(JournalSearchResultSchema));
