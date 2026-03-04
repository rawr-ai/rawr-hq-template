/**
 * @fileoverview ORPC kit seam for this domain package.
 *
 * @remarks
 * Today this re-exports the local proto-SDK kit implementation in `./orpc/*`.
 * Later, this file becomes the single swap point to import the shared SDK kit
 * instead (without rewriting domain/module code).
 */
export { createOrpcKit, type BaseMetadata, type InitialContext } from "./orpc/factory";

