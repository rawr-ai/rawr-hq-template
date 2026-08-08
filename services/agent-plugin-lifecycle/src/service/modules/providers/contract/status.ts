import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";

import {
  ProviderStatusRequestSchema,
  ProviderStatusResultSchema,
} from "../model/dto/provider-lifecycle";

/** Defines read-only comparison between selected content and live provider state. */
export const status = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      entity: "providers",
    })
  )
  .input(standard(ProviderStatusRequestSchema))
  .output(standard(ProviderStatusResultSchema))
  .errors({
    BAD_REQUEST: { message: "Provider status request is invalid" },
  });
