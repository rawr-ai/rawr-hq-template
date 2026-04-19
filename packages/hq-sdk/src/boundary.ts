export type {
  ServicePackage,
  ServicePackageBoundary,
  InferConfig,
  InferDeps,
  InferInvocation,
  InferScope,
} from "./orpc/boundary/service-package";
export { defineServicePackage } from "./orpc/boundary/service-package";

// Deprecated compatibility shim for non-owned call sites that still import the
// retired domain-package surface.
export type {
  DomainBoundary,
  DomainPackage,
} from "./orpc/boundary/domain-package";
export { defineDomainPackage } from "./orpc/boundary/domain-package";
