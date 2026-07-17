import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import { gitExecutableFlag, releaseWorkspaceFlags } from "../../../lib/agent-plugins/commands/flags";
import { parseCheckRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsCheck extends AgentPluginLifecycleCommand {
  static description = "Check an explicit curated release candidate without publishing it";

  static flags = {
    json: RawrCommand.baseFlags.json,
    ...releaseWorkspaceFlags,
    "git-executable": gitExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsCheck);
    const input = this.parseInput(flags, parseCheckRequest);
    if (input !== undefined) await this.project({ operation: "releases.check", input }, flags, { git: true });
  }
}
