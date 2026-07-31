import { getGlobalConfig } from "./get-global-config";
import { getLayeredConfig } from "./get-layered-config";
import { getWorkspaceConfig } from "./get-workspace-config";

/** Config module contract composed from its operation leaves. */
export const contract = {
  getWorkspaceConfig,
  getGlobalConfig,
  getLayeredConfig,
};
