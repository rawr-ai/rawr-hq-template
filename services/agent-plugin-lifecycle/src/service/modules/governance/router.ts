import { ORPCError } from "@orpc/client";
import { Effect } from "effect";

import { currentMain } from "./middleware/current-main.middleware";
import {
  encodeCurrentMainBodyV3,
  validateCurrentMainRecordV3,
} from "./model/policy/current-main-record";
import { module } from "./module";

const currentMainRecord = module.currentMainRecord.effect(function* ({ input }) {
  return input.kind === "encode-body"
    ? encodeCurrentMainBodyV3(input.body)
    : validateCurrentMainRecordV3(input.bytes);
});

const currentMainSelection = module.currentMainSelection.use(currentMain).effect(function* ({
  context,
  input,
}) {
  return yield* Effect.uninterruptible(
    Effect.tryPromise({
      try: () => context.currentMain.resolve(input.locator),
      catch: (cause) => new ORPCError("INTERNAL_SERVER_ERROR", { cause }),
    })
  );
});

/** Complete governance operation implementation composed for the root router. */
export const router = Object.freeze({
  currentMainRecord,
  currentMainSelection,
});
