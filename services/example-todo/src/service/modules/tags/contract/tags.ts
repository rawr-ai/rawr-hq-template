/**
 * @fileoverview Tag-module boundary contract.
 *
 * @remarks
 * Declares the stable boundary shape for tag procedures.
 * Keep this file declarative: no persistence logic or orchestration.
 *
 * @agents
 * Add/modify procedures here first. Module composition lives in `module.ts`, and
 * handler behavior lives in named router leaves.
 */

import { standard } from "@habitat-ai/typebox-adapter";
import { oc } from "@orpc/contract";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";
import { TagSchema } from "#example-todo-service/model/dto/tag";
import {
  type TodoProcedureMetadata,
  todoProcedureMetadata,
} from "#example-todo-service/model/policy/procedure-metadata";

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

const READ_ONLY_MODE: ErrorMapItem<typeof ReadOnlyModeData> = {
  message: "Write operations are blocked while read-only mode is enabled",
  data: ReadOnlyModeData,
} as const;

/** Tag contract group consumed by the module contract access face. */
export const tags = {
  create: oc
    .meta(
      todoProcedureMetadata({
        idempotent: false,
        analytics: {
          layer: "procedure",
          module: "tags",
          operation: "tags.create",
        },
      } satisfies TodoProcedureMetadata)
    )
    .input(
      standard(
        Type.Object(
          {
            name: Type.String({
              minLength: 1,
              maxLength: 50,
              description: "Unique tag label shown to users.",
            }),
            color: Type.String({
              pattern: "^#[0-9a-fA-F]{6}$",
              description: "Hex color used to render the tag.",
            }),
          },
          {
            additionalProperties: false,
            description: "Input payload for creating a new tag.",
          }
        )
      )
    )
    .output(standard(TagSchema))
    .errors({
      READ_ONLY_MODE,
      DUPLICATE_TAG: {
        message: "Tag already exists",
        data: standard(
          Type.Object(
            {
              name: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Tag name that conflicts with an existing tag.",
                })
              ),
            },
            {
              additionalProperties: false,
              description: "Context for DUPLICATE_TAG errors.",
            }
          )
        ),
      },
    }),
  list: oc
    .meta(
      todoProcedureMetadata({
        idempotent: true,
        analytics: {
          layer: "module",
          module: "tags",
        },
      } satisfies TodoProcedureMetadata)
    )
    .input(
      standard(
        Type.Object(
          {},
          {
            additionalProperties: false,
            description: "No-input payload for listing all tags.",
          }
        )
      )
    )
    .output(
      standard(
        Type.Array(TagSchema, {
          description: "All tags currently available in the todo domain.",
        })
      )
    ),
};
