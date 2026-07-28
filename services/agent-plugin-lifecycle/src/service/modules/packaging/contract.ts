import { oc } from "@orpc/contract";
import { procedureMetadata } from "@rawr/hq-sdk";
import { standard } from "@rawr/typebox-adapter";

import {
  PackageAgentPluginRequestSchema,
  PackageAgentPluginResultSchema,
} from "./model/dto/packaging-lifecycle";

/** Declares the TypeBox-backed deterministic packaging operation boundary. */
export const contract = {
  package: oc
    .meta(
      procedureMetadata({
        idempotent: true,
        entity: "packaging",
      })
    )
    .input(standard(PackageAgentPluginRequestSchema))
    .output(standard(PackageAgentPluginResultSchema)),
};
