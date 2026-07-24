import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";

import {
  VendorStatusInputSchema,
  VendorStatusResultSchema,
  VendorUpdateInputSchema,
  VendorUpdateResultSchema,
} from "./schemas";

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
