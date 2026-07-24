import { type ServiceMetadataOf, schema } from "@rawr/hq-sdk";
import { eoc } from "effect-orpc";

import { PackageAgentPluginRequestSchema, PackageAgentPluginResultSchema } from "./schemas";

export const contract = {
  package: eoc
    .$meta<ServiceMetadataOf<{ audit: "basic"; entity: "packaging" }>>({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "basic",
      entity: "packaging",
    })
    .input(schema(PackageAgentPluginRequestSchema))
    .output(schema(PackageAgentPluginResultSchema)),
};
