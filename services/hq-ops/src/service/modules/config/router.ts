import { getGlobalConfig } from "./router/get-global-config.router";
import { getLayeredConfig } from "./router/get-layered-config.router";
import { getWorkspaceConfig } from "./router/get-workspace-config.router";

/** Completed config operation tree consumed by the HQ Ops service router. */
export const router = {
  getWorkspaceConfig,
  getGlobalConfig,
  getLayeredConfig,
};
