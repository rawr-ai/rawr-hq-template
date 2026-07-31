import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { JournalGetSnippetResultSchema, SnippetIdInputSchema } from "../model/dto/journal.dto";

/** Declares canonical JSON-backed Journal snippet retrieval. */
export const getSnippet = oc
  .meta(procedureMetadata({ idempotent: true, entity: "journal" }))
  .input(standard(SnippetIdInputSchema))
  .output(standard(JournalGetSnippetResultSchema));
