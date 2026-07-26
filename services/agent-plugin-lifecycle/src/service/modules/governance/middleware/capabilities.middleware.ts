import { createMiddleware } from "../../../base";

/** Contributes the exact-content resource used by Governance procedures. */
export const capabilities = createMiddleware().middleware(({ context, next }) =>
  next({
    context: {
      contentWorkspace: context.deps.contentWorkspace,
    },
  })
);
