import type { AnyContractRouter } from "@orpc/contract";
import { implement } from "@orpc/server";
import type { BaseDeps } from "./deps";

export interface DomainContext<TDeps extends BaseDeps = BaseDeps> {
  deps: TDeps;
}

export function createDomainModule<TContract extends AnyContractRouter, TDeps extends BaseDeps = BaseDeps>(
  contract: TContract,
) {
  return implement(contract).$context<DomainContext<TDeps>>();
}
