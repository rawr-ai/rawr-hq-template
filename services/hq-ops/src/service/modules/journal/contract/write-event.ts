import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { JournalWriteResultSchema } from "../model/dto/journal.dto";
import { JournalEventSchema } from "../model/entities";

/** Declares canonical append-only Journal event persistence. */
export const writeEvent = oc
  .meta(procedureMetadata({ idempotent: false, entity: "journal" }))
  .input(standard(JournalEventSchema))
  .output(standard(JournalWriteResultSchema));
