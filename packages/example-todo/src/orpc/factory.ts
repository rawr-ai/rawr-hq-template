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

import type { BaseMetadata, InitialContext } from "./base";
import { withTelemetry } from "./middleware/with-telemetry";

export type { BaseMetadata, InitialContext } from "./base";

export type CreateOrpcKitOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  baseMetadata: TMeta;
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
export function createOrpcKit<TDeps, TMeta extends BaseMetadata = BaseMetadata>(
  options: CreateOrpcKitOptions<TMeta>,
) {
  const contractBuilder = oc.$meta<TMeta>(options.baseMetadata);

  const middlewareBaseBuilder = os
    .$context<InitialContext<TDeps>>()
    .$meta<TMeta>(options.baseMetadata);

  const defaultDomain = options.baseMetadata.domain ?? "unknown";
  const shippingBuilder = middlewareBaseBuilder.use(withTelemetry(middlewareBaseBuilder, { defaultDomain }));

  function implementModuleRouter<TContract extends ContractRouter<TMeta>>(contract: TContract) {
    return implement(contract).$context<InitialContext<TDeps>>();
  }

  return {
    oc: contractBuilder,
    os: middlewareBaseBuilder,
    ship: shippingBuilder,
    implementModuleRouter,
  };
}
