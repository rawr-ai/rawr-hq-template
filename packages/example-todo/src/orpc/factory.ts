/**
 * @fileoverview Local proto-SDK ORPC kit factory for this repo.
 *
 * @remarks
 * This directory is intentionally domain-agnostic so it can later be extracted
 * into a shared SDK package. Concrete domain values (deps shape, metadata
 * defaults, domain-wide middleware) belong in `../domain/*`.
 */
import { oc, type ContractRouter } from "@orpc/contract";
import { implement, os } from "@orpc/server";

export type BaseMetadata = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
};

export type InitialContext<TDeps> = {
  deps: TDeps;
};

export type CreateOrpcKitOptions = {
  baseMetadata: BaseMetadata;
};

/**
 * Create a domain-package kit instance.
 *
 * @remarks
 * The returned builders are the primitives used by:
 * - domain-wide middleware (via `os`)
 * - module contracts (via `oc`)
 * - module routers (via `implementModuleRouter`)
 */
export function createOrpcKit<TDeps>(options: CreateOrpcKitOptions) {
  const contractBuilder = oc.$meta<BaseMetadata>(options.baseMetadata);
  const middlewareBuilder = os.$context<InitialContext<TDeps>>().$meta<BaseMetadata>(options.baseMetadata);

  function implementModuleRouter<TContract extends ContractRouter<BaseMetadata>>(contract: TContract) {
    return implement(contract).$context<InitialContext<TDeps>>();
  }

  return {
    oc: contractBuilder,
    os: middlewareBuilder,
    implementModuleRouter,
  };
}
