/**
 * @fileoverview Telemetry middleware (proto SDK layer).
 *
 * @remarks
 * Logs one event per procedure execution (success or failure). This middleware
 * is observability-only and must not alter procedure behavior or remap errors.
 *
 * @agents
 * Keep log payload keys stable (`path`, `durationMs`, `code`, `status`) so test
 * assertions stay resilient as implementation evolves.
 */
import type { Logger } from "../base";
import { createBaseMiddleware } from "../factory";

type ErrorShape = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

function toErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { errorName: "UnknownError" };
  }

  const typed = error as ErrorShape;

  return {
    errorName: typeof typed.name === "string" ? typed.name : "UnknownError",
    errorMessage: typeof typed.message === "string" ? typed.message : undefined,
    code: typeof typed.code === "string" ? typed.code : undefined,
    status: typeof typed.status === "number" ? typed.status : undefined,
  };
}

function getProcedureDomain(procedure: unknown) {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: { domain?: unknown } } };
  const domain = anyProcedure?.["~orpc"]?.meta?.domain;
  return typeof domain === "string" && domain.length > 0 ? domain : undefined;
}

/**
 * Create baseline telemetry middleware.
 *
 * @remarks
 * This is configurable middleware, so it exports a constructor rather than a
 * ready-to-use value. Required runtime dependencies still mirror the context
 * shape directly under `deps`.
 */
export function createTelemetryMiddleware(options: { defaultDomain: string }) {
  return createBaseMiddleware<{
    deps: {
      logger: Logger;
    };
  }>().middleware(async ({ context, path, procedure, next }) => {
    const start = Date.now();
    const pathLabel = path.join(".");
    const domain = getProcedureDomain(procedure) ?? options.defaultDomain;
    const successEvent = `${domain}.procedure.success`;
    const errorEvent = `${domain}.procedure.error`;

    try {
      const result = await next();
      context.deps.logger.info(successEvent, {
        path: pathLabel,
        durationMs: Date.now() - start,
      });
      return result;
    }
    catch (error) {
      context.deps.logger.error(errorEvent, {
        path: pathLabel,
        durationMs: Date.now() - start,
        ...toErrorDetails(error),
      });
      throw error;
    }
  });
}
