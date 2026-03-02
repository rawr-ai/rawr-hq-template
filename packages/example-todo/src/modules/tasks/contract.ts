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
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { procedure } from "../../boundary/procedure-meta";
import { RESOURCE_NOT_FOUND } from "../../boundary/procedure-errors";
import { TaskSchema } from "./schemas";

export const tasksContract = {
  create: procedure({ idempotent: false })
    .input(
      schema(
        Type.Object(
          {
            title: Type.String({
              minLength: 1,
              maxLength: 500,
              description: "Human-readable task title.",
            }),
            description: Type.Optional(
              Type.String({
                maxLength: 2000,
                description: "Optional longer details for the task.",
              }),
            ),
          },
          {
            additionalProperties: false,
            description: "Input payload for creating a new task.",
          },
        ),
      ),
    )
    .output(
      schema(TaskSchema),
    )
    .errors({
      INVALID_TASK_TITLE: {
        status: 400,
        message: "Invalid task title",
        data: schema(
          Type.Object(
            {
              title: Type.Optional(
                Type.String({
                  description: "Raw title value that failed validation or normalization.",
                }),
              ),
            },
            {
              additionalProperties: false,
              description: "Context describing why the task title was rejected.",
            },
          ),
        ),
      },
    }),
  get: procedure({ idempotent: true })
    .input(
      schema(
        Type.Object(
          {
            id: Type.String({
              format: "uuid",
              description: "Unique task identifier.",
            }),
          },
          {
            additionalProperties: false,
            description: "Input payload for fetching a task by id.",
          },
        ),
      ),
    )
    .output(
      schema(TaskSchema),
    )
    .errors({ RESOURCE_NOT_FOUND }),
};

export type TasksContract = typeof tasksContract;
