import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsUpdate extends ExternalExtensionCommand {
  static description = "Update guarded external CLI extensions through the native Oclif manager";

  static flags = {
    ...ExternalExtensionCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(PluginsUpdate);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    if (await this.refuseDryRunMutation("update", baseFlags)) return;
    const result = await this.externalExtensions().update();
    this.outputOperation(result, baseFlags);
  }
}
