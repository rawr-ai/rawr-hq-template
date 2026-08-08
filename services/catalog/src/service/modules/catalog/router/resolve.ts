import { module } from "../module.js";

/** Returns the request-local catalog resolution prepared by module middleware. */
export const resolve = module.resolve.effect(function* ({ context }) {
  return yield* context.currentCatalog;
});
