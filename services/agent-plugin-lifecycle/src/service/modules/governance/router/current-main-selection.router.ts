import { ORPCError } from "@orpc/client";
import { Effect } from "effect";

import { currentMain } from "../middleware/current-main.middleware";
import { module } from "../module";

/**
 * @purpose Resolve one reviewed current-main locator against exact Git content.
 * @capability Consume the selection operation's current-main reader enrichment.
 * @behavior Preserve the existing uninterruptible read and closed result boundary.
 * @relation Keep exact selection distinct from current-main record encoding.
 */
export const router = {
  currentMainSelection: module.currentMainSelection.use(currentMain).effect(({ context, input }) =>
    Effect.uninterruptible(
      Effect.tryPromise({
        try: () => context.currentMain.resolve(input.locator),
        catch: (cause) => new ORPCError("INTERNAL_SERVER_ERROR", { cause }),
      })
    )
  ),
};
