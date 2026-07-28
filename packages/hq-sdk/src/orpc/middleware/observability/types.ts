import type { Attributes, Span } from "@opentelemetry/api";

import type { BaseMetadata } from "../../metadata";
import type { getErrorDetails } from "./errors";

/** Scalar value accepted by OpenTelemetry procedure attributes. */
export type ObservabilityScalar = string | number | boolean;

/** Optional service-owned fields added beneath its observability namespace. */
export type ObservabilityFields = Record<string, ObservabilityScalar | undefined>;

/** Public diagnostic fields retained from a procedure failure. */
export type ObservabilityErrorDetails = ReturnType<typeof getErrorDetails>;

/** Stable context, metadata, and route facts shared by signal contributors. */
export type ObservabilityBaseArgs<TMeta extends BaseMetadata, TContext extends object> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
};

/** Procedure signal facts available after a lifecycle outcome has completed. */
export type ObservabilityDurationArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = ObservabilityBaseArgs<TMeta, TContext> & {
  durationMs: number;
};

/** Procedure signal facts available after a failed lifecycle outcome. */
export type ObservabilityFailedArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = ObservabilityDurationArgs<TMeta, TContext> & {
  error: ObservabilityErrorDetails;
};

/** Service-owned additions to the native procedure observability middleware. */
export type ObservabilityMiddlewareInput<
  TMeta extends BaseMetadata,
  TContext extends object,
  TPolicyEvents extends Record<string, string | undefined> | undefined = undefined,
> = {
  spanAttributes?: (args: ObservabilityBaseArgs<TMeta, TContext>) => ObservabilityFields;
  logFields?: (args: {
    context: TContext;
    meta: TMeta;
    path: readonly string[];
    pathLabel: string;
    durationMs: number;
    spanTraceId?: string;
  }) => Record<string, unknown>;
  startEventAttributes?: (args: ObservabilityBaseArgs<TMeta, TContext>) => Attributes;
  successEventAttributes?: (args: ObservabilityDurationArgs<TMeta, TContext>) => Attributes;
  errorEventAttributes?: (args: ObservabilityFailedArgs<TMeta, TContext>) => Attributes;
  onStart?(
    args: {
      span: Span | undefined;
    } & ObservabilityBaseArgs<TMeta, TContext>
  ): void;
  onSuccess?(
    args: {
      span: Span | undefined;
    } & ObservabilityDurationArgs<TMeta, TContext>
  ): void;
  onError?(
    args: {
      span: Span | undefined;
      policyEvents: TPolicyEvents | undefined;
    } & ObservabilityFailedArgs<TMeta, TContext>
  ): void;
  policyEvents?: TPolicyEvents;
};
