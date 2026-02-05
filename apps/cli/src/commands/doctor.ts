import { RawrCommand } from "@rawr/core";

export default class Doctor extends RawrCommand {
  static description = "Sanity-check the RAWR HQ-Template repo wiring";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(Doctor);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const result = this.ok({ cwd: process.cwd() });
    this.outputResult(result, { flags: baseFlags });
  }
}
