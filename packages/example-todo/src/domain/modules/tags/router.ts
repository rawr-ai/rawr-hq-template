/**
 * @fileoverview Tag module router implementation.
 *
 * @remarks
 * Module setup lives in `./setup.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `setup.ts` owns module setup.
 * This file owns handler behavior and router composition.
 */
import { randomUUID } from "node:crypto";
import { os } from "./setup";
import { type Tag } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `os.<procedure>.handler(...)`.
 */
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

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = os.router({
  create,
  list,
});
