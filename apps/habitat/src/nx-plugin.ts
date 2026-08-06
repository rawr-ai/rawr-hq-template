import { createHabitatClientForWorkspace, type HabitatClient } from "@habitat-ai/sdk";
import { createHabitatNxPlugin } from "./nx/projection.js";

const clientForWorkspace = createHabitatClientForWorkspace satisfies (
  workspaceRoot: string
) => Promise<HabitatClient>;

const plugin = createHabitatNxPlugin({
  clientForWorkspace,
  runtimeInputs: [
    // The CLI pins its SDK exactly, so the CLI node and lockfile identify the runtime closure.
    { externalDependencies: ["@habitat-ai/cli"] },
    "{workspaceRoot}/bun.lock",
    "{workspaceRoot}/package.json",
    { env: "HABITAT_COMMAND_TIMEOUT_MS" },
    { env: "NX_WORKSPACE_ROOT_PATH" },
  ],
});

/** Native Nx project inference backed by the public Habitat SDK. */
export const createNodes = plugin.createNodes;
