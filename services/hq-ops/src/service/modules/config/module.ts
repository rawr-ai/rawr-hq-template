/**
 * @fileoverview Config module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.config
  .use(observability)
  .use(analytics);
