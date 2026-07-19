import { canonicalStatus } from "./canonical-status.router";
import { canonicalSync } from "./canonical-sync.router";
import { completeNativeHomes } from "./complete-native-homes.router";
import { completeTest } from "./complete-test.router";
import { targetedTest } from "./targeted-test.router";

export const router = Object.freeze({
  targetedTest,
  completeTest,
  canonicalSync,
  canonicalStatus,
  completeNativeHomes,
});
