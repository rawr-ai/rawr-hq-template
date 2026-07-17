import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import {
  VendorStatusInputSchema,
  VendorStatusResultSchema,
  VendorUpdateInputSchema,
  VendorUpdateResultSchema,
} from "./schemas";

export const contract = {
  status: ocBase
    .meta({ idempotent: true, audit: "full", entity: "vendors" })
    .input(schema(VendorStatusInputSchema))
    .output(schema(VendorStatusResultSchema)),
  update: ocBase
    .meta({ idempotent: true, audit: "full", entity: "vendors" })
    .input(schema(VendorUpdateInputSchema))
    .output(schema(VendorUpdateResultSchema)),
};
