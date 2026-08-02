import { procedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
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
  .output(standard(PackageAgentPluginResultSchema));

export { packageContract as package };
