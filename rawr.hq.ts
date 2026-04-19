export { createRawrHqManifest, type RawrHqManifest } from "@rawr/hq-app/manifest";
export { createTestingRawrHqManifest } from "@rawr/hq-app/testing";

import { createTestingRawrHqManifest } from "@rawr/hq-app/testing";

// Transitional compatibility bridge only. Live host authority has moved to apps/hq.
export const rawrHqManifest = createTestingRawrHqManifest();
