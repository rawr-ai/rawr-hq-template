/**
 * @fileoverview In-process client factory for the coordination package boundary.
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

export function createClient(boundary: CreateClientOptions) {
  return domain.createClient(boundary);
}

export type Client = ReturnType<typeof createClient>;
