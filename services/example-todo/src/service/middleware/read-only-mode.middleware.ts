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
import { getProcedureMetadata } from "@rawr/hq-sdk";
import { base } from "../base";

/**
 * Zero-config service guard.
 *
 * @remarks
 * Export this as a ready-to-use middleware value. It consumes stable package
 * configuration (`config.readOnly`) and does not add any execution context.
 */
export const readOnlyMode = base.middleware(async ({ context, procedure, path, next }) => {
  const isMutatingProcedure = getProcedureMetadata(procedure)?.idempotent === false;

  if (!context.config.readOnly || !isMutatingProcedure) {
    return await next();
  }

  throw new ORPCError("READ_ONLY_MODE", {
    message: "Write operation blocked: service is in read-only mode",
    data: { path: path.join(".") },
  });
});
