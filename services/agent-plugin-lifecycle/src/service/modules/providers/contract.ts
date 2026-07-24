import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";

import {
  ProviderStatusRequestSchema,
  ProviderStatusResultSchema,
  ProviderSyncRequestSchema,
  ProviderSyncResultSchema,
  ProviderTestRequestSchema,
  ProviderTestResultSchema,
} from "./schemas";

export const contract = {
  test: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "providers" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "providers",
    })
    .input(schema(ProviderTestRequestSchema))
    .output(schema(ProviderTestResultSchema)),
  status: eoc
    .$meta<ServiceMetadataOf<{ audit: "basic"; entity: "providers" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "basic",
      entity: "providers",
    })
    .input(schema(ProviderStatusRequestSchema))
    .output(schema(ProviderStatusResultSchema)),
  sync: eoc
    .$meta<ServiceMetadataOf<{ audit: "full"; entity: "providers" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "providers",
    })
    .input(schema(ProviderSyncRequestSchema))
    .output(schema(ProviderSyncResultSchema)),
};
