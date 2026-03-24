import { createRawrHqManifest } from "./manifest";

const noopLogger = {
  info() {},
  error() {},
} as const;

export function createTestingRawrHqManifest() {
  return createRawrHqManifest({
    hostLogger: noopLogger,
  });
}
