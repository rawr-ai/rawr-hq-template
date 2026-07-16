import { Flags } from "@oclif/core";

import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsReset extends ExternalExtensionCommand {
  static description = "Reset native external CLI extension state";

  static flags = {
    ...ExternalExtensionCommand.baseFlags,
    hard: Flags.boolean({ description: "Remove native package-manager state" }),
    reinstall: Flags.boolean({
      description: "Rejected: reinstall cannot bypass per-extension guarding",
    }),
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(PluginsReset);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    if (await this.refuseDryRunMutation("reset", baseFlags)) return;
    const result = await this.externalExtensions().reset({
      hard: Boolean(flags.hard),
      reinstall: Boolean(flags.reinstall),
    });
    this.outputOperation(result, baseFlags);
  }
}
