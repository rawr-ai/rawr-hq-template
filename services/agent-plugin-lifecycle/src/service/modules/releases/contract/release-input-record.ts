import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";
import {
  ReleaseInputRecordInputSchema,
  ReleaseInputRecordResultSchema,
} from "../model/dto/release-lifecycle";

/** Defines canonical release-input record encoding and validation for callers. */
export const releaseInputRecord = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "releases",
    })
  )
  .input(standard(ReleaseInputRecordInputSchema))
  .output(standard(ReleaseInputRecordResultSchema));
