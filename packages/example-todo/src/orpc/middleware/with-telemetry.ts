/**
 * @fileoverview Package-global telemetry middleware.
 *
 * @remarks
 * Logs one event per procedure execution (success or failure). This middleware
 * is observability-only and must not alter procedure behavior or remap errors.
 *
 * @agents
 * Keep log payload keys stable (`path`, `durationMs`, `code`, `status`) so test
 * assertions stay resilient as implementation evolves.
 */
import { middlewareBuilder as os } from "../base";

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

export const withTelemetry = os.middleware(async ({ context, path, next }) => {
  const start = Date.now();
  const pathLabel = path.join(".");

  try {
    const result = await next();
    context.deps.logger.info("todo.procedure.success", {
      path: pathLabel,
      durationMs: Date.now() - start,
    });
    return result;
  }
  catch (error) {
    context.deps.logger.error("todo.procedure.error", {
      path: pathLabel,
      durationMs: Date.now() - start,
      ...toErrorDetails(error),
    });
    throw error;
  }
});
