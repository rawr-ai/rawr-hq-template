import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { JournalTailResultSchema, TailInputSchema } from "../model/dto/journal.dto";

/** Declares bounded reverse-chronological Journal index retrieval. */
export const tailSnippets = oc
  .meta(procedureMetadata({ idempotent: true, entity: "journal" }))
  .input(standard(TailInputSchema))
  .output(standard(JournalTailResultSchema));
