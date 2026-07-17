import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import { artifactFlag } from "../../../lib/agent-plugins/commands/flags";
import { parseExportRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsExport extends AgentPluginLifecycleCommand {
  static description = "Export immutable agent-plugin artifacts to explicit managed destinations";

  static flags = {
    json: RawrCommand.baseFlags.json,
    artifact: artifactFlag,
    mode: Flags.string({ options: ["targeted-release", "complete-set"], description: "Explicit artifact mode" }),
    layout: Flags.string({ options: ["codex-v1", "claude-v1"], description: "Versioned export layout" }),
    destination: Flags.string({ multiple: true, description: "Canonical absolute export destination" }),
    overwrite: Flags.string({
      options: ["managed-only", "replace-planned"],
      description: "Managed overwrite policy",
    }),
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsExport);
    const input = this.parseInput(flags, parseExportRequest);
    if (input !== undefined) await this.project({ operation: "exports.apply", input }, flags);
  }
}
