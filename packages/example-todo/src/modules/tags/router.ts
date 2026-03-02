/**
 * @fileoverview Tag module router implementation.
 *
 * @remarks
 * Implements `tagsContract` with module context wiring and handler logic.
 *
 * @agents
 * Keep this file implementation-only; contract shape belongs in `contract.ts`.
 */
import { randomUUID } from "node:crypto";
import { implement } from "@orpc/server";
import { type BaseContext } from "../../orpc-runtime/context";
import { createTagRepository } from "./repository";
import { type Tag } from "./schemas";
import { tagsContract } from "./contract";

const os = implement(tagsContract)
  .$context<BaseContext>()
  .use(({ context, next }) =>
    next({
      context: {
        repo: createTagRepository(context.deps.sql),
      },
    }),
  );

const create = os.create.handler(async ({ context, input, errors }) => {
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
    createdAt: context.deps.clock.now(),
  };

  context.deps.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });
  return await context.repo.insert(tag);
});

const list = os.list.handler(async ({ context }) => {
  return await context.repo.findAll();
});

export const router = {
  create,
  list,
};
