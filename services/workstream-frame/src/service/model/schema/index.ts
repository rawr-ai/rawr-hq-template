/**
 * @fileoverview Curated index for the schema model kind.
 *
 * @remarks
 * This index is the module-facing surface for schema matter. Modules import
 * from here rather than deep-linking individual schema files.
 */

export { AdvanceSchema, type AdvanceView } from "./advance";
export { BoundarySchema, type BoundarySpec } from "./boundary";
export { ItemSchema, type ItemView } from "./item";
export { StreamSchema, type StreamView } from "./stream";
