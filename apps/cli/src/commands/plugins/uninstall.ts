import { Args } from "@oclif/core";

import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsUninstall extends ExternalExtensionCommand {
  static description = "Uninstall an external CLI extension through the native Oclif manager";

  static args = {
    extension: Args.string({
      description: "Package ID, absolute linked root, or explicit ./ or ../ linked root",
      required: true,
    }),
  } as const;

  static flags = {
    ...ExternalExtensionCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { args, flags } = await this.parseRawr(PluginsUninstall);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    if (await this.refuseDryRunMutation("uninstall", baseFlags)) return;
    const result = await this.externalExtensions().uninstall(String(args.extension));
    this.outputOperation(result, baseFlags);
  }
}
