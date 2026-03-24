/**
 * @fileoverview In-process client factory for the state package boundary.
 *
 * @remarks
 * This file owns canonical client creation (`createClient`) and package-boundary
 * wiring only. Keep transport/runtime projection out of this surface.
 */
import {
  defineDomainPackage,
  type DomainBoundary,
  type InferConfig,
  type InferDeps,
  type InferScope,
} from "@rawr/hq-sdk/boundary";
import { router } from "./router";

const domain = defineDomainPackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateClientOptions = DomainBoundary<typeof router>;

/**
 * Create an in-process client using the package's canonical construction-time
 * boundary bags.
 */
export function createClient(boundary: CreateClientOptions) {
  return domain.createClient(boundary);
}

export type Client = ReturnType<typeof createClient>;
