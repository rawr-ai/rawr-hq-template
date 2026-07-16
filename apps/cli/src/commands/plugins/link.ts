import { Args } from "@oclif/core";

import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsLink extends ExternalExtensionCommand {
  static description = "Link a statically verified external CLI extension without installing dependencies";

  static args = {
    path: Args.string({ description: "Path to an external CLI extension", required: true }),
  } as const;

  static flags = {
    ...ExternalExtensionCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { args, flags } = await this.parseRawr(PluginsLink);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    if (await this.refuseDryRunMutation("link", baseFlags)) return;
    const result = await this.externalExtensions().link(String(args.path));
    this.outputOperation(result, baseFlags);
  }
}
