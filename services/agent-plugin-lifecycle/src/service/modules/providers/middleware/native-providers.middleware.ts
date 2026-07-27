import { createMiddleware } from "../../../base";

/**
 * Projects the ready native-provider resources into the Providers module.
 *
 * @remarks
 * The resources retain native acquisition and command mechanics while Provider
 * operations own observation and mutation sequencing.
 */
export const nativeProviders = createMiddleware().middleware(({ context, next }) => {
  return next({
    context: {
      nativeProviders: context.deps.nativeProviders,
    },
  });
});
