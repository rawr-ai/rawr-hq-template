/**
 * @fileoverview Shared module implementer scaffold for this package.
 *
 * @remarks
 * Module routers should start from `createModule(contract)` so package-level
 * ORPC setup is consistent and not re-authored in every module.
 *
 * Shared middleware definitions live in `orpc-runtime/middleware/*` and are
 * applied from module routers (`.use(withTelemetry)`, `.use(withReadOnlyMode)`),
 * where ORPC can preserve concrete contract typing.
 *
 * @agents
 * Keep this helper focused on shared ORPC setup only. Module-specific repo/service
 * wiring belongs in each module router's local `.use(...)` block.
 */
import type { ContractRouter } from "@orpc/contract";
import { implement } from "@orpc/server";
import type { BaseContext } from "./context";

export function createModule<TContract extends ContractRouter<any>>(contract: TContract) {
  return implement(contract).$context<BaseContext>();
}
