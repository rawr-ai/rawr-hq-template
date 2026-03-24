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
export type CreateAuthoringClientOptions = DomainBoundary<typeof router>;

/**
 * Create a narrow in-process client for workflow authoring over the canonical
 * coordination workflow contract.
 */
export function createAuthoringClient(boundary: CreateAuthoringClientOptions) {
  return domain.createClient(boundary);
}

export type AuthoringClient = ReturnType<typeof createAuthoringClient>;
