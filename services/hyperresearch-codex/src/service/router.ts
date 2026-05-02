/**
 * @fileoverview Service router composition for the hyperresearch-codex package.
 */
import { router as runtime } from "./modules/runtime/router";
import { impl } from "./impl";

export const router = impl.router({
  runtime,
});

export type Router = typeof router;
