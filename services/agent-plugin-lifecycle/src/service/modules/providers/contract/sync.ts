import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";

import {
  ProviderSyncRequestSchema,
  ProviderSyncResultSchema,
} from "../model/dto/provider-lifecycle";

/** Defines canonical convergence of live provider state to reviewed content. */
export const sync = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "providers",
    })
  )
  .input(standard(ProviderSyncRequestSchema))
  .output(standard(ProviderSyncResultSchema));
