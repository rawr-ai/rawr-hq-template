import type { Middleware } from "@orpc/server";
import type { BaseMetadata } from "../../metadata";
import { getProcedureMetadata } from "../../metadata";
import type { Logger } from "../../ports/logger";
import { getErrorDetails } from "./errors";
import { getActiveSpan, getTraceId, setSpanError } from "./otel";
import type { ResolvedObservabilityProfile } from "./profiles";
import { resolveObservabilityProfile } from "./profiles";
import type { ObservabilityMiddlewareInput } from "./types";

export type {
  ObservabilityErrorDetails,
  ObservabilityMiddlewareInput,
} from "./types";

type ObservabilityContext = {
  deps: {
    logger: Logger;
  };
};

function observe(action: () => void): void {
  try {
    action();
  } catch {
    // Observability is evidence, never procedure-result authority.
  }
}

function createObservabilityHandler<
  TMeta extends BaseMetadata,
  TContext extends ObservabilityContext,
  TPolicyEvents extends Record<string, string | undefined> | undefined,
>(options: {
  metadataDefaults: TMeta;
  profile: ResolvedObservabilityProfile<TMeta, TContext, TPolicyEvents>;
  policyEvents: TPolicyEvents | undefined;
}): Middleware<TContext, object, unknown, unknown, Record<never, never>> {
  return async ({ context, path, procedure, next }) => {
    let span: ReturnType<typeof getActiveSpan>;
    observe(() => {
      span = getActiveSpan();
    });
    const startedAt = Date.now();
    const meta = {
      ...options.metadataDefaults,
      ...getProcedureMetadata(procedure),
    };
    const pathLabel = path.join(".");
    let spanTraceId: string | undefined;

    observe(() => {
      spanTraceId = getTraceId(span);
      span?.setAttributes(
        options.profile.getSpanAttributes({
          context,
          meta,
          path,
          pathLabel,
        })
      );
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
    });

    try {
      const result = await next();
      const durationMs = Date.now() - startedAt;

      observe(() => {
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
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      observe(() => {
        const details = getErrorDetails(error);

        span?.recordException(
          error instanceof Error
            ? error
            : new Error(String(details.errorMessage ?? "procedure failed"))
        );
        setSpanError(
          span,
          typeof details.errorMessage === "string" ? details.errorMessage : "procedure failed"
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
      });

      throw error;
    }
  };
}

/**
 * Creates the callback a service base authors as observability middleware.
 *
 * @remarks
 * The callback consumes only the logger capability it needs. Each service's
 * native oRPC base owns context compatibility and middleware construction;
 * service-specific fields remain ordinary options on this execution boundary.
 */
export function createObservabilityMiddlewareCallback<
  TContext extends ObservabilityContext,
  TMeta extends BaseMetadata = BaseMetadata,
  TPolicyEvents extends Record<string, string | undefined> | undefined = undefined,
>(
  metadataDefaults: TMeta,
  input: ObservabilityMiddlewareInput<TMeta, TContext, TPolicyEvents> = {}
): Middleware<TContext, object, unknown, unknown, Record<never, never>> {
  const profile = resolveObservabilityProfile(metadataDefaults, input);

  return createObservabilityHandler({
    metadataDefaults,
    profile,
    policyEvents: input.policyEvents,
  });
}
