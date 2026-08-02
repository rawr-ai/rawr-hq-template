import { createHabitatClientForWorkspace, type HabitatClient } from "@habitat-ai/sdk";
import { createHabitatNxPlugin } from "./nx/projection.js";

const clientForWorkspace = createHabitatClientForWorkspace satisfies (
  workspaceRoot: string
) => Promise<HabitatClient>;

const plugin = createHabitatNxPlugin({
  clientForWorkspace,
  runtimeInputs: [
    "{workspaceRoot}/bun.lock",
    "{workspaceRoot}/package.json",
    { env: "HABITAT_COMMAND_TIMEOUT_MS" },
  ],
});

/** Native Nx project inference backed by the public Habitat SDK. */
export const createNodes = plugin.createNodes;
