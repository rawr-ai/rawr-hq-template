import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

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
