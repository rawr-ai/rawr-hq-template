import {
  defineServicePackage,
  type InferConfig,
  type InferDeps,
  type InferScope,
  type ServicePackageBoundary,
} from "@rawr/hq-sdk/boundary";
import { router } from "./router";

const servicePackage = defineServicePackage(router);

export type Deps = InferDeps<typeof router>;
export type Scope = InferScope<typeof router>;
export type Config = InferConfig<typeof router>;
export type CreateAuthoringClientOptions = ServicePackageBoundary<typeof router>;

/**
 * Create a narrow in-process client bound directly to the canonical workflow
 * subtree.
 */
export function createAuthoringClient(boundary: CreateAuthoringClientOptions) {
  return servicePackage.createClient(boundary);
}

export type AuthoringClient = ReturnType<typeof createAuthoringClient>;
