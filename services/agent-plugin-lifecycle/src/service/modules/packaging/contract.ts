import { schema } from "@rawr/hq-sdk";

import { ocBase } from "../../base";
import { PackageAgentPluginRequestSchema, PackageAgentPluginResultSchema } from "./schemas";

export const contract = {
  package: ocBase
    .meta({ idempotent: true, entity: "packaging" })
    .input(schema(PackageAgentPluginRequestSchema))
    .output(schema(PackageAgentPluginResultSchema)),
};
