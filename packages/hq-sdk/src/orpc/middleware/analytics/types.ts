import type { BaseMetadata } from "../../metadata";

/** Procedure facts available when the service enriches its single analytics event. */
export type AnalyticsPayloadArgs<TMeta extends BaseMetadata, TContext extends object> = {
  context: TContext;
  meta: TMeta;
  path: readonly string[];
  pathLabel: string;
  outcome: "success" | "error";
};

/** Service-owned additions to the one procedure analytics event. */
export type AnalyticsMiddlewareInput<
  TMeta extends BaseMetadata = BaseMetadata,
  TContext extends object = object,
> = {
  payload?: (args: AnalyticsPayloadArgs<TMeta, TContext>) => Record<string, unknown> | undefined;
};
