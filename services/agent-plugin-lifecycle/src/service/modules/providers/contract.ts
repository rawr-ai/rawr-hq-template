import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

import {
  ProviderStatusRequestSchema,
  ProviderStatusResultSchema,
  ProviderSyncRequestSchema,
  ProviderSyncResultSchema,
  ProviderTestRequestSchema,
  ProviderTestResultSchema,
} from "./model/dto/provider-lifecycle";

export const contract = {
  test: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "providers",
      })
    )
    .input(standard(ProviderTestRequestSchema))
    .output(standard(ProviderTestResultSchema)),
  status: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        entity: "providers",
      })
    )
    .input(standard(ProviderStatusRequestSchema))
    .output(standard(ProviderStatusResultSchema)),
  sync: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        audit: "full",
        entity: "providers",
      })
    )
    .input(standard(ProviderSyncRequestSchema))
    .output(standard(ProviderSyncResultSchema)),
};
