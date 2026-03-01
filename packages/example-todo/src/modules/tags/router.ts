/**
 * @fileoverview Tag module router.
 *
 * @remarks
 * The boundary exposes only caller-actionable errors for this module.
 * Duplicate tag name is modeled as expected state and surfaced directly.
 *
 * @agents
 * Keep `.errors(...)` narrow and tied to caller branching needs.
 */
import { randomUUID } from "node:crypto";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../../boundary/base";
import { DUPLICATE_TAG } from "./errors";
import { createTagRepository } from "./repository";
import { type Tag, TagSchema } from "./schemas";

const withTags = withService.use(({ context, next }) =>
  next({
    context: {
      deps: context.deps,
      logger: context.logger,
      clock: context.clock,
      repo: createTagRepository(context.deps.sql),
    },
  }),
);

const create = withTags
  .errors({
    DUPLICATE_TAG,
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
  .output(schema(TagSchema))
  .handler(async ({ context, input, errors }) => {
    const normalizedName = input.name.trim();
    const normalizedColor = input.color.toLowerCase();

    if (await context.repo.existsByName(normalizedName)) {
      throw errors.DUPLICATE_TAG({
        message: `Tag '${normalizedName}' already exists`,
        data: { name: normalizedName },
      });
    }

    const tag: Tag = {
      id: randomUUID(),
      name: normalizedName,
      color: normalizedColor,
      createdAt: context.clock.now(),
    };

    context.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });
    return await context.repo.insert(tag);
  });

const list = withTags
  .input(schema(Type.Object({}, { additionalProperties: false })))
  .output(schema(Type.Array(TagSchema)))
  .handler(async ({ context }) => {
    return await context.repo.findAll();
  });

export const tagsRouter = base.router({
  create,
  list,
});
