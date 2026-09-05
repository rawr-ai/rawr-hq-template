import { type CliTopicPluginDefinition, defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { checkCommand } from "./commands/check.js";
import { packageCommand } from "./commands/package.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { testCommand } from "./commands/test.js";
import { vendorsUpdateCommand } from "./commands/vendors/update.js";
import { services } from "./services.js";

/** Declares exactly the six curated lifecycle commands and their one shared service use. */
export const createPlugin: () => CliTopicPluginDefinition<
  "agent-plugins",
  typeof services,
  readonly [
    typeof checkCommand,
    typeof packageCommand,
    typeof statusCommand,
    typeof syncCommand,
    typeof testCommand,
    typeof vendorsUpdateCommand,
  ],
  readonly []
> = defineCliTopicPlugin.factory()({
  capability: "agent-plugins",
  services,
  commands: [
    checkCommand,
    packageCommand,
    statusCommand,
    syncCommand,
    testCommand,
    vendorsUpdateCommand,
  ],
});
