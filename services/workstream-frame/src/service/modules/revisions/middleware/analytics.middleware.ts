/**
 * @fileoverview Additive module-scope analytics middleware.
 *
 * @remarks
 * Intentional no-op placeholder. The required service-wide analytics
 * contributor is attached once in `src/service/impl.ts`.
 */
import { createServiceAnalyticsMiddleware } from "../../../base";

/** Additive module analytics placeholder. */
export const analytics = createServiceAnalyticsMiddleware({});
