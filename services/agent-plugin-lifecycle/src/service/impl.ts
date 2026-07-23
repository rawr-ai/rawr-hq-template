import { createServiceImplementer } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { currentMain } from "./middleware/current-main";
import { observability } from "./middleware/observability";
import { selectedContent } from "./middleware/selected-content";

export const impl = createServiceImplementer(contract, {
  observability,
  analytics,
})
  .use(currentMain)
  .use(selectedContent);
