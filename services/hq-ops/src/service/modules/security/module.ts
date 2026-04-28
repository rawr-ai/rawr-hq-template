/**
 * @fileoverview Security module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.security
  .use(observability)
  .use(analytics);
