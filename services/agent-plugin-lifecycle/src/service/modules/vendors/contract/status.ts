import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";

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
