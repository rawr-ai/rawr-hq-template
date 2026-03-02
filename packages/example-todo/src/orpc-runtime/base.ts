/**
 * @fileoverview Single entrypoint for ORPC runtime setup (context + metadata).
 *
 * @remarks
 * Keep this file limited to shared runtime setup primitives. Middleware remains
 * standalone in `./middleware/*` and composes from `runtimeBase` externally.
 */
import { oc, type ContractRouter } from "@orpc/contract";
import { implement, os } from "@orpc/server";

import type { Deps } from "./deps";

export type BaseContext = {
  deps: Deps;
};

export type ProcedureMeta = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
};

export const INITIAL_META = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
} satisfies ProcedureMeta;

export const contractBase = oc.$meta<ProcedureMeta>(INITIAL_META);

export const runtimeBase = os.$context<BaseContext>().$meta<ProcedureMeta>(INITIAL_META);

export function createModule<TContract extends ContractRouter<ProcedureMeta>>(contract: TContract) {
  return implement(contract).$context<BaseContext>();
}

