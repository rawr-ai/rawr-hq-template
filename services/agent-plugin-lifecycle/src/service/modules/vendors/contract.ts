import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

import {
  VendorStatusInputSchema,
  VendorStatusResultSchema,
  VendorUpdateInputSchema,
  VendorUpdateResultSchema,
} from "./model/dto/vendor-operations";

/** Declares the TypeBox-backed Vendor observation and authoring boundaries. */
export const contract = {
  status: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "vendors",
      })
    )
    .input(standard(VendorStatusInputSchema))
    .output(standard(VendorStatusResultSchema)),
  update: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "vendors",
      })
    )
    .input(standard(VendorUpdateInputSchema))
    .output(standard(VendorUpdateResultSchema)),
};
