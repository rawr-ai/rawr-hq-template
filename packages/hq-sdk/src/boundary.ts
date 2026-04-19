/**
 * @agents-style canonical service-package boundary entrypoint
 *
 * Owns:
 * - stable in-process service-package helper exports for service clients
 *
 * Must not own:
 * - retired domain-package compatibility aliases
 * - runtime projection or transport-specific helpers
 */
export type {
  ServicePackage,
  ServicePackageBoundary,
  InferConfig,
  InferDeps,
  InferInvocation,
  InferScope,
} from "./orpc/boundary/service-package";
export { defineServicePackage } from "./orpc/boundary/service-package";
