import { os } from "@orpc/server";

import type { BaseMetadata } from "../base";

type CreateMiddlewareBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  baseMetadata: BaseMetadata;
};

/**
 * Create an oRPC builder for authoring middleware against the mirrored runtime
 * shape: a top-level `deps` bag plus any extra top-level input.
 */
export function createMiddlewareBuilder<
  TRequiredContext extends { deps: object } = { deps: {} },
  TMeta extends BaseMetadata = BaseMetadata,
>(
  options: CreateMiddlewareBuilderOptions<TMeta>,
) {
  return os
    .$context<TRequiredContext>()
    .$meta<TMeta>(options.baseMetadata as TMeta);
}
