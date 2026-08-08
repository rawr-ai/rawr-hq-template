import { HabitatCommand } from "@habitat-ai/cli/command";

import { AgentPluginLifecycleCommand } from "../../../../lib/agent-plugins/commands/command";
import { contentWorkspaceFlags } from "../../../../lib/agent-plugins/commands/flags";
import { parseVendorStatusRequest } from "../../../../lib/agent-plugins/commands/input";

/**
 * Projects `agent plugins status vendors` into read-only vendor source inspection.
 * The command admits workspace coordinates while vendor identity and diagnostics remain
 * lifecycle-service concerns.
 */
export default class AgentPluginsStatusVendors extends AgentPluginLifecycleCommand {
  static description = "Inspect declared vendor sources without authoring repository bytes";

  static flags = {
    json: HabitatCommand.baseFlags.json,
    ...contentWorkspaceFlags,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentPluginsStatusVendors);
    const input = await this.parseInput(flags, parseVendorStatusRequest);
    if (input !== undefined) await this.project({ operation: "vendors.status", input }, flags);
  }
}
