import { contract } from "./contract";
import { createServiceImplementer } from "./base";
import { analytics } from "./middleware/analytics";
import { observability } from "./middleware/observability";

export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
});
