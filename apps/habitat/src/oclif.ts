import { deriveRuntimeArtifacts } from "@habitat-ai/sdk/runtime/derivation";
import { entrypoint } from "../cli.js";
import { createOclifSourceBundle } from "./host.js";

export const sourceBundle = createOclifSourceBundle(
  deriveRuntimeArtifacts({ entrypoint, profileId: entrypoint.profile.id })
);
export const COMMANDS = sourceBundle.COMMANDS;
export { FINALLY_HOOK } from "./host.js";
