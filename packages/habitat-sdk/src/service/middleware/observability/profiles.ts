import type { Attributes, Span } from "@opentelemetry/api";

import type { BaseMetadata } from "../../metadata";
import type { Logger } from "../../ports";
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
  ObservabilityMiddlewareInput,
} from "./types";

/** Fully resolved signal vocabulary consumed by the procedure lifecycle wrapper. */
export type ResolvedObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends { deps: { logger: Logger } },
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
  onStart?(args: { span: Span | undefined } & ObservabilityBaseArgs<TMeta, TContext>): void;
  onSuccess?(args: { span: Span | undefined } & ObservabilityDurationArgs<TMeta, TContext>): void;
  onError?(
    args: {
      span: Span | undefined;
      policyEvents: TPolicyEvents | undefined;
    } & ObservabilityFailedArgs<TMeta, TContext>
  ): void;
};

/** Resolves one service profile over the generic procedure signal vocabulary. */
export function resolveObservabilityProfile<
  TMeta extends BaseMetadata,
  TContext extends { deps: { logger: Logger } },
  TPolicyEvents extends Record<string, string | undefined> | undefined,
>(
  baseMetadata: TMeta,
  input: ObservabilityMiddlewareInput<TMeta, TContext, TPolicyEvents>
): ResolvedObservabilityProfile<TMeta, TContext, TPolicyEvents> {
  const names = deriveServiceNames(baseMetadata, input.attributeNamespace ?? "habitat");

  return {
    loggerEvent: names.loggerEvent,
    startedEvent: names.startedEvent,
    succeededEvent: names.succeededEvent,
    failedEvent: names.failedEvent,
    getSpanAttributes: ({ context, meta, path, pathLabel }) => ({
      [`${names.orpcAttributePrefix}.path`]: pathLabel,
      [`${names.orpcAttributePrefix}.idempotent`]: meta.idempotent,
      ...(meta.domain ? { [`${names.orpcAttributePrefix}.domain`]: meta.domain } : {}),
      ...(meta.audience ? { [`${names.orpcAttributePrefix}.audience`]: meta.audience } : {}),
      ...prefixAttributes(names.serviceAttributePrefix, {
        ...(getMetadataAudit(meta) ? { audit: getMetadataAudit(meta) } : {}),
        ...(getMetadataEntity(meta, path) ? { entity: getMetadataEntity(meta, path) } : {}),
        ...input.spanAttributes?.({ context, meta, path, pathLabel }),
      }),
    }),
    getLogFields: ({ context, meta, path, pathLabel, durationMs, spanTraceId }) => ({
      domain: meta.domain,
      audience: meta.audience,
      idempotent: meta.idempotent,
      ...(getMetadataEntity(meta, path) ? { entity: getMetadataEntity(meta, path) } : {}),
      ...(getMetadataAudit(meta) ? { audit: getMetadataAudit(meta) } : {}),
      ...(input.logFields?.({ context, meta, path, pathLabel, durationMs, spanTraceId }) ?? {}),
    }),
    getStartEventAttributes: input.startEventAttributes,
    getSuccessEventAttributes: input.successEventAttributes,
    getErrorEventAttributes: input.errorEventAttributes,
    onStart: input.onStart,
    onSuccess: input.onSuccess,
    onError: input.onError,
  };
}
