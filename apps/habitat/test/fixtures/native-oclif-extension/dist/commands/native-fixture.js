import { Command } from "@oclif/core";

export default class NativeFixture extends Command {
  static description = "Exercise a prebuilt native Oclif extension.";

  async run() {
    await this.parse(NativeFixture);
    this.log("native fixture 1.0.0");
  }
}
