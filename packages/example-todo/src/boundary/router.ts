/**
 * @fileoverview Package boundary wrapper for the todo package.
 *
 * @remarks
 * This is the single choke point where package-wide middleware is applied and
 * the domain router is finally attached.
 *
 * Hard rule: this must be the only file that performs the final `.router(...)`
 * attach for this package.
 */
import { domainMiddleware } from "../domain/boundary";
import { router as domainRouter } from "../domain/router";
import { os } from "../domain/setup";
import { withTelemetry } from "./middleware/with-telemetry";

let builder = os.use(withTelemetry);
for (const middleware of domainMiddleware) {
  builder = builder.use(middleware);
}

export const router = builder.router(domainRouter);

export type Router = typeof router;
