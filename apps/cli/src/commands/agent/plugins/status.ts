import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  gitExecutableFlag,
  hostedGovernanceExecutableFlag,
  providerExecutableFlag,
  providerTargetFlag,
} from "../../../lib/agent-plugins/commands/flags";
import { parseStatusRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsStatus extends AgentPluginLifecycleCommand {
  static description = "Inspect governed convergence for explicit native provider homes";

  static flags = {
    json: RawrCommand.baseFlags.json,
    "content-workspace": Flags.string({ description: "Canonical content record workspace" }),
    "repository-identity": Flags.string({ description: "Expected content repository identity" }),
    target: providerTargetFlag,
    "git-executable": gitExecutableFlag,
    "hosted-governance-executable": hostedGovernanceExecutableFlag,
    "provider-executable": providerExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsStatus);
    const input = this.parseInput(flags, parseStatusRequest);
    if (input === undefined) return;
    const providers = [...new Set(input.targets.map((target) => target.provider))];
    await this.project({ operation: "providers.canonicalStatus", input }, flags, {
      git: true,
      hostedGovernance: true,
      providers,
    });
  }
}
