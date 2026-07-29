import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

import {
  ProviderTestRequestSchema,
  ProviderTestResultSchema,
} from "../model/dto/provider-lifecycle";

/** Defines disposable native-provider convergence against exact local Git content. */
export const test = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      audit: "full",
      entity: "providers",
    })
  )
  .input(standard(ProviderTestRequestSchema))
  .output(standard(ProviderTestResultSchema));
