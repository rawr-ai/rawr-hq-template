/**
 * @fileoverview Central oRPC implementer for the coordination package.
 */
import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";

const requiredExtensions = {
  observability,
  analytics,
};

export const impl = createServiceImplementer(contract, requiredExtensions);
