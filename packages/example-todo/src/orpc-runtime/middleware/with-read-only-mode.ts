/**
 * @fileoverview Package-global read-only mode guard.
 *
 * @remarks
 * This middleware blocks mutating procedures when `context.deps.runtime.readOnly`
 * is enabled. Mutability is derived from procedure metadata (`idempotent: false`).
 *
 * @agents
 * Keep read-only policy logic here. Do not duplicate write-block checks in module
 * handlers when this middleware is active.
 */
import { ORPCError } from "@orpc/server";
import { READ_ONLY_MODE } from "../errors";
import type { ProcedureMeta } from "../meta";
import { base } from "./base";

function isMutatingProcedure(meta: unknown): boolean {
  if (typeof meta !== "object" || meta === null) {
    return false;
  }

  return (meta as Partial<ProcedureMeta>).idempotent === false;
}

export const withReadOnlyMode = base.middleware(async ({ context, procedure, path, next }) => {
  if (!context.deps.runtime.readOnly || !isMutatingProcedure(procedure["~orpc"].meta)) {
    return await next();
  }

  throw new ORPCError("READ_ONLY_MODE", {
    defined: true,
    status: READ_ONLY_MODE.status,
    message: "Write operation blocked: service is in read-only mode",
    data: { path: path.join(".") },
  });
});
