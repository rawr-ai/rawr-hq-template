import { HabitatCommand } from "@habitat-ai/cli/command";
import { Flags } from "@oclif/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  providerTargetFlag,
  providerTestDisposableRootFlag,
  releaseWorkspaceFlags,
} from "../../../lib/agent-plugins/commands/flags";
import { parseTestRequest } from "../../../lib/agent-plugins/commands/input";

/**
 * Projects `agent plugins test` into disposable native-provider verification.
 * It admits release and target selections while the lifecycle service owns test sequencing and
 * provider-state interpretation.
 */
export default class AgentPluginsTest extends AgentPluginLifecycleCommand {
  static description =
    "Test a targeted release selection or complete release set in explicit provider homes";

  static flags = {
    json: HabitatCommand.baseFlags.json,
    ...releaseWorkspaceFlags,
    plugin: Flags.string({ multiple: true, description: "Target one declared agent plugin" }),
    "disposable-root": providerTestDisposableRootFlag,
    target: providerTargetFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentPluginsTest);
    const input = await this.parseInput(flags, parseTestRequest);
    if (input === undefined) return;
    await this.project({ operation: "providers.test", input }, flags);
  }
}
