import { Args } from "@oclif/core";

import { ExternalExtensionCommand } from "../../lib/external-extensions/command";

export default class PluginsInspect extends ExternalExtensionCommand {
  static description = "Inspect one guarded external CLI extension";

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
    const { args, flags } = await this.parseRawr(PluginsInspect);
    const baseFlags = ExternalExtensionCommand.extractBaseFlags(flags);
    const inspection = await this.externalExtensions().inspect(String(args.extension));
    this.outputResult(this.ok(inspection), {
      flags: baseFlags,
      human: () => {
        if (!inspection.found) {
          this.log(`${inspection.identity} is not installed`);
          return;
        }
        const identity =
          inspection.state === "active"
            ? inspection.value.extension.packageId
            : inspection.value.identity;
        this.log(`${identity} (${inspection.state})`);
      },
    });
  }
}
