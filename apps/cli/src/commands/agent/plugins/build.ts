import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import { gitExecutableFlag, releaseWorkspaceFlags } from "../../../lib/agent-plugins/commands/flags";
import { parseBuildRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsBuild extends AgentPluginLifecycleCommand {
  static description = "Publish an immutable curated release or complete release set";

  static flags = {
    json: RawrCommand.baseFlags.json,
    ...releaseWorkspaceFlags,
    "git-executable": gitExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsBuild);
    const input = this.parseInput(flags, parseBuildRequest);
    if (input !== undefined) await this.project({ operation: "releases.build", input }, flags, { git: true });
  }
}
