import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";

export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
});
