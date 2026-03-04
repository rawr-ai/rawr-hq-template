/**
 * @fileoverview ORPC telemetry middleware (proto SDK layer).
 *
 * @remarks
 * Logs one event per procedure execution (success or failure). This middleware
 * is observability-only and must not alter procedure behavior or remap errors.
 *
 * @agents
 * Keep log payload keys stable (`path`, `durationMs`, `code`, `status`) so test
 * assertions stay resilient as implementation evolves.
 */

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

export type WithTelemetryOptions = {
  defaultDomain: string;
};

export function withTelemetry(os: any, options: WithTelemetryOptions) {
  return os.middleware(async (optionsOrpc: any) => {
    const { context, path, procedure, next } = optionsOrpc as {
      context: { deps: { logger: { info: Function; error: Function } } };
      path: readonly string[];
      procedure?: unknown;
      next: () => Promise<unknown>;
    };

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
