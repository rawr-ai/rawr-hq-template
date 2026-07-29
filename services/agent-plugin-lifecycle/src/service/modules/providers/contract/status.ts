import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

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
