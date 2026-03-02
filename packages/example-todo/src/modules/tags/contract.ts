/**
 * @fileoverview Tag-module boundary contract.
 *
 * @remarks
 * Declares the stable boundary shape for tag procedures.
 * Keep this file declarative: no persistence logic or orchestration.
 *
 * @agents
 * Add/modify procedures here first. Then implement behavior in `router.ts`.
 */
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { procedure } from "../../orpc-runtime/meta";
import { TagSchema } from "./schemas";

export const contract = {
  create: procedure({ idempotent: false })
    .input(
      schema(
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
          },
        ),
      ),
    )
    .output(schema(TagSchema))
    .errors({
      DUPLICATE_TAG: {
        status: 409,
        message: "Tag already exists",
        data: schema(
          Type.Object(
            {
              name: Type.Optional(
                Type.String({
                  minLength: 1,
                  description: "Tag name that conflicts with an existing tag.",
                }),
              ),
            },
            {
              additionalProperties: false,
              description: "Context for DUPLICATE_TAG errors.",
            },
          ),
        ),
      },
    }),
  list: procedure({ idempotent: true })
    .input(
      schema(
        Type.Object(
          {},
          {
            additionalProperties: false,
            description: "No-input payload for listing all tags.",
          },
        ),
      ),
    )
    .output(
      schema(
        Type.Array(TagSchema, {
          description: "All tags currently available in the todo domain.",
        }),
      ),
    ),
};
