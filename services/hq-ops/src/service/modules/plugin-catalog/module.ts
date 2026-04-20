import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.pluginCatalog
  .use(observability)
  .use(analytics);
