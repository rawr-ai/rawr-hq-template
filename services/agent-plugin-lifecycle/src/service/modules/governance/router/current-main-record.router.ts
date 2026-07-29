import { Effect } from "effect";
import {
  encodeCurrentMainBodyV3,
  validateCurrentMainRecordV3,
} from "../model/policy/current-main-record";
import { module } from "../module";

/**
 * @purpose Encode or validate Personal's versioned current-main record.
 * @capability Consume only the operation input and Governance's record policy.
 * @behavior Return the same closed TypeBox-backed record result for both actions.
 * @relation Keep record authorship separate from exact Git selection.
 */
export const currentMainRecord = module.currentMainRecord.effect(function* ({ input }) {
  return yield* Effect.succeed(
    input.kind === "encode-body"
      ? encodeCurrentMainBodyV3(input.body)
      : validateCurrentMainRecordV3(input.bytes)
  );
});
