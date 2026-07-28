/**
 * @fileoverview Task-module boundary contract.
 *
 * @remarks
 * This file defines the caller-visible boundary for task procedures:
 * - procedure names,
 * - input/output schemas,
 * - caller-actionable ORPC errors.
 *
 * Module composition belongs in `module.ts`; handler implementation belongs in
 * `router/tasks.router.ts`.
 *
 * @agents
 * Extend task capability by updating this contract first, then implement handlers
 * in `router/tasks.router.ts`. Keep this file free of execution logic and dependencies.
 */
import { oc } from "@orpc/contract";
import type { ErrorMapItem } from "@orpc/server";
import { standard } from "@rawr/typebox-adapter";
import { Type } from "typebox";
import { TodoIdentifierSchema } from "#example-todo-service/model/dto/identifier";
import { TaskSchema } from "#example-todo-service/model/dto/task";
import {
  type TodoProcedureMetadata,
  todoProcedureMetadata,
} from "#example-todo-service/model/policy/procedure-metadata";

const ResourceNotFoundData = standard(
  Type.Object(
    {
      entity: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Entity name that was not found (for example Task or Tag).",
        })
      ),
      id: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Identifier associated with the missing entity.",
        })
      ),
    },
    {
      additionalProperties: false,
      description: "Context payload for RESOURCE_NOT_FOUND boundary errors.",
    }
  )
);

const ReadOnlyModeData = standard(
  Type.Object(
    {
      path: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Procedure path that was blocked while read-only mode was enabled.",
        })
      ),
    },
    {
      additionalProperties: false,
      description: "Context payload for READ_ONLY_MODE boundary errors.",
    }
  )
);

const RESOURCE_NOT_FOUND: ErrorMapItem<typeof ResourceNotFoundData> = {
  message: "Resource not found",
  data: ResourceNotFoundData,
} as const;

const READ_ONLY_MODE: ErrorMapItem<typeof ReadOnlyModeData> = {
  message: "Write operations are blocked while read-only mode is enabled",
  data: ReadOnlyModeData,
} as const;

export const contract = {
  create: oc
    .meta(
      todoProcedureMetadata({
        idempotent: false,
      } satisfies TodoProcedureMetadata)
    )
    .input(
      standard(
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
              })
            ),
          },
          {
            additionalProperties: false,
            description: "Input payload for creating a new task.",
          }
        )
      )
    )
    .output(standard(TaskSchema))
    .errors({
      READ_ONLY_MODE,
      INVALID_TASK_TITLE: {
        message: "Invalid task title",
        data: standard(
          Type.Object(
            {
              title: Type.Optional(
                Type.String({
                  description: "Raw title value that failed validation or normalization.",
                })
              ),
            },
            {
              additionalProperties: false,
              description: "Context describing why the task title was rejected.",
            }
          )
        ),
      },
    }),
  get: oc
    .meta(
      todoProcedureMetadata({
        idempotent: true,
      } satisfies TodoProcedureMetadata)
    )
    .input(
      standard(
        Type.Object(
          {
            id: TodoIdentifierSchema,
          },
          {
            additionalProperties: false,
            description: "Input payload for fetching a task by id.",
          }
        )
      )
    )
    .output(standard(TaskSchema))
    .errors({ RESOURCE_NOT_FOUND }),
};
