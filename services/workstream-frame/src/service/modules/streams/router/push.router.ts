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
 *
 * The loop always terminates. Tags are only added and clearances only appended,
 * so `Σ (boundaries − position)` over all items strictly decreases on every
 * productive push and never rises. That monotonicity is also why the frame
 * needs no oscillation detection: it cannot revisit a state it has left.
 *
 * Movement is read off what the substrate did, never off what this turn meant
 * to do. That is what ties `settlement: "advancing"` to a rank that actually
 * decreased: a clearance another writer had already recorded moves the item but
 * not this turn, and reporting it as movement would tell an agent driving the
 * iterator that work is progressing when it is not.
 */
import type { AdvanceView } from "../../../model/dto/advance";
import type { Settlement } from "../../../model/dto/settlement";
import { derivedItemId } from "../../../model/helpers/derived-identity";
import { withLedger } from "../../../model/helpers/ledger-failure";
import { module } from "../module";

/** Advances every item as far as the frame allows, peeling off what does not fit. */
export const push = module.push.handler(async ({ context, input, errors }) => {
  if (context.config.readOnly) {
    throw errors.READ_ONLY_MODE({ data: { path: "streams.push" } });
  }
  const store = context.storeFor(input.revision);

  return await withLedger(
    async () => {
      if (!(await store.streamExists(input.streamId))) {
        throw errors.STREAM_NOT_FOUND({
          message: `Stream '${input.streamId}' not found`,
          data: { streamId: input.streamId },
        });
      }

      const stream = await store.readStream(input.streamId);
      if (stream.closedAt !== null) {
        throw errors.STREAM_CLOSED({
          message: `Stream '${input.streamId}' was closed at ${stream.closedAt}`,
          data: { streamId: input.streamId, closedAt: stream.closedAt },
        });
      }

      const { boundaries, items } = stream;
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
        const cleared = new Set(item.cleared);
        let position = item.position;

        while (position < boundaries.length) {
          const boundary = boundaries[position];
          if (!boundary || !tags.has(boundary.requires)) break;
          // Clearance names the boundary, never its index, so this fact stays
          // true about the same gate even if the frame is later reshaped.
          if (!cleared.has(boundary.key)) {
            const proposed = await store.recordCleared(
              input.streamId,
              item.id,
              boundary.key,
              boundary.requires,
              context.clock.now()
            );
            if (proposed.applied) moved = true;
          }
          position += 1;
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

        const requires = boundaries[position]?.requires ?? "";
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
          const proposed = await store.createDerived(
            input.streamId,
            childId,
            item.id,
            requires,
            `Supply '${requires}' for ${item.title}`,
            context.clock.now()
          );
          if (proposed.applied) {
            moved = true;
          } else {
            // The peel-off is already outstanding, so the parent is waiting on
            // an answer rather than blocked from asking for one.
            advances.push({
              itemId: item.id,
              clearedTo: position,
              outcome: "waiting",
              blockedAt: position,
              requires,
              derivedItemId: childId,
            });
            continue;
          }
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

      // Settlement separates "done" from "stuck". Both are quiet; only one
      // means stop. An agent driving the iterator reads exactly this field.
      const settlement: Settlement = moved
        ? "advancing"
        : advances.every((advance) => advance.outcome === "completed")
          ? "converged"
          : "stalled";

      return { streamId: input.streamId, t: await store.head(), advances, settlement };
    },
    (data) => {
      throw errors.LEDGER_UNAVAILABLE({ data });
    }
  );
});
