import { createMiddleware } from "../../../base";

/**
 * Contributes Vendor capabilities from service-owned dependencies.
 *
 * @remarks
 * The middleware is authored once from the service-context-seeded native
 * factory. `module.ts` only attaches this completed value.
 */
export const capabilities = createMiddleware().middleware(({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
      clock: context.deps.clock,
      versionedContent: context.deps.versionedContent,
    },
  })
);
