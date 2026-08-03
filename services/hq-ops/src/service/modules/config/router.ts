import { getGlobalConfig } from "./router/get-global-config";
import { getLayeredConfig } from "./router/get-layered-config";
import { getWorkspaceConfig } from "./router/get-workspace-config";

/** Completed config operation tree consumed by the HQ Ops service router. */
export const router = {
  getWorkspaceConfig,
  getGlobalConfig,
  getLayeredConfig,
};
