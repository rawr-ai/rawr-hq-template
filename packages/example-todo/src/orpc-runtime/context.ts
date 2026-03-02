/**
 * @fileoverview Shared ORPC context types for this package.
 *
 * @remarks
 * Keep runtime type contracts separate from middleware wiring so module routers
 * can depend on stable context interfaces without importing setup logic.
 *
 * @agents
 * Add fields to `BaseContext` only when every procedure should receive them at
 * call entry. Add fields to `ServiceContext` when they are derived once by
 * package middleware from base dependencies.
 */
import type { Clock, Deps, Logger } from "./deps";

export interface BaseContext {
  deps: Deps;
}

export interface ServiceContext extends BaseContext {
  logger: Logger;
  clock: Clock;
}
