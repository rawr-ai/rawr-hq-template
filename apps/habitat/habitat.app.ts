import { createPlugin as createAgentPluginsPlugin } from "@habitat-ai/plugin-agent-plugins";
import { createPlugin as createAuthoringPlugin } from "@habitat-ai/plugin-authoring";
import { createPlugin as createFoundationPlugin } from "@habitat-ai/plugin-foundation";
import { defineApp } from "@habitat-ai/sdk/app";
import { runCliCommandGenerator } from "./src/generators/run-cli-command.js";
import { runCliExtensionGenerator } from "./src/generators/run-cli-extension.js";

export const habitatApp = defineApp({
  id: "habitat",
  plugins: [
    createFoundationPlugin(),
    createAgentPluginsPlugin(),
    createAuthoringPlugin({ runCliCommandGenerator, runCliExtensionGenerator }),
  ],
});
