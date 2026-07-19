import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { artifacts } from "./middleware/artifacts";
import { currentMain } from "./middleware/current-main";
import { observability } from "./middleware/observability";

export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(currentMain)
  .use(artifacts);
