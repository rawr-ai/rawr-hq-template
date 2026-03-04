import type { AnyContractRouter } from "@orpc/contract";
import { implement } from "@orpc/server";
import type { BaseDeps } from "./base";

export interface DomainContext<TDeps extends BaseDeps = BaseDeps> {
  deps: TDeps;
}

/**
 * Convenience helper for contract-first modules that want a canonical context.
 *
 * @remarks
 * In the current model, packages implement the root contract once in `src/orpc.ts`,
 * then modules derive their implementers from `orpc.<module>` subtrees.
 *
 * Keeping this helper local still makes it easier to upstream to a shared SDK later.
 */
export function createDomainModule<TContract extends AnyContractRouter, TDeps extends BaseDeps = BaseDeps>(
  contract: TContract,
) {
  return implement(contract).$context<DomainContext<TDeps>>();
}
