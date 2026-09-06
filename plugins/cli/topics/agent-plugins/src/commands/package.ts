import { createOclifCommand, type OclifCommandContext } from "@habitat-ai/sdk/plugins/cli/oclif";
import { Flags } from "@oclif/core";
import { absolutePathFlag, cleanFlags, releaseFlags } from "../flags.js";
import { cleanWorkspace, releaseMode } from "../input.js";
import { present } from "../output.js";
import type { services } from "../services.js";

const packageFlags = {
  json: Flags.boolean(),
  ...cleanFlags,
  ...releaseFlags,
  format: Flags.option({ required: true, options: ["cowork-v1"] as const, allowStdin: false })(),
  output: absolutePathFlag({ required: true }),
};

/** Packages one explicit release selection without choosing content or an output destination. */
export const packageCommand = createOclifCommand({
  id: "agent:plugins:package",
  description: "Package exact selected agent-plugin content",
  args: {},
  flags: packageFlags,
  effect: function* ({
    flags,
    clients,
  }: OclifCommandContext<{}, typeof packageFlags, typeof services>) {
    return {
      operation: "packaging.package" as const,
      json: flags.json === true,
      result: yield* clients.lifecycle.withInvocation({ invocation: undefined }).packaging.package({
        contentWorkspace: cleanWorkspace(flags),
        mode: releaseMode(flags),
        format: flags.format,
        outputPath: flags.output,
      }),
    };
  },
  async present(outcome, command) {
    await present(outcome, command);
  },
});
