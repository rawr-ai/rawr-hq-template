import { type CliTopicPluginDefinition, defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { syncUpstreamCommand } from "./commands/repo-sync-upstream.js";
import { doctorCommand } from "./commands/stack-doctor.js";
import { drainCommand } from "./commands/stack-drain.js";
import { cleanupCommand } from "./commands/worktree-cleanup.js";
import { services } from "./services.js";

/** Declares exactly four developer commands and their one managed service use. */
export const createPlugin: () => CliTopicPluginDefinition<
  "dev",
  typeof services,
  readonly [
    typeof syncUpstreamCommand,
    typeof doctorCommand,
    typeof drainCommand,
    typeof cleanupCommand,
  ],
  readonly []
> = defineCliTopicPlugin.factory()({
  capability: "dev",
  services,
  commands: [syncUpstreamCommand, doctorCommand, drainCommand, cleanupCommand],
});
