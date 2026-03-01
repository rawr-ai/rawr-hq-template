/**
 * @fileoverview Assignment-module boundary contract.
 *
 * @remarks
 * Assignment is a composite module. This contract declares multi-entity
 * boundary behavior while implementation in `router.ts` composes repositories.
 *
 * @agents
 * Keep this contract focused on caller-visible shape. Cross-module access
 * patterns belong in `router.ts`, not here.
 */
import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { RESOURCE_NOT_FOUND } from "../../boundary/procedure-errors";
import { TagSchema } from "../tags/schemas";
import { TaskSchema } from "../tasks/schemas";
import { AssignmentSchema } from "./schemas";

export const assignmentsContract = oc.router({
  assign: oc
    .errors({
      RESOURCE_NOT_FOUND,
      ALREADY_ASSIGNED: {
        status: 409,
        message: "Task/tag assignment already exists",
        data: schema(
          Type.Object(
            {
              taskId: Type.Optional(Type.String({ minLength: 1 })),
              tagId: Type.Optional(Type.String({ minLength: 1 })),
            },
            { additionalProperties: false },
          ),
        ),
      },
    } as const)
    .input(
      schema(
        Type.Object(
          {
            taskId: Type.String({ format: "uuid" }),
            tagId: Type.String({ format: "uuid" }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(AssignmentSchema)),
  listForTask: oc
    .errors({ RESOURCE_NOT_FOUND } as const)
    .input(
      schema(
        Type.Object(
          {
            taskId: Type.String({ format: "uuid" }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(
      schema(
        Type.Object(
          {
            task: TaskSchema,
            tags: Type.Array(TagSchema),
          },
          { additionalProperties: false },
        ),
      ),
    ),
});

export type AssignmentsContract = typeof assignmentsContract;
