/**
 * @fileoverview Plugin-install module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.pluginInstall
  .use(observability)
  .use(analytics);
