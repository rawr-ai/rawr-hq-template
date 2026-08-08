import { procedureMetadata } from "@habitat-ai/sdk/service";
import { standard } from "@habitat-ai/sdk/service/schema";
import { oc } from "@orpc/contract";

import {
  PackageAgentPluginRequestSchema,
  PackageAgentPluginResultSchema,
} from "../model/dto/packaging-lifecycle";

/** Defines deterministic Cowork package construction and publication for callers. */
const packageContract = oc
  .meta(
    procedureMetadata({
      idempotent: true,
      entity: "packaging",
    })
  )
  .input(standard(PackageAgentPluginRequestSchema))
  .output(standard(PackageAgentPluginResultSchema))
  .errors({
    BAD_REQUEST: { message: "Package request is invalid" },
  });

export { packageContract as package };
