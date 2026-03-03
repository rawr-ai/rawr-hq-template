/**
 * @fileoverview Task-module boundary contract.
 *
 * @remarks
 * This file defines the caller-visible boundary for task procedures:
 * - procedure names,
 * - input/output schemas,
 * - caller-actionable ORPC errors.
 *
 * Module setup belongs in `base.ts`; handler implementation belongs in `router.ts`.
 *
 * @agents
 * Extend task capability by updating this contract first, then implement handlers
 * in `router.ts`. Keep this file free of execution logic and dependencies.
 */
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { contractBuilder as oc } from "../../orpc-runtime/base";
import { READ_ONLY_MODE, RESOURCE_NOT_FOUND } from "../../orpc-runtime/errors";
import { TaskSchema } from "./schemas";

export const contract = {
  create: oc.meta({ idempotent: false })
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
      READ_ONLY_MODE,
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
  get: oc.meta({ idempotent: true })
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
