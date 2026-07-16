import { Args } from "@oclif/core";

import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsInstall extends ExternalExtensionCommand {
  static description = "Install an inspected local external CLI extension artifact";

  static args = {
    artifact: Args.string({ description: "Path to a local inspected package artifact", required: true }),
  } as const;

  static flags = {
    ...ExternalExtensionCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { args, flags } = await this.parseRawr(PluginsInstall);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    if (await this.refuseDryRunMutation("install", baseFlags)) return;
    const result = await this.externalExtensions().install(String(args.artifact));
    this.outputOperation(result, baseFlags);
  }
}
