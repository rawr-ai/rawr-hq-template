import { module } from "../module";

/** Lists the current workspace's tag catalog. */
export const list = module.list.handler(async ({ context }) => {
  return await context.tagsStore.findAll();
});
