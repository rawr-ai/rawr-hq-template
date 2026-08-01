import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";

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
  .output(standard(ProviderStatusResultSchema));
