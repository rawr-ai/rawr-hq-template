import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
} from "../model/dto/current-main-record";

/** Contract procedure for encoding or validating a versioned current-main record. */
export const currentMainRecord = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "governance",
    })
  )
  .input(standard(CurrentMainRecordInputSchema))
  .output(standard(CurrentMainRecordResultSchema));
