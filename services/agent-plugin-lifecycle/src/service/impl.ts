import {
  base,
  createServiceBaselineMiddlewares,
  type InitialLifecycleContext,
  type ReadyLifecycleContext,
} from "./base";
import { analytics } from "./middleware/analytics";
import { context } from "./middleware/context";
import { currentMain } from "./middleware/current-main";
import { observability } from "./middleware/observability";
import { selectedContent } from "./middleware/selected-content";

const baseline = createServiceBaselineMiddlewares();

export const service = base
  .use<ReadyLifecycleContext, InitialLifecycleContext>(context)
  .use(baseline.observability)
  .use(baseline.analytics)
  .use(observability)
  .use(analytics)
  .use(currentMain)
  .use(selectedContent);
