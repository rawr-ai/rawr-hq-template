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
 * The example packages primarily use `createOrpcKit(...).implementModuleRouter`,
 * but keeping this helper local makes it easier to upstream to a shared SDK later.
 */
export function createDomainModule<TContract extends AnyContractRouter, TDeps extends BaseDeps = BaseDeps>(
  contract: TContract,
) {
  return implement(contract).$context<DomainContext<TDeps>>();
}

