import { defineCliTopicPlugin } from "@habitat-ai/sdk/plugins/cli";
import { createCommandCreateCommand } from "./commands/command-create.js";
import { createExtensionCreateCommand } from "./commands/extension-create.js";
import type { AuthoringOptions } from "./options.js";
import { services } from "./services.js";

export type {
  AuthoringOptions,
  AuthoringReceipt,
  AuthoringRunOptions,
  CliCommandRequest,
  CliExtensionRequest,
} from "./options.js";

/** Selects exactly two cold authoring projections with app-owned native runners. */
export const createPlugin = defineCliTopicPlugin.factory<AuthoringOptions>()((options) => ({
  capability: "authoring",
  services,
  commands: [
    createCommandCreateCommand(options.runCliCommandGenerator),
    createExtensionCreateCommand(options.runCliExtensionGenerator),
  ],
}));
