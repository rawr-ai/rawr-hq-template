import { os } from "@orpc/server";

import type { BaseMetadata } from "../base";

type CreateMiddlewareBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  baseMetadata: BaseMetadata;
};

/**
 * Create an oRPC builder for authoring middleware against the mirrored runtime
 * shape: semantic construction/invocation lanes plus any downstream execution
 * context additions.
 */
export function createMiddlewareBuilder<
  TRequiredContext extends object = {},
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return os
    .$context<TRequiredContext>()
    .$meta<TMeta>(options.baseMetadata as TMeta);
}
