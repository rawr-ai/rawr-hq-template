import { module } from "../module";

/**
 * @purpose Resolve one reviewed current-main locator against exact Git content.
 * @capability Consume the selection operation's current-main reader enrichment.
 * @behavior Keep the read cancellable while returning every expected refusal as a closed result.
 * @relation Keep exact selection distinct from current-main record encoding.
 */
export const router = {
  currentMainSelection: module.currentMainSelection.effect(({ context, input }) =>
    context.currentMain.resolve(input.locator)
  ),
};
