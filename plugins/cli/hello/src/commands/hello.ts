import { Command } from "@oclif/core";

export default class Hello extends Command {
  static description = "Hello from @rawr/plugin-hello";

  async run() {
    this.log("hello");
  }
}

