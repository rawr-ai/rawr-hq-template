import type { TagType } from "../../../model/dto";
import { admitGeneratedIdentifier } from "../../../model/policy";
import { module } from "../module";

/** Creates a normalized unique tag through the curated Tags context. */
export const create = module.create.handler(async ({ context, input, errors }) => {
  if (context.readOnly) {
    throw errors.READ_ONLY_MODE({
      message: "Write operation blocked: service is in read-only mode",
      data: { path: "tags.create" },
    });
  }

  const normalizedName = input.name.trim();
  const normalizedColor = input.color.toLowerCase();

  if (await context.tagsStore.existsByName(normalizedName)) {
    throw errors.DUPLICATE_TAG({
      message: `Tag '${normalizedName}' already exists`,
      data: { name: normalizedName },
    });
  }

  const tag: TagType = {
    id: admitGeneratedIdentifier(context.identifierGenerator.generate()),
    workspaceId: context.workspaceId,
    name: normalizedName,
    color: normalizedColor,
    createdAt: context.clock.now(),
  };

  context.logger.info("todo.tags.create", { tagId: tag.id, name: tag.name });
  return await context.tagsStore.insert(tag);
});
