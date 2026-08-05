import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";

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
  .output(standard(ProviderTestResultSchema))
  .errors({
    BAD_REQUEST: { message: "Provider test request is invalid" },
  });
