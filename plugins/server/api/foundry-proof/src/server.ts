import { FoundryProofService } from "@rawr/foundry-proof";
import { defineServerApiPlugin, useService } from "@rawr/sdk/plugins/server";

export const FoundryProofServerApiPlugin = defineServerApiPlugin({
  capability: "foundry-proof",
  routeBase: "/foundry-proof",
  services: {
    foundryProof: useService(FoundryProofService),
  },
  api: () => ({
    ping: {
      method: "POST",
      path: "/foundry-proof/ping",
      service: "foundryProof",
    },
  }),
});

export function registerFoundryProofServerApiPlugin() {
  return FoundryProofServerApiPlugin;
}

export type FoundryProofServerApiPluginRegistration = ReturnType<typeof registerFoundryProofServerApiPlugin>;
