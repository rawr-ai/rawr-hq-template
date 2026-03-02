/**
 * @fileoverview Shared module implementer scaffold for this package.
 *
 * @remarks
 * Module routers should start from `createModule(contract)` so package-level
 * ORPC setup is consistent and not re-authored in every module.
 *
 * @agents
 * Keep this helper focused on shared ORPC setup only. Module-specific repo/service
 * wiring belongs in each module router's local `.use(...)` block.
 */
import type { AnyContractRouter } from "@orpc/contract";
import { implement } from "@orpc/server";
import type { BaseContext } from "./context";

export function createModule<TContract extends AnyContractRouter>(contract: TContract) {
  return implement(contract).$context<BaseContext>();
}
