/**
 * @fileoverview ORPC kit seam for this domain package.
 *
 * @remarks
 * Today this re-exports the local proto-SDK kit implementation in `./orpc/*`.
 * Later, this file becomes the single swap point to import the shared SDK kit
 * instead (without rewriting domain/module code).
 */
export type {
  BaseDeps,
  Logger,
  BaseMetadata,
  BaseContext,
  InitialContext,
} from "./orpc/base";
export {
  createContractBuilder,
  createImplementer,
  createMiddlewareBuilder,
  createOrpcKit,
  type CreateContractBuilderOptions,
  type CreateImplementerOptions,
  type CreateMiddlewareBuilderOptions,
  type CreateOrpcKitOptions,
} from "./orpc/factory";
export type { DomainPackage, InferDeps } from "./orpc/domain-package";
export { defineDomainPackage } from "./orpc/domain-package";
export { createDomainModule, type DomainContext } from "./orpc/module";
export { schema, typeBoxStandardSchema } from "./orpc/schema";
