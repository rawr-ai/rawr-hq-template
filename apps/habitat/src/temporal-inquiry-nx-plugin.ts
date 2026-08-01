import {
  inquiryDefinitionInputs,
  loadInquiryDefinition,
} from "@habitat/resource-temporal-inquiry/providers/fluree-effect-platform-node/definition";

import {
  createTemporalInquiryNxPlugin,
  type TemporalInquiryNxDefinition,
} from "../../../plugins/nx/habitat/src/index.js";

const plugin = createTemporalInquiryNxPlugin({
  async loadDefinition(workspaceRoot, definitionPath): Promise<TemporalInquiryNxDefinition> {
    const definition = await loadInquiryDefinition(workspaceRoot, definitionPath);
    return {
      ownerProject: definition.ownerProject,
      inputs: inquiryDefinitionInputs(definition),
      queryRoot: definition.adapters.queries,
    };
  },
  runtimeInputs: [
    { externalDependencies: ["@habitat/cli"] },
    "{workspaceRoot}/bun.lock",
    "{workspaceRoot}/package.json",
  ],
});

/** Native Nx projection for an explicit consumer-owned temporal inquiry. */
export const createNodes = plugin.createNodes;
