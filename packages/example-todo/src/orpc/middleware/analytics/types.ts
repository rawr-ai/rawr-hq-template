import type { BaseMetadata } from "../../base";
import type { createNormalMiddlewareBuilder } from "../../factory/middleware";

export type AnalyticsPayloadArgs<
  TMeta extends BaseMetadata,
  TContext extends object,
> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
  outcome: "success" | "error";
};

export type AnalyticsPayloadContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
> = (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown> | undefined;

export type RequiredServiceAnalyticsMiddlewareInput<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown>;
};

export type ServiceAnalyticsMiddlewareInput<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown>;
};

export const requiredAnalyticsMiddlewareBrand = Symbol(
  "rawr.orpc.requiredAnalyticsMiddleware",
);

export type RequiredServiceAnalyticsMiddleware<
  TContext extends object = object,
  TMeta extends BaseMetadata = BaseMetadata,
> = ReturnType<
  typeof createNormalMiddlewareBuilder<TContext, TMeta>
>["middleware"] extends (callback: infer _T) => infer TMiddleware
  ? TMiddleware & {
    readonly [requiredAnalyticsMiddlewareBrand]: "analytics";
  }
  : never;
