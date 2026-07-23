import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  gitExecutableFlag,
  providerExecutableFlag,
  providerTestDisposableRootFlag,
  providerTargetFlag,
  releaseWorkspaceFlags,
} from "../../../lib/agent-plugins/commands/flags";
import { parseTestRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsTest extends AgentPluginLifecycleCommand {
  static description =
    "Test a targeted release selection or complete release set in explicit provider homes";

  static flags = {
    json: RawrCommand.baseFlags.json,
    ...releaseWorkspaceFlags,
    plugin: Flags.string({ multiple: true, description: "Target one declared agent plugin" }),
    "disposable-root": providerTestDisposableRootFlag,
    target: providerTargetFlag,
    "git-executable": gitExecutableFlag,
    "provider-executable": providerExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsTest);
    const input = this.parseInput(flags, parseTestRequest);
    if (input === undefined) return;
    const providers = [...new Set(input.targets.map((target) => target.provider))];
    await this.project({ operation: "providers.test", input }, flags, {
      git: true,
      providers,
    });
  }
}
