import type { HabitatClientForWorkspace } from "../../../plugins/nx/habitat/src/index.js";
import { createHabitatNxPlugin } from "../../../plugins/nx/habitat/src/index.js";
import { createHabitatClientForWorkspace } from "./composition.js";

const clientForWorkspace = createHabitatClientForWorkspace satisfies HabitatClientForWorkspace;

const plugin = createHabitatNxPlugin({
  clientForWorkspace,
  runtimeInputs: [
    { externalDependencies: ["@habitat-ai/blueprints", "@habitat-ai/cli"] },
    "{workspaceRoot}/bun.lock",
    "{workspaceRoot}/package.json",
    { env: "HABITAT_COMMAND_TIMEOUT_MS" },
  ],
});

/** Native Nx project inference backed by the app-owned Habitat composition. */
export const createNodes = plugin.createNodes;
