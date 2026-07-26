/**
 * @fileoverview Additive module-scope observability middleware.
 *
 * @remarks
 * Intentional no-op placeholder. The required service-wide observability
 * middleware is attached once in `src/service/impl.ts`; this slot exists so
 * every module exposes the same generic middleware surface.
 */
import { createServiceObservabilityMiddleware } from "../../../base";

/** Additive module observability placeholder. */
export const observability = createServiceObservabilityMiddleware({});
