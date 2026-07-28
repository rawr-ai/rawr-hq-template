/**
 * @fileoverview Root domain contract composition for the todo package.
 *
 * @remarks
 * This file only composes module contracts into the root contract object.
 * `src/service/impl.ts` implements that root contract once; modules then derive
 * their implementer subtrees from `service.<module>`.
 */
import { oc } from "@orpc/contract";
import {
  type TodoProcedureMetadata,
  todoProcedureMetadata,
} from "#example-todo-service/model/policy/procedure-metadata";
import { contract as assignments } from "./modules/assignments/contract";
import { contract as tags } from "./modules/tags/contract";
import { contract as tasks } from "./modules/tasks/contract";

/** Composes the three module contracts into the service's caller boundary. */
export const metadataDefaults: TodoProcedureMetadata = {
  idempotent: true,
  domain: "todo",
  audience: "internal",
  audit: "basic",
  entity: "service",
};

export const contract = oc.meta(todoProcedureMetadata(metadataDefaults)).router({
  tasks,
  tags,
  assignments,
});

/** Caller contract type re-exported by the public client face. */
export type Contract = typeof contract;
