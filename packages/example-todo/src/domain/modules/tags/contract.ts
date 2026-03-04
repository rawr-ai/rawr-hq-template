/**
 * @fileoverview Tag-module boundary contract.
 *
 * @remarks
 * Declares the stable boundary shape for tag procedures.
 * Keep this file declarative: no persistence logic or orchestration.
 *
 * @agents
 * Add/modify procedures here first. Module setup lives in `setup.ts`, and
 * handler behavior lives in `router.ts`.
 */
import { schema } from "../../../orpc-sdk";
import { Type } from "typebox";
import { oc } from "../../setup";
import { READ_ONLY_MODE } from "../../shared/errors";
import { TagSchema } from "./schemas";

export const contract = {
  create: oc.meta({ idempotent: false })
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
      READ_ONLY_MODE,
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
  list: oc.meta({ idempotent: true })
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
