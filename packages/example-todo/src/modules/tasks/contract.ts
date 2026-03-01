/**
 * @fileoverview Task-module boundary contract.
 *
 * @remarks
 * This file defines the caller-visible boundary for task procedures:
 * - procedure names,
 * - input/output schemas,
 * - caller-actionable ORPC errors.
 *
 * Implementation belongs in `router.ts` via `implement(tasksContract)`.
 *
 * @agents
 * Extend task capability by updating this contract first, then implement handlers
 * in `router.ts`. Keep this file free of execution logic and dependencies.
 */
import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { RESOURCE_NOT_FOUND } from "../../boundary/procedure-errors";
import { INVALID_TASK_TITLE } from "./errors";
import { TaskSchema } from "./schemas";

const createTaskInputSchema = schema(
  Type.Object(
    {
      title: Type.String({ minLength: 1, maxLength: 500 }),
      description: Type.Optional(Type.String({ maxLength: 2000 })),
    },
    { additionalProperties: false },
  ),
);

const getTaskInputSchema = schema(
  Type.Object(
    {
      id: Type.String({ format: "uuid" }),
    },
    { additionalProperties: false },
  ),
);

export const tasksContract = oc.router({
  create: oc.errors({ INVALID_TASK_TITLE } as const).input(createTaskInputSchema).output(schema(TaskSchema)),
  get: oc.errors({ RESOURCE_NOT_FOUND } as const).input(getTaskInputSchema).output(schema(TaskSchema)),
});

export type TasksContract = typeof tasksContract;
