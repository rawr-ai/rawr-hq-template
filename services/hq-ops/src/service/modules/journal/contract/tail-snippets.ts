import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";
import { JournalTailResultSchema, TailInputSchema } from "../model/dto/journal.dto";

/** Declares bounded reverse-chronological Journal index retrieval. */
export const tailSnippets = oc
  .meta(procedureMetadata({ idempotent: true, entity: "journal" }))
  .input(standard(TailInputSchema))
  .output(standard(JournalTailResultSchema));
