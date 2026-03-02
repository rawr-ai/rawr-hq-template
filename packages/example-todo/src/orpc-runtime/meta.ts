/**
 * @fileoverview Shared procedure metadata defaults for the todo package.
 *
 * @remarks
 * This helper keeps contract metadata consistent without forcing authors to
 * repeat derivable package-level labels on every procedure.
 *
 * @agents
 * Use `procedure({ idempotent })` as the procedure starting point in
 * module contracts, then chain `.input(...)`, `.output(...)`, `.errors(...)`.
 */
import { oc } from "@orpc/contract";

const SHARED_META = {
  domain: "todo",
  audience: "internal",
} as const;

export type ProcedureMeta = typeof SHARED_META & {
  idempotent: boolean;
};

export function procedure(meta: Pick<ProcedureMeta, "idempotent">) {
  return oc.meta({
    ...SHARED_META,
    ...meta,
  });
}

export function isMutatingProcedure(meta: unknown): boolean {
  if (typeof meta !== "object" || meta === null) {
    return false;
  }

  return (meta as Partial<ProcedureMeta>).idempotent === false;
}
