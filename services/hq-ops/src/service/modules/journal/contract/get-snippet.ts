import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { JournalGetSnippetResultSchema, SnippetIdInputSchema } from "../model/dto/journal.dto";

/** Declares canonical JSON-backed Journal snippet retrieval. */
export const getSnippet = oc
  .meta(procedureMetadata({ idempotent: true, entity: "journal" }))
  .input(standard(SnippetIdInputSchema))
  .output(standard(JournalGetSnippetResultSchema));
