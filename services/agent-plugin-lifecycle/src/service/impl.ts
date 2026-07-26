import { base, baselineAnalytics, baselineObservability } from "./base";
import { analytics } from "./middleware/analytics.middleware";
import { observability } from "./middleware/observability.middleware";

export const service = base
  .use(baselineObservability)
  .use(baselineAnalytics)
  .use(observability)
  .use(analytics);
