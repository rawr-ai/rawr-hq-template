import { FoundryProofService } from "@rawr/foundry-proof";
import { defineAsyncWorkflowPlugin, defineWorkflow, useService } from "@rawr/sdk/plugins/async";

export const FoundryProofWorkflow = defineWorkflow({
  id: "foundry-proof.sync",
  async run() {
    return {
      ok: true,
      capability: "foundry-proof",
    };
  },
});

export const FoundryProofWorkflowPlugin = defineAsyncWorkflowPlugin({
  capability: "foundry-proof",
  services: {
    foundryProof: useService(FoundryProofService),
  },
  workflows: [FoundryProofWorkflow],
});

export function registerFoundryProofWorkflowPlugin() {
  return FoundryProofWorkflowPlugin;
}

export type FoundryProofWorkflowPluginRegistration = ReturnType<typeof registerFoundryProofWorkflowPlugin>;
