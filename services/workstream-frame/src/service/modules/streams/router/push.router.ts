/**
 * @fileoverview `streams.push` — the iterator that moves work through the frame.
 *
 * @remarks
 * Read the loop as:
 *
 *   for each item:
 *     advance while the next boundary's requirement is satisfied
 *     if a boundary refuses, peel the refusal off into a derived item
 *
 * A refusal is never patched in place. It becomes a new node with an edge back
 * to its cause and re-enters the same frame as input. Resolving that derived
 * item grants the tag its parent was missing, and the next push carries the
 * parent through. That is the feedback loop, and it is the point of the model.
 */

import type { AdvanceView } from "../../../model/dto/advance";
import { derivedItemId } from "../../../model/helpers/derived-identity";
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Advances every item as far as the frame allows, peeling off what does not fit. */
export const push = module.push.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.push" } });
  }

  return await withLedger(
    async () => {
      if (!(await context.store.streamExists(input.streamId))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' not found`,
          data: { streamId: input.streamId },
        });
      }

      const { boundaries, items } = await context.store.readStream(input.streamId);
      const advances: AdvanceView[] = [];
      let moved = false;

      for (const item of items) {
        // A derived item exists to supply one tag to its parent. It does not
        // traverse the frame itself: it waits to be resolved, and resolving it
        // is the whole of its work.
        //
        // This is load-bearing. If a resolved peel-off fell through to the
        // normal advance below, it would block at the first boundary it cannot
        // clear and peel off a child of its own, forever — the stream would
        // never reach equilibrium. Whether a peel-off should instead traverse a
        // frame of its own is a real design question, recorded as deferred
        // rather than guessed at here.
        if (item.derivedFrom !== null) {
          advances.push({
            itemId: item.id,
            clearedTo: item.position,
            outcome: item.resolved ? "completed" : "idle",
            blockedAt: null,
            requires: null,
            derivedItemId: null,
          });
          continue;
        }

        const tags = new Set(item.tags);
        let position = item.position;
        while (position < boundaries.length && tags.has(boundaries[position]!.requires)) {
          await context.store.recordCleared(input.streamId, item.id, position);
          position += 1;
          moved = true;
        }

        if (position >= boundaries.length) {
          advances.push({
            itemId: item.id,
            clearedTo: position,
            outcome: "completed",
            blockedAt: null,
            requires: null,
            derivedItemId: null,
          });
          continue;
        }

        const requires = boundaries[position]!.requires;
        const childId = derivedItemId(item.id, requires);
        const existing = items.find((candidate) => candidate.id === childId);

        // Peel off only once per unmet requirement. If the peel-off is already
        // outstanding, the parent is simply waiting on it.
        if (existing && !existing.resolved) {
          advances.push({
            itemId: item.id,
            clearedTo: position,
            outcome: "waiting",
            blockedAt: position,
            requires,
            derivedItemId: existing.id,
          });
          continue;
        }

        if (!existing) {
          await context.store.createDerived(
            input.streamId,
            childId,
            item.id,
            requires,
            `Supply '${requires}' for ${item.title}`,
            context.clock.now()
          );
          moved = true;
        }

        advances.push({
          itemId: item.id,
          clearedTo: position,
          outcome: "blocked",
          blockedAt: position,
          requires,
          derivedItemId: childId,
        });
      }

      return {
        streamId: input.streamId,
        t: await context.store.head(),
        advances,
        atEquilibrium: !moved,
      };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
