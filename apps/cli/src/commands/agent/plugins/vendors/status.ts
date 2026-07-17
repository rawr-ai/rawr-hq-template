import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../../lib/agent-plugins/commands/command";
import {
  contentWorkspaceFlags,
  gitExecutableFlag,
} from "../../../../lib/agent-plugins/commands/flags";
import { parseVendorStatusRequest } from "../../../../lib/agent-plugins/commands/input";

export default class AgentPluginsVendorsStatus extends AgentPluginLifecycleCommand {
  static description = "Inspect declared vendor sources without authoring repository bytes";

  static flags = {
    json: RawrCommand.baseFlags.json,
    ...contentWorkspaceFlags,
    "git-executable": gitExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsVendorsStatus);
    const input = this.parseInput(flags, parseVendorStatusRequest);
    if (input !== undefined) await this.project({ operation: "vendors.status", input }, flags, { git: true });
  }
}
