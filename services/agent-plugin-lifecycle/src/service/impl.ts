import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { currentMain } from "./middleware/current-main";
import { observability } from "./middleware/observability";

export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
}).use(currentMain);
