/**
 * @fileoverview Assignment-module boundary contract.
 *
 * @remarks
 * Assignment is a composite module. This contract declares multi-entity
 * boundary behavior; module composition is in `module.ts` and implementation
 * is in the named assignment router leaves.
 *
 * @agents
 * Keep this contract focused on caller-visible shape. Cross-module access
 * patterns belong in the named assignment router leaves, not here.
 */
import { oc } from "@orpc/contract";
import type { ErrorMapItem } from "@orpc/server";
import { standard } from "@rawr/typebox-adapter";
import { Type } from "typebox";
import { AssignmentSchema } from "#example-todo-service/model/dto/assignment";
import { TodoIdentifierSchema } from "#example-todo-service/model/dto/identifier";
import { TagSchema } from "#example-todo-service/model/dto/tag";
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

const AssignmentLimitReachedData = standard(
  Type.Object(
    {
      taskId: Type.Optional(
        Type.String({
          minLength: 1,
          description: "Task id that hit the configured assignment limit.",
        })
      ),
      maxAssignmentsPerTask: Type.Optional(
        Type.Number({
          minimum: 1,
          description: "Configured per-task assignment ceiling.",
        })
      ),
    },
    {
      additionalProperties: false,
      description: "Context payload for ASSIGNMENT_LIMIT_REACHED boundary errors.",
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

const ASSIGNMENT_LIMIT_REACHED: ErrorMapItem<typeof AssignmentLimitReachedData> = {
  message: "Task reached the configured assignment limit",
  data: AssignmentLimitReachedData,
} as const;

/** Assignment contract group consumed by the module contract access face. */
export const assignments = {
  assign: oc
    .meta(
      todoProcedureMetadata({
        idempotent: false,
        analytics: {
          layer: "module",
          module: "assignments",
        },
      } satisfies TodoProcedureMetadata)
    )
    .input(
      standard(
        Type.Object(
          {
            taskId: TodoIdentifierSchema,
            tagId: TodoIdentifierSchema,
          },
          {
            additionalProperties: false,
            description: "Input payload for creating a task-tag assignment.",
          }
        )
      )
    )
    .output(standard(AssignmentSchema))
    .errors({
      ASSIGNMENT_LIMIT_REACHED,
      READ_ONLY_MODE,
      RESOURCE_NOT_FOUND,
      ALREADY_ASSIGNED: {
        message: "Task/tag assignment already exists",
        data: standard(
          Type.Object(
            {
              taskId: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Task id that is already associated with the tag.",
                })
              ),
              tagId: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Tag id that is already associated with the task.",
                })
              ),
            },
            {
              additionalProperties: false,
              description: "Context for ALREADY_ASSIGNED errors.",
            }
          )
        ),
      },
    }),
  listForTask: oc
    .meta(
      todoProcedureMetadata({
        idempotent: true,
        analytics: {
          layer: "module",
          module: "assignments",
        },
      } satisfies TodoProcedureMetadata)
    )
    .input(
      standard(
        Type.Object(
          {
            taskId: TodoIdentifierSchema,
          },
          {
            additionalProperties: false,
            description: "Input payload for listing tags assigned to a task.",
          }
        )
      )
    )
    .output(
      standard(
        Type.Object(
          {
            task: Type.Object(TaskSchema.properties, {
              additionalProperties: false,
              description: "Task entity for the requested task id.",
            }),
            tags: Type.Array(
              Type.Object(TagSchema.properties, {
                additionalProperties: false,
                description: "Tag entity assigned to the task.",
              }),
              {
                description: "All tags currently assigned to the task.",
              }
            ),
          },
          {
            additionalProperties: false,
            description: "Task plus all tags assigned to that task.",
          }
        )
      )
    )
    .errors({ RESOURCE_NOT_FOUND }),
};
