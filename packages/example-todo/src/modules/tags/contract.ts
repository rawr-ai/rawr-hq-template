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
import { oc } from "@orpc/contract";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { TagSchema } from "./schemas";

export const tagsContract = oc.router({
  create: oc
    .errors({
      DUPLICATE_TAG: {
        status: 409,
        message: "Tag already exists",
        data: schema(
          Type.Object(
            {
              name: Type.Optional(Type.String({ minLength: 1 })),
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
            name: Type.String({ minLength: 1, maxLength: 50 }),
            color: Type.String({ pattern: "^#[0-9a-fA-F]{6}$" }),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(TagSchema)),
  list: oc.input(schema(Type.Object({}, { additionalProperties: false }))).output(schema(Type.Array(TagSchema))),
});

export type TagsContract = typeof tagsContract;
