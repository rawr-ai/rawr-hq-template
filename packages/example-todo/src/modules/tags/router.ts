/**
 * @fileoverview Tag module router implementation.
 *
 * @remarks
 * This file follows the standard module-router structure used in this package:
 * 1) create module implementer (`os`) from the module contract,
 * 2) attach package base context and optional module middleware,
 * 3) implement handlers from `os.<procedure>.handler(...)`,
 * 4) export plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta). This file owns
 * execution setup + handler behavior only.
 */
import { randomUUID } from "node:crypto";
import { implement } from "@orpc/server";
import { type BaseContext } from "../../orpc-runtime/context";
import { contract } from "./contract";
import { createRepository } from "./repository";
import { type Tag } from "./schemas";

/**
 * @remarks
 * Module implementer setup (always present).
 *
 * Use this block to bind package context and inject module-scoped dependencies
 * (for example repository adapters). Keep business branching out of this block.
 */
const os = implement(contract)
  .$context<BaseContext>()
  .use(({ context, next }) =>
    next({
      context: {
        repo: createRepository(context.deps.sql),
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

/** Plain object router export by package convention (no `.router(...)` wrapper). */
export const router = {
  create,
  list,
};
