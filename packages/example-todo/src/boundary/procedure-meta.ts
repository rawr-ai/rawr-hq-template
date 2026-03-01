/**
 * @fileoverview Shared procedure metadata defaults for the todo package.
 *
 * @remarks
 * This helper keeps contract metadata consistent without forcing authors to
 * repeat derivable package-level labels on every procedure.
 *
 * @agents
 * Use `todoProcedure({ idempotent })` as the procedure starting point in
 * module contracts, then chain `.input(...)`, `.output(...)`, `.errors(...)`.
 */
import { oc } from "@orpc/contract";

export const TODO_PROCEDURE_SHARED_META = {
  domain: "todo",
  audience: "internal",
} as const;

export type TodoProcedureMeta = typeof TODO_PROCEDURE_SHARED_META & {
  idempotent: boolean;
};

export function todoProcedure(meta: Pick<TodoProcedureMeta, "idempotent">) {
  return oc.meta({
    ...TODO_PROCEDURE_SHARED_META,
    ...meta,
  });
}
