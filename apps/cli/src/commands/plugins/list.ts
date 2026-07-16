import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsList extends ExternalExtensionCommand {
  static description = "List guarded external CLI extensions";

  static flags = {
    ...ExternalExtensionCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(PluginsList);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    const projection = await this.externalExtensions().list();
    this.outputResult(this.ok(projection), {
      flags: baseFlags,
      human: () => {
        for (const extension of projection.active) {
          this.log(`${extension.extension.packageId}@${extension.extension.version} (active)`);
        }
        for (const extension of projection.quarantined) {
          this.log(`${extension.identity} (quarantined: ${extension.reason.code})`);
        }
        if (projection.active.length === 0 && projection.quarantined.length === 0) {
          this.log("No external CLI extensions installed");
        }
      },
    });
  }
}
