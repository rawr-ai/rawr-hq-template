import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import {
  ProviderStatusRequestSchema,
  ProviderStatusResultSchema,
  ProviderSyncRequestSchema,
  ProviderSyncResultSchema,
  ProviderTestRequestSchema,
  ProviderTestResultSchema,
} from "./schemas";

export const contract = {
  test: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(ProviderTestRequestSchema))
    .output(schema(ProviderTestResultSchema)),
  status: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "basic" })
    .input(schema(ProviderStatusRequestSchema))
    .output(schema(ProviderStatusResultSchema)),
  sync: ocBase
    .meta({ idempotent: true, entity: "providers", audit: "full" })
    .input(schema(ProviderSyncRequestSchema))
    .output(schema(ProviderSyncResultSchema)),
};
