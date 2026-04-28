import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

/**
 * Runtime composition for the HQ plugin catalog capability.
 */
export const module = impl.pluginCatalog
  .use(observability)
  .use(analytics);
