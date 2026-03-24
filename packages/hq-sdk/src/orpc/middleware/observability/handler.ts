import type { BaseMetadata } from "../../baseline/types";
import type { Logger } from "../../ports/logger";
import { getErrorDetails } from "./errors";
import { getActiveSpan, getTraceId, setSpanError } from "./otel";
import type { ResolvedObservabilityProfile } from "./profiles";
import type { ObservabilityHandlerArgs } from "./types";

export function createObservabilityHandler<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicyEvents extends Record<string, string | undefined> | undefined,
>(options: {
  getMeta(procedure: unknown): TMeta;
  profile: ResolvedObservabilityProfile<TMeta, TContext, TPolicyEvents>;
  policyEvents: TPolicyEvents;
}) {
  return async ({
    context,
    path,
    procedure,
    next,
  }: ObservabilityHandlerArgs<TMeta, TContext>) => {
    const span = getActiveSpan();
    const startedAt = Date.now();
    const meta = options.getMeta(procedure);
    const pathLabel = path.join(".");
    const spanTraceId = getTraceId(span);

    span?.setAttributes(options.profile.getSpanAttributes({
      context,
      meta,
      path,
      pathLabel,
    }));
    span?.addEvent(options.profile.startedEvent, {
      path: pathLabel,
      ...options.profile.getStartEventAttributes?.({
        context,
        meta,
        path,
        pathLabel,
      }),
    });
    options.profile.onStart?.({
      span,
      context,
      meta,
      path,
      pathLabel,
    });

    try {
      const result = await next();
      const durationMs = Date.now() - startedAt;

      span?.addEvent(options.profile.succeededEvent, {
        path: pathLabel,
        durationMs,
        ...options.profile.getSuccessEventAttributes?.({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
        }),
      });
      options.profile.onSuccess?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs,
      });

      context.deps.logger.info(options.profile.loggerEvent, {
        outcome: "success",
        path: pathLabel,
        durationMs,
        ...options.profile.getLogFields({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          spanTraceId,
        }),
      });

      return result;
    }
    catch (error) {
      const durationMs = Date.now() - startedAt;
      const details = getErrorDetails(error);

      span?.recordException(
        error instanceof Error
          ? error
          : new Error(String(details.errorMessage ?? "procedure failed")),
      );
      setSpanError(
        span,
        typeof details.errorMessage === "string"
          ? details.errorMessage
          : "procedure failed",
      );
      span?.addEvent(options.profile.failedEvent, {
        path: pathLabel,
        durationMs,
        ...(details.code ? { code: details.code } : {}),
        ...(typeof details.status === "number" ? { status: details.status } : {}),
        ...options.profile.getErrorEventAttributes?.({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          error: details,
        }),
      });
      options.profile.onError?.({
        span,
        context,
        meta,
        path,
        pathLabel,
        durationMs,
        error: details,
        policyEvents: options.policyEvents,
      });

      context.deps.logger.error(options.profile.loggerEvent, {
        outcome: "error",
        path: pathLabel,
        durationMs,
        ...options.profile.getLogFields({
          context,
          meta,
          path,
          pathLabel,
          durationMs,
          spanTraceId,
        }),
        ...details,
      });

      throw error;
    }
  };
}
