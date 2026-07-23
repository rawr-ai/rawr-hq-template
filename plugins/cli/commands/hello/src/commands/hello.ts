import { Command } from "@oclif/core";

export default class Hello extends Command {
  static description = "Hello from @rawr/plugin-hello";

  async run() {
    await this.parse(Hello);
    this.log("hello");
  }
}
