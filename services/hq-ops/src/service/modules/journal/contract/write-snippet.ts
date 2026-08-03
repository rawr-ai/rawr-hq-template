import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { JournalWriteResultSchema } from "../model/dto/journal.dto";
import { JournalSnippetSchema } from "../model/entities";

/** Declares canonical Journal snippet persistence with best-effort indexing. */
export const writeSnippet = oc
  .meta(procedureMetadata({ idempotent: false, entity: "journal" }))
  .input(standard(JournalSnippetSchema))
  .output(standard(JournalWriteResultSchema));
