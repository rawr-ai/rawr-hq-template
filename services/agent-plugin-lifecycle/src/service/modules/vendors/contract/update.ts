import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

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
