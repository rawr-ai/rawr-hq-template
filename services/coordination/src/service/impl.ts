/**
 * @fileoverview Central oRPC implementer for the coordination package.
 */
import {
  createServiceImplementer,
} from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";
import { runsContract } from "./modules/runs/contract";
import { workflowsContract } from "./modules/workflows/contract";

const requiredExtensions = {
  observability,
  analytics,
};

export const impl = createServiceImplementer(contract, requiredExtensions);
export const workflowsImpl = createServiceImplementer(workflowsContract, requiredExtensions);
export const runsImpl = createServiceImplementer(runsContract, requiredExtensions);
