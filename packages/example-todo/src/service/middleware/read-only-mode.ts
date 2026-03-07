/**
 * @fileoverview Read-only mode guard.
 *
 * @remarks
 * Zero-config service guard. It blocks mutating procedures when
 * `context.config.readOnly` is enabled. Mutability is derived from
 * procedure metadata (`idempotent: false`).
 *
 * @agents
 * Keep read-only policy logic here. Do not duplicate write-block checks in module
 * handlers when this middleware is active.
 */
import { ORPCError } from "@orpc/server";
import { createServiceMiddleware } from "../base";
import { READ_ONLY_MODE } from "../shared/errors";

/**
 * Zero-config service guard.
 *
 * @remarks
 * Export this as a ready-to-use middleware value. It consumes stable package
 * configuration (`config.readOnly`) and does not add any execution context.
 */
export const readOnlyMode = createServiceMiddleware<{
  config: {
    readOnly: boolean;
  };
}>().middleware(async ({ context, procedure, path, next }) => {
  const isMutatingProcedure = procedure["~orpc"].meta.idempotent === false;

  if (!context.config.readOnly || !isMutatingProcedure) {
    return await next();
  }

  throw new ORPCError("READ_ONLY_MODE", {
    defined: true,
    status: READ_ONLY_MODE.status,
    message: "Write operation blocked: service is in read-only mode",
    data: { path: path.join(".") },
  });
});
