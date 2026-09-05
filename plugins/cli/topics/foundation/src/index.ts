import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { checkCommand } from "./commands/check.js";
import { hookCommand } from "./commands/hook.js";
import { resolveCommand } from "./commands/resolve.js";
import { services } from "./services.js";

export const createPlugin = defineCliTopicPlugin.factory()({
  capability: "foundation",
  services,
  commands: [resolveCommand, checkCommand, hookCommand],
});
