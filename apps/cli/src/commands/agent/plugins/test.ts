import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  providerExecutableFlag,
  providerTargetFlag,
} from "../../../lib/agent-plugins/commands/flags";
import { parseTestRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsTest extends AgentPluginLifecycleCommand {
  static description =
    "Test a targeted release selection or complete release set in explicit provider homes";

  static flags = {
    json: RawrCommand.baseFlags.json,
    release: Flags.string({ multiple: true, description: "Canonical targeted release handle" }),
    "release-set": Flags.string({ description: "Canonical complete release-set handle" }),
    "evaluation-profile": Flags.string({ description: "Exact evaluation profile identity" }),
    target: providerTargetFlag,
    "provider-executable": providerExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsTest);
    const input = this.parseInput(flags, parseTestRequest);
    if (input === undefined) return;
    const providers = [...new Set(input.targets.map((target) => target.provider))];
    if (input.kind === "targeted-test") {
      await this.project({ operation: "providers.targetedTest", input }, flags, { providers });
    } else {
      await this.project({ operation: "providers.completeTest", input }, flags, { providers });
    }
  }
}
