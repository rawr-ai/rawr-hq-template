/**
 * @fileoverview Package-level module implementer scaffold.
 *
 * @remarks
 * This is the global ORPC module base for this package. It defines shared
 * module setup and package-wide telemetry middleware for uncaught handler errors.
 *
 * This middleware is observability-only: it logs and rethrows. It does not map
 * or mutate ORPC boundary errors.
 *
 * @agents
 * Module routers should start from `createModule(contract).use(withUnhandledTelemetry)`,
 * then add module-local `.use(...)` wiring for repositories/services.
 */
import { createDomainModule } from "@rawr/orpc-standards";
import type { AnyContractRouter } from "@orpc/contract";
import { os } from "@orpc/server";
import type { Deps } from "./deps";

interface Context {
  deps: Deps;
}

export const withUnhandledTelemetry = os.$context<Context>().middleware(async ({ context, next, path }) => {
  const startedAt = Date.now();

  try {
    return await next();
  } catch (error) {
    context.deps.logger.error("todo.orpc.unhandled_error", {
      path: path.join("."),
      durationMs: Date.now() - startedAt,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
});

export function createModule<T extends AnyContractRouter>(contract: T) {
  return createDomainModule<T, Deps>(contract);
}
