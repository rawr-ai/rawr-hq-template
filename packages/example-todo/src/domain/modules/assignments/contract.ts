/**
 * @fileoverview Assignment-module boundary contract.
 *
 * @remarks
 * Assignment is a composite module. This contract declares multi-entity
 * boundary behavior; setup is in `setup.ts` and implementation in `router.ts`.
 *
 * @agents
 * Keep this contract focused on caller-visible shape. Cross-module access
 * patterns belong in `router.ts`, not here.
 */
import { schema } from "../../../orpc-sdk";
import { Type } from "typebox";
import { oc } from "../../setup";
import { READ_ONLY_MODE, RESOURCE_NOT_FOUND } from "../../shared/errors";
import { TagSchema } from "../tags/schemas";
import { TaskSchema } from "../tasks/schemas";
import { AssignmentSchema } from "./schemas";

export const contract = {
  assign: oc.meta({ idempotent: false })
    .input(
      schema(
        Type.Object(
          {
            taskId: Type.String({
              format: "uuid",
              description: "Task identifier to attach a tag to.",
            }),
            tagId: Type.String({
              format: "uuid",
              description: "Tag identifier being assigned to the task.",
            }),
          },
          {
            additionalProperties: false,
            description: "Input payload for creating a task-tag assignment.",
          },
        ),
      ),
    )
    .output(
      schema(AssignmentSchema),
    )
    .errors({
      READ_ONLY_MODE,
      RESOURCE_NOT_FOUND,
      ALREADY_ASSIGNED: {
        status: 409,
        message: "Task/tag assignment already exists",
        data: schema(
          Type.Object(
            {
              taskId: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Task id that is already associated with the tag.",
                }),
              ),
              tagId: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Tag id that is already associated with the task.",
                }),
              ),
            },
            {
              additionalProperties: false,
              description: "Context for ALREADY_ASSIGNED errors.",
            },
          ),
        ),
      },
    }),
  listForTask: oc.meta({ idempotent: true })
    .input(
      schema(
        Type.Object(
          {
            taskId: Type.String({
              format: "uuid",
              description: "Task identifier to fetch all assigned tags for.",
            }),
          },
          {
            additionalProperties: false,
            description: "Input payload for listing tags assigned to a task.",
          },
        ),
      ),
    )
    .output(
      schema(
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
              },
            ),
          },
          {
            additionalProperties: false,
            description: "Task plus all tags assigned to that task.",
          },
        ),
      ),
    )
    .errors({ RESOURCE_NOT_FOUND }),
};
