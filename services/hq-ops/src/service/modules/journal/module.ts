/**
 * @fileoverview Journal module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.journal
  .use(observability)
  .use(analytics);
