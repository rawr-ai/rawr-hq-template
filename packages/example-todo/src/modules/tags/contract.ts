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
import { DUPLICATE_TAG } from "./errors";
import { TagSchema } from "./schemas";

const createTagInputSchema = schema(
  Type.Object(
    {
      name: Type.String({ minLength: 1, maxLength: 50 }),
      color: Type.String({ pattern: "^#[0-9a-fA-F]{6}$" }),
    },
    { additionalProperties: false },
  ),
);

const listTagsInputSchema = schema(Type.Object({}, { additionalProperties: false }));

export const tagsContract = oc.router({
  create: oc.errors({ DUPLICATE_TAG } as const).input(createTagInputSchema).output(schema(TagSchema)),
  list: oc.input(listTagsInputSchema).output(schema(Type.Array(TagSchema))),
});

export type TagsContract = typeof tagsContract;
