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
import { ORPCError, os } from "@orpc/server";
import { READ_ONLY_MODE } from "../errors";
import type { BaseContext } from "../context";

type ProcedureMeta = {
  idempotent?: unknown;
};

function isMutating(meta: unknown): boolean {
  if (typeof meta !== "object" || meta === null) {
    return false;
  }

  const typed = meta as ProcedureMeta;
  return typed.idempotent === false;
}

const base = os.$context<BaseContext>();

export const withReadOnlyMode = base.middleware(async ({ context, procedure, path, next }) => {
  if (!context.deps.runtime.readOnly || !isMutating(procedure["~orpc"].meta)) {
    return await next();
  }

  throw new ORPCError("READ_ONLY_MODE", {
    defined: true,
    status: READ_ONLY_MODE.status,
    message: "Write operation blocked: service is in read-only mode",
    data: { path: path.join(".") },
  });
});
