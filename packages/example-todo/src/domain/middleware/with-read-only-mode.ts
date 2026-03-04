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
import { READ_ONLY_MODE } from "../shared/errors";

export const withReadOnlyMode = async (optionsOrpc: any) => {
  const { context, procedure, path, next } = optionsOrpc as any;
  const isMutatingProcedure = procedure["~orpc"].meta.idempotent === false;

  if (!context.deps.runtime.readOnly || !isMutatingProcedure) {
    return await next();
  }

  throw new ORPCError("READ_ONLY_MODE", {
    defined: true,
    status: READ_ONLY_MODE.status,
    message: "Write operation blocked: service is in read-only mode",
    data: { path: path.join(".") },
  });
};
