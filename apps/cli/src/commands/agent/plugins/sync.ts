import { HabitatCommand } from "@habitat-ai/cli/command";
import { Flags } from "@oclif/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import { providerTargetFlag } from "../../../lib/agent-plugins/commands/flags";
import { parseSyncRequest } from "../../../lib/agent-plugins/commands/input";

/**
 * Projects `agent plugins sync` into native-provider convergence.
 * It selects explicit provider homes and leaves desired-state calculation and mutation policy to
 * the lifecycle service.
 */
export default class AgentPluginsSync extends AgentPluginLifecycleCommand {
  static description = "Converge governed current-main into explicit native provider homes";

  static flags = {
    json: HabitatCommand.baseFlags.json,
    "content-workspace": Flags.string({ description: "Canonical content record workspace" }),
    "repository-identity": Flags.string({ description: "Expected content repository identity" }),
    target: providerTargetFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentPluginsSync);
    const input = await this.parseInput(flags, parseSyncRequest);
    if (input === undefined) return;
    await this.project({ operation: "providers.sync", input }, flags);
  }
}
