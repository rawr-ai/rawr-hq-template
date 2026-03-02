/**
 * @fileoverview Shared ORPC context types for this package.
 *
 * @remarks
 * Keep runtime type contracts separate from middleware wiring so module routers
 * can depend on stable context interfaces without importing setup logic.
 *
 * @agents
 * Add fields to `BaseContext` only when every procedure should receive them at
 * call entry.
 */
import type { Deps } from "./deps";

export interface BaseContext {
  deps: Deps;
}
