import { resolveCatalogForWorkspace } from "./application.js";
import { createHabitatNxPlugin } from "./nx/projection.js";
import { cliPackageRoot } from "./product-version.js";

const plugin = createHabitatNxPlugin({
  resolveForWorkspace: (workspaceRoot) =>
    resolveCatalogForWorkspace({
      appRoot: cliPackageRoot(),
      workspaceRoot,
      development: import.meta.url.endsWith(".ts"),
    }),
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
