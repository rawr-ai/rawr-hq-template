/**
 * @fileoverview Tag module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns concrete handler implementations and exports plain-object `router`.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `module.ts` owns module composition.
 * This file owns handler behavior and router composition.
 */
import { randomUUID } from "node:crypto";
import { module } from "./module";
import { type Tag } from "./schemas";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `module.<procedure>.handler(...)`.
 */
const create = module.create.handler(async ({ context, input, errors }) => {
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
    workspaceId: context.workspaceId,
    name: normalizedName,
    color: normalizedColor,
    createdAt: context.clock.now(),
  };

  context.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });
  return await context.repo.insert(tag);
});

const list = module.list.handler(async ({ context }) => {
  return await context.repo.findAll();
});

/** Contract-enforced module router (fails typecheck if contract and router drift). */
export const router = module.router({
  create,
  list,
});
