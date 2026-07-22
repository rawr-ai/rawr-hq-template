import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../../lib/agent-plugins/commands/command";
import {
  contentWorkspaceFlags,
  gitExecutableFlag,
} from "../../../../lib/agent-plugins/commands/flags";
import { parseVendorUpdateRequest } from "../../../../lib/agent-plugins/commands/input";

export default class AgentPluginsUpdateVendors extends AgentPluginLifecycleCommand {
  static description = "Author reviewable updates for explicitly selected tracked vendor sources";

  static flags = {
    json: RawrCommand.baseFlags.json,
    ...contentWorkspaceFlags,
    source: Flags.string({ multiple: true, description: "Declared vendor source identity" }),
    "git-executable": gitExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsUpdateVendors);
    const input = this.parseInput(flags, parseVendorUpdateRequest);
    if (input !== undefined)
      await this.project({ operation: "vendors.update", input }, flags, { git: true });
  }
}
