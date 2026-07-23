import { Layer } from "effect";
import { implementEffect } from "effect-orpc";

import { createServiceBaselineMiddlewares, type ReadyLifecycleContext } from "./base";
import { contract } from "./contract";
import { analytics } from "./middleware/analytics";
import { currentMain } from "./middleware/current-main";
import { observability } from "./middleware/observability";
import { selectedContent } from "./middleware/selected-content";

const baseline = createServiceBaselineMiddlewares();

export const service = implementEffect(contract, Layer.empty)
  .$context<ReadyLifecycleContext>()
  .use(baseline.observability)
  .use(baseline.analytics)
  .use(observability)
  .use(analytics)
  .use(currentMain)
  .use(selectedContent);
