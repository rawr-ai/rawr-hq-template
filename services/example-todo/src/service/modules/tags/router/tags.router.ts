/**
 * @fileoverview Tag module router implementation.
 *
 * @remarks
 * Module composition lives in `./module.ts`.
 * This file owns the tag operation group and exports its completed plain
 * router object for module composition.
 *
 * @agents
 * `contract.ts` owns boundary shape (input/output/errors/meta).
 * `module.ts` owns module composition.
 * This file owns handler behavior. The parent `router.ts` owns module
 * composition.
 *
 * The `create` procedure below is the canonical example of procedure-local
 * observability/analytics attachment. Do not remove that example unless the
 * package adopts a different deliberate seam for demonstrating procedure-local
 * middleware.
 */

import type { Tag } from "#example-todo-service/model/dto/tag";
import { admitGeneratedIdentifier } from "#example-todo-service/model/policy/identifier";
import { analyzeTagCreation, observeTagCreation } from "../middleware/telemetry.middleware";
import { module } from "../module";

/**
 * SECTION: Module Procedure Implementations (Always Present)
 *
 * Implement concrete procedure handlers below using `module.<procedure>.handler(...)`.
 */
/**
 * Canonical procedure-local observability example.
 *
 * @remarks
 * The module already has module-wide observability and analytics via
 * `module.ts`. This procedure adds one extra, procedure-specific layer on top
 * to show how a handler can opt into more local instrumentation without
 * changing the module default.
 *
 * @agents
 * Keep this example as the one obvious demonstration of procedure-local
 * additive middleware in the package.
 */
const create = module.create
  .use(observeTagCreation)
  .use(analyzeTagCreation)
  .handler(async ({ context, input, errors }) => {
    const normalizedName = input.name.trim();
    const normalizedColor = input.color.toLowerCase();

    if (await context.tagsStore.existsByName(normalizedName)) {
      throw errors.DUPLICATE_TAG({
        message: `Tag '${normalizedName}' already exists`,
        data: { name: normalizedName },
      });
    }

    const tag: Tag = {
      id: admitGeneratedIdentifier(context.identifierGenerator.generate()),
      workspaceId: context.workspaceId,
      name: normalizedName,
      color: normalizedColor,
      createdAt: context.clock.now(),
    };

    context.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });
    return await context.tagsStore.insert(tag);
  });

const list = module.list.handler(async ({ context }) => {
  return await context.tagsStore.findAll();
});

/**
 * @purpose Author tag creation and catalog reads at the Tags boundary.
 * @capability Consume the curated tag store, identity, clock, logging, scope, and trace values.
 * @behavior Preserve unique normalized tags and return the current workspace catalog.
 * @relation Keep procedure-local telemetry attached to tag behavior while the parent router composes the group.
 */
export const router = { create, list };
