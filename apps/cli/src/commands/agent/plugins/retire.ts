import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  providerExecutableFlag,
  providerTargetFlag,
} from "../../../lib/agent-plugins/commands/flags";
import { parseRetireRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsRetire extends AgentPluginLifecycleCommand {
  static description = "Retire one managed agent plugin from explicit native provider homes";

  static flags = {
    json: RawrCommand.baseFlags.json,
    plugin: Flags.string({ description: "Managed agent-plugin identity" }),
    target: providerTargetFlag,
    "provider-executable": providerExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsRetire);
    const input = this.parseInput(flags, parseRetireRequest);
    if (input === undefined) return;
    const providers = [...new Set(input.targets.map((target) => target.provider))];
    await this.project({ operation: "providers.managedRetire", input }, flags, { providers });
  }
}
