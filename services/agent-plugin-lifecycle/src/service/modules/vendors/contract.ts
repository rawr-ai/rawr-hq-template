import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";

import {
  VendorStatusInputSchema,
  VendorStatusResultSchema,
  VendorUpdateInputSchema,
  VendorUpdateResultSchema,
} from "./model/dto/vendor-operations";

/** Declares the TypeBox-backed Vendor observation and authoring boundaries. */
export const contract = {
  status: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "vendors" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "vendors",
    })
    .input(schema(VendorStatusInputSchema))
    .output(schema(VendorStatusResultSchema)),
  update: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "vendors" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "vendors",
    })
    .input(schema(VendorUpdateInputSchema))
    .output(schema(VendorUpdateResultSchema)),
};
