// @expected-error TS2353
import type { RuntimeProfile } from "@rawr/sdk/runtime/profiles";

export const BadProfile = {
  kind: "runtime.profile",
  id: "bad.profile",
  resources: [],
  providerSelections: [],
} as const satisfies RuntimeProfile;
