import { Command, Flags } from "@oclif/core";

export default class Doctor extends Command {
  static description = "Sanity-check the RAWR HQ repo wiring";

  static flags = {
    json: Flags.boolean({ description: "Output machine-readable JSON" }),
  } as const;

  async run() {
    const { flags } = await this.parse(Doctor);
    const result = {
      ok: true,
      cwd: process.cwd(),
    };

    if (flags.json) this.log(JSON.stringify(result, null, 2));
    else this.log("ok");
  }
}

