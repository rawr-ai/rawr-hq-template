import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";

import { VendorUpdateInputSchema, VendorUpdateResultSchema } from "../model/dto/vendor-operations";

/** Defines explicit authoring of admitted vendor updates into the content workspace. */
export const update = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "vendors",
    })
  )
  .input(standard(VendorUpdateInputSchema))
  .output(standard(VendorUpdateResultSchema));
