/**
 * @fileoverview Tag module router.
 *
 * @remarks
 * This module shows hybrid error reuse:
 * - shared service errors for generic failures,
 * - module-specific errors for tag-only failures.
 *
 * Extension guidance:
 * - keep repository calls in procedures,
 * - keep per-procedure `.errors(...)` explicit and narrow.
 *
 * @agents
 * If you see repeated error mapping code across procedures, extract a small
 * helper only when it does not hide which ORPC errors each procedure declares.
 */
import { randomUUID } from "node:crypto";
import { schema } from "@rawr/orpc-standards";
import { Type } from "typebox";
import { base, withService } from "../../boundary/base";
import { todoServiceErrorMap } from "../../boundary/error-catalog";
import { unwrapDatabaseResult } from "../../boundary/unwrap";
import { tagErrorMap } from "./errors";
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

/**
 * Procedure error declarations:
 * `create` adds duplicate conflict, while `list` needs only database errors.
 */
const createTagErrorMap = {
  DATABASE_ERROR: todoServiceErrorMap.DATABASE_ERROR,
  DUPLICATE_TAG: tagErrorMap.DUPLICATE_TAG,
} as const;

const listTagErrorMap = {
  DATABASE_ERROR: todoServiceErrorMap.DATABASE_ERROR,
} as const;

const create = withTags
  .errors(createTagErrorMap)
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
    const tag: Tag = {
      id: randomUUID(),
      name: input.name.trim(),
      color: input.color.toLowerCase(),
      createdAt: context.clock.now(),
    };

    context.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });

    const result = await context.repo.insert(tag);
    if (result.isOk()) {
      return result.value;
    }

    if (result.error._tag === "DuplicateTagError") {
      throw errors.DUPLICATE_TAG({
        message: result.error.message,
        data: { name: result.error.name },
      });
    }

    throw errors.DATABASE_ERROR({
      message: "Unable to create tag",
      data: { operation: "tags.insert" },
    });
  });

const list = withTags
  .errors(listTagErrorMap)
  .input(
    schema(
      Type.Object({}, { additionalProperties: false }),
    ),
  )
  .output(schema(Type.Array(TagSchema)))
  .handler(({ context, errors }) =>
    unwrapDatabaseResult(context.repo.findAll(), {
      onDatabaseError: () => {
        throw errors.DATABASE_ERROR({
          message: "Unable to list tags",
          data: { operation: "tags.findAll" },
        });
      },
    }),
  );

export const tagsRouter = base.router({
  create,
  list,
});
