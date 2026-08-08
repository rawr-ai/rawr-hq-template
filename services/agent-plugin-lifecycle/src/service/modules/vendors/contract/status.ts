import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";

import { VendorStatusInputSchema, VendorStatusResultSchema } from "../model/dto/vendor-operations";

/** Defines read-only comparison between declared vendor content and its upstream source. */
export const status = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "vendors",
    })
  )
  .input(standard(VendorStatusInputSchema))
  .output(standard(VendorStatusResultSchema));
