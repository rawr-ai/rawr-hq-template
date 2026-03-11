import type { BaseMetadata } from "../../base";
import { peekLocalAnalyticsContributors } from "./state";
import type { AnalyticsPayloadArgs } from "./types";

export function getProcedureMeta<TMeta extends BaseMetadata>(
  procedure: unknown,
  fallback: TMeta,
): TMeta {
  const anyProcedure = procedure as { ["~orpc"]?: { meta?: TMeta } };
  return anyProcedure?.["~orpc"]?.meta ?? fallback;
}

export function resolveLocalAnalyticsPayload<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  context: TContext,
  args: AnalyticsPayloadArgs<TMeta, TContext>,
) {
  const contributors = peekLocalAnalyticsContributors<TMeta, TContext>(context) ?? [];

  if (contributors.length === 0) {
    return {};
  }

  return Object.assign(
    {},
    ...contributors.map((contributor) => contributor(args) ?? {}),
  );
}
