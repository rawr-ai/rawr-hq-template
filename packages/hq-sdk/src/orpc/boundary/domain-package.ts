/**
 * @fileoverview Deprecated compatibility bridge for the retired domain-package
 * boundary helper names.
 */
export type {
  ServicePackage as DomainPackage,
  ServicePackageBoundary as DomainBoundary,
  InferConfig,
  InferDeps,
  InferInvocation,
  InferScope,
} from "./service-package";
export { defineServicePackage as defineDomainPackage } from "./service-package";
