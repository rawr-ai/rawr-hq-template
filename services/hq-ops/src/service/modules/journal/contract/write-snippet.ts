import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { JournalSnippetSchema } from "../entities";
import { JournalWriteResultSchema } from "../model/dto/journal.dto";

/** Declares canonical Journal snippet persistence with best-effort indexing. */
export const writeSnippet = oc
  .meta(procedureMetadata({ idempotent: false, entity: "journal" }))
  .input(standard(JournalSnippetSchema))
  .output(standard(JournalWriteResultSchema));
