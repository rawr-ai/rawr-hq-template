import { HabitatCommand } from "@habitat-ai/cli/command";
import { Flags } from "@oclif/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import { providerTargetFlag } from "../../../lib/agent-plugins/commands/flags";
import { parseStatusRequest } from "../../../lib/agent-plugins/commands/input";

/**
 * Projects `agent plugins status` into provider convergence observation.
 * It binds explicit provider homes from CLI input without interpreting installed-state truth.
 */
export default class AgentPluginsStatus extends AgentPluginLifecycleCommand {
  static description = "Inspect governed convergence for explicit native provider homes";

  static flags = {
    json: HabitatCommand.baseFlags.json,
    "content-workspace": Flags.string({ description: "Canonical content record workspace" }),
    "repository-identity": Flags.string({ description: "Expected content repository identity" }),
    target: providerTargetFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentPluginsStatus);
    const input = await this.parseInput(flags, parseStatusRequest);
    if (input === undefined) return;
    await this.project({ operation: "providers.status", input }, flags);
  }
}
