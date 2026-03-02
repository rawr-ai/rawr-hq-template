/**
 * @fileoverview Package-level module implementer scaffold.
 *
 * @remarks
 * This is the global ORPC module base for this package:
 * `implement(contract).$context<BaseContext>()`.
 *
 * Keep this helper thin and structural. Add package-wide middleware here only
 * when it truly applies to all modules (for example tracing/auth/request-scope).
 *
 * @agents
 * Module routers should start from `createModule(contract)`, then add
 * module-local `.use(...)` wiring for repositories/services.
 */
import { implement } from "@orpc/server";
import type { AnyContractRouter } from "@orpc/contract";
import type { BaseContext } from "./context";

export function createModule<T extends AnyContractRouter>(contract: T) {
  return implement(contract).$context<BaseContext>();
}
