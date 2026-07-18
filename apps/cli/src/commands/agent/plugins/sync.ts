import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  gitExecutableFlag,
  hostedGovernanceExecutableFlag,
  providerExecutableFlag,
  providerTargetFlag,
} from "../../../lib/agent-plugins/commands/flags";
import { parseSyncRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsSync extends AgentPluginLifecycleCommand {
  static description = "Converge governed current-main into explicit native provider homes";

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
    const { flags } = await this.parseRawr(AgentPluginsSync);
    const input = this.parseInput(flags, parseSyncRequest);
    if (input === undefined) return;
    const providers = [...new Set(input.targets.map((target) => target.provider))];
    await this.project({ operation: "providers.canonicalSync", input }, flags, {
      git: true,
      hostedGovernance: true,
      providers,
    });
  }
}
