import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const CONTROLLER_PRODUCTION_INTERFACE_VERSION = "1";
export const CONTROLLER_PRODUCTION_APP_NAME = "rawr";
export const PINNED_BUN_VERSION = "1.3.14";
export const PINNED_BUN_REVISION = "0d9b296af33f2b851fcbf4df3e9ec89751734ba4";

const productionRoot = dirname(fileURLToPath(import.meta.url));

export const PRODUCTION_DEPENDENCY_MANIFEST_PATH = join(productionRoot, "package.json");
export const PRODUCTION_DEPENDENCY_LOCK_PATH = join(productionRoot, "bun.lock");
export const PINNED_BUN_LICENSE_PATH = join(productionRoot, "BUN_LICENSE.md");

export const PROTECTED_CONTROLLER_SOURCE_PATTERNS = Object.freeze([
  /^plugins\/agents(?:\/|$)/,
  /^tools\/[^/]*-skill-quality(?:\/|$)/,
  /(?:^|\/)research-vault(?:\/|$)/,
  /^docs\/projects\/inngest-event-driven-skillset(?:\/|$)/,
  /^candidate\/(?:native-inngest|effect-inngest|quality)(?:\/|$)/,
  /^plugins\/agents\/dev\/skills\/(?:inngest|effect-inngest|inngest-orpc)(?:\/|$)/,
  /^tools\/inngest-skill-quality(?:\/|$)/,
]);

export const PROTECTED_RUNTIME_DEPENDENCIES = Object.freeze(new Set(["inngest"]));
