import type { MiddlewareResult } from "@orpc/server";

import type { BaseMetadata } from "../../baseline/types";
import type { Logger } from "../../ports/logger";
import type { Attributes, Span } from "../../host-adapters/telemetry/opentelemetry";
import type { createNormalMiddlewareBuilder } from "../../factory/middleware";
import type { getErrorDetails } from "./errors";

export type ObservabilityScalar = string | number | boolean;
export type ObservabilityFields = Record<string, ObservabilityScalar | undefined>;

export type ObservabilityErrorDetails = ReturnType<typeof getErrorDetails>;

export type ObservabilityBaseArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
};

export type ObservabilityDurationArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = ObservabilityBaseArgs<TMeta, TContext> & {
  durationMs: number;
};

export type ObservabilityFailedArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = ObservabilityDurationArgs<TMeta, TContext> & {
  error: ObservabilityErrorDetails;
};

export type RequiredServiceObservabilityMiddlewareInput<
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

export type ServiceObservabilityMiddlewareInput<
  TMeta extends BaseMetadata,
  TContext extends object,
> = {
  spanAttributes?: (args: ObservabilityBaseArgs<TMeta, TContext>) => ObservabilityFields;
  onStart?(args: {
    span: Span | undefined;
  } & ObservabilityBaseArgs<TMeta, TContext>): void;
  onSuccess?(args: {
    span: Span | undefined;
  } & ObservabilityDurationArgs<TMeta, TContext>): void;
  onError?(args: {
    span: Span | undefined;
  } & ObservabilityFailedArgs<TMeta, TContext>): void;
};

export type ObservabilityHandlerArgs<
  TMeta extends BaseMetadata,
  TContext extends {
    deps: {
      logger: Logger;
    };
  },
> = {
  context: TContext;
  path: readonly string[];
  procedure: unknown;
  next: () => MiddlewareResult<Record<never, never>, unknown>;
};

export const requiredObservabilityMiddlewareBrand = Symbol(
  "rawr.orpc.requiredObservabilityMiddleware",
);

export type RequiredServiceObservabilityMiddleware<
  TContext extends object = object,
  TMeta extends BaseMetadata = BaseMetadata,
> = ReturnType<
  typeof createNormalMiddlewareBuilder<TContext, TMeta>
>["middleware"] extends (callback: infer _T) => infer TMiddleware
  ? TMiddleware & {
    readonly [requiredObservabilityMiddlewareBrand]: "observability";
  }
  : never;
