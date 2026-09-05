import { join } from "node:path";
import { config } from "../src/control.js";

export const sources = {
  appRoot: config.workspaceRoot,
  test: {
    lease: { root: config.workspaceRoot, role: config.role, incarnation: config.incarnation },
    client: {
      devServerUrl: config.devServerUrl,
      requiredResourcePath: join(config.workspaceRoot, "async-required-resource"),
    },
  },
};
