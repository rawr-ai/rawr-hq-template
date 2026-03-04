/**
 * @fileoverview Local proto-SDK ORPC kit factory for this repo.
 *
 * @remarks
 * This directory is intentionally domain-agnostic so it can later be extracted
 * into a shared SDK package. Concrete domain values (deps shape, metadata
 * defaults, domain-wide middleware) belong in `../domain/*`.
 */
import { oc } from "@orpc/contract";
import { os } from "@orpc/server";

import type { BaseMetadata, InitialContext } from "./base";

export type { BaseMetadata, InitialContext } from "./base";

export type CreateOrpcKitOptions<TMeta extends BaseMetadata = BaseMetadata> = {
  /**
   * Default metadata applied to every contract/procedure in the package.
   *
   * @remarks
   * Important: this is intentionally typed as `BaseMetadata` (widened). We do
   * not want TypeScript to infer a literal metadata type (for example
   * `idempotent: true`) from the default value, because that would make later
   * per-procedure overrides like `meta({ idempotent: false })` illegal.
   *
   * If a package wants to extend metadata, it should pass an explicit `TMeta`
   * type parameter to `createOrpcKit<..., TMeta>(...)`.
   */
  baseMetadata: BaseMetadata;
};

/**
 * Create a domain-package kit instance.
 *
 * @remarks
 * The returned builders are the primitives used by:
 * - domain-wide middleware (via `os`)
 * - module contracts (via `oc`)
 *
 * Packages should implement their root contract and attach middleware in
 * `src/orpc.ts`, then derive module implementers from `impl.<module>` subtrees.
 */
export function createOrpcKit<TDeps, TMeta extends BaseMetadata = BaseMetadata>(
  options: CreateOrpcKitOptions<TMeta>,
) {
  const baseContractBuilder = oc.$meta<TMeta>(options.baseMetadata as TMeta);

  const baseMiddlewareBuilder = os
    .$context<InitialContext<TDeps>>()
    .$meta<TMeta>(options.baseMetadata as TMeta);

  return {
    oc: baseContractBuilder,
    os: baseMiddlewareBuilder,
  };
}
