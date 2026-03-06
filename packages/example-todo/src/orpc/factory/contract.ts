import { oc } from "@orpc/contract";

import type { BaseMetadata } from "../base";

type CreateContractBuilderOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  baseMetadata: BaseMetadata;
};

/**
 * Create a metadata-aware contract builder.
 */
export function createContractBuilder<TMeta extends BaseMetadata = BaseMetadata>(
  options: CreateContractBuilderOptions<TMeta>,
) {
  return oc.$meta<TMeta>(options.baseMetadata as TMeta);
}
