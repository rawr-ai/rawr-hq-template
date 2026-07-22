import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import { releaseWorkspaceFlags } from "../../../lib/agent-plugins/commands/flags";
import { parsePackageRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsPackage extends AgentPluginLifecycleCommand {
  static description = "Render a deterministic package from exact selected Git content";

  static flags = {
    json: RawrCommand.baseFlags.json,
    ...releaseWorkspaceFlags,
    format: Flags.string({ options: ["cowork-v1"], description: "Package format" }),
    output: Flags.string({ description: "Canonical absolute package output path" }),
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsPackage);
    const input = this.parseInput(flags, parsePackageRequest);
    if (input !== undefined) await this.project({ operation: "packaging.package", input }, flags);
  }
}
