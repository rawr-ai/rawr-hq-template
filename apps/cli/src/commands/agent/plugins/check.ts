import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  checkModeFlag,
  gitExecutableFlag,
  releaseWorkspaceFlags,
} from "../../../lib/agent-plugins/commands/flags";
import { parseCheckOperationRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsCheck extends AgentPluginLifecycleCommand {
  static description = "Check curated release or repository data without publishing it";

  static flags = {
    json: RawrCommand.baseFlags.json,
    mode: checkModeFlag,
    ...releaseWorkspaceFlags,
    "git-executable": gitExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsCheck);
    const request = this.parseInput(flags, parseCheckOperationRequest);
    if (request === undefined) return;
    await this.project(request, flags, {
      git: request.operation === "releases.check" || request.operation === "releases.checkRepository",
    });
  }
}
