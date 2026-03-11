import type { Attributes, Span } from "../../host-adapters/telemetry/opentelemetry";
import type { BaseMetadata, Logger } from "../../base";
import {
  deriveServiceNames,
  getMetadataAudit,
  getMetadataEntity,
  prefixAttributes,
} from "./naming";
import type {
  ObservabilityBaseArgs,
  ObservabilityDurationArgs,
  ObservabilityFailedArgs,
  RequiredServiceObservabilityMiddlewareInput,
} from "./types";

export type ResolvedObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicyEvents extends Record<string, string | undefined> | undefined = undefined,
> = {
  loggerEvent: string;
  startedEvent: string;
  succeededEvent: string;
  failedEvent: string;
  getSpanAttributes(args: ObservabilityBaseArgs<TMeta, TContext>): Attributes;
  getLogFields(args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
    spanTraceId?: string;
  }): Record<string, unknown>;
  getStartEventAttributes?(args: ObservabilityBaseArgs<TMeta, TContext>): Attributes;
  getSuccessEventAttributes?(args: ObservabilityDurationArgs<TMeta, TContext>): Attributes;
  getErrorEventAttributes?(args: ObservabilityFailedArgs<TMeta, TContext>): Attributes;
  onStart?(args: {
    span: Span | undefined;
  } & ObservabilityBaseArgs<TMeta, TContext>): void;
  onSuccess?(args: {
    span: Span | undefined;
  } & ObservabilityDurationArgs<TMeta, TContext>): void;
  onError?(args: {
    span: Span | undefined;
    policyEvents: TPolicyEvents;
  } & ObservabilityFailedArgs<TMeta, TContext>): void;
};

export function createBaseObservabilityProfile(): ResolvedObservabilityProfile<
  BaseMetadata,
  {
    deps: {
      logger: Logger;
    };
  }
> {
  return {
    loggerEvent: "orpc.procedure",
    startedEvent: "rawr.orpc.procedure.started",
    succeededEvent: "rawr.orpc.procedure.succeeded",
    failedEvent: "rawr.orpc.procedure.failed",
    getSpanAttributes: ({ meta, pathLabel }) => ({
      "rawr.orpc.path": pathLabel,
      "rawr.orpc.idempotent": meta.idempotent,
      ...(meta.domain ? { "rawr.orpc.domain": meta.domain } : {}),
      ...(meta.audience ? { "rawr.orpc.audience": meta.audience } : {}),
    }),
    getLogFields: ({ meta, durationMs, pathLabel, spanTraceId }) => ({
      path: pathLabel,
      durationMs,
      spanTraceId,
      domain: meta.domain,
      audience: meta.audience,
      idempotent: meta.idempotent,
    }),
  };
}

export function resolveRequiredServiceObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
  TPolicyEvents extends Record<string, string | undefined> | undefined,
>(
  baseMetadata: TMeta,
  input: RequiredServiceObservabilityMiddlewareInput<TMeta, TContext, TPolicyEvents>,
): ResolvedObservabilityProfile<TMeta, TContext, TPolicyEvents> {
  const names = deriveServiceNames(baseMetadata);

  return {
    loggerEvent: names.loggerEvent,
    startedEvent: names.startedEvent,
    succeededEvent: names.succeededEvent,
    failedEvent: names.failedEvent,
    getSpanAttributes: ({ context, meta, path, pathLabel }) =>
      prefixAttributes(names.attributePrefix, {
        ...(getMetadataAudit(meta) ? { audit: getMetadataAudit(meta) } : {}),
        ...(getMetadataEntity(meta, path) ? { entity: getMetadataEntity(meta, path) } : {}),
        ...input.spanAttributes?.({
          context,
          meta,
          path,
          pathLabel,
        }),
      }),
    getLogFields: ({ context, meta, path, pathLabel, durationMs, spanTraceId }) => ({
      ...(getMetadataEntity(meta, path) ? { entity: getMetadataEntity(meta, path) } : {}),
      ...(getMetadataAudit(meta) ? { audit: getMetadataAudit(meta) } : {}),
      ...(input.logFields?.({
        context,
        meta,
        path,
        pathLabel,
        durationMs,
        spanTraceId,
      }) ?? {}),
    }),
    getStartEventAttributes: input.startEventAttributes,
    getSuccessEventAttributes: input.successEventAttributes,
    getErrorEventAttributes: input.errorEventAttributes,
    onStart: input.onStart,
    onSuccess: input.onSuccess,
    onError: input.onError,
  };
}
