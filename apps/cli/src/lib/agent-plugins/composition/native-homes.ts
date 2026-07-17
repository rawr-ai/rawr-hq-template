import {
  createKnownNativeHomesSnapshot,
  type KnownNativeHomesReader,
} from "@rawr/agent-plugin-export";
import type {
  CompleteNativeHomesApplication,
} from "@rawr/agent-provider-deployment";

export function createExportKnownNativeHomesReader(
  readProviderHomes: CompleteNativeHomesApplication,
): KnownNativeHomesReader {
  return Object.freeze({
    async readCompleteSnapshot() {
      const observed = await readProviderHomes();
      if (!observed.ok) {
        return Object.freeze({
          kind: "Unavailable" as const,
          failure: Object.freeze({
            code: "NativeHomesUnavailable" as const,
            phase: "native-homes",
            message: observed.issues.map((issue) => issue.message).join("; "),
          }),
        });
      }
      const verified = createKnownNativeHomesSnapshot(observed.value.homes.map((home) => ({
        provider: home.provider,
        canonicalPath: home.canonicalHome,
      })));
      return verified.ok
        ? Object.freeze({ kind: "Verified" as const, snapshot: verified.snapshot })
        : Object.freeze({ kind: "Unavailable" as const, failure: verified.failure });
    },
  });
}
