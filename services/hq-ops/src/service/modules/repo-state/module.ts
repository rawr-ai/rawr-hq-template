/**
 * @fileoverview Repo-state module runtime composition.
 */
import { impl } from "../../impl";
import { analytics, observability } from "./middleware";

export const module = impl.repoState
  .use(observability)
  .use(analytics);
