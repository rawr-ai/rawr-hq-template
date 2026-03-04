/**
 * @fileoverview Domain-wide boundary semantics for the todo package.
 *
 * @remarks
 * This file exports domain-wide middleware as data (ordered list), not as an
 * already-applied chain, so the package boundary can decide ordering relative
 * to package-wide middleware (for example telemetry).
 *
 * Hard rule: this file must not perform the final `.router(...)` attach.
 */
import { withReadOnlyMode } from "./middleware/with-read-only-mode";

export const domainMiddleware = [
  withReadOnlyMode,
] as const;

