import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import { AgentPluginLifecycleCommand } from "../../../lib/agent-plugins/commands/command";
import {
  gitExecutableFlag,
  gitPointerFlags,
  hostedGovernanceExecutableFlag,
} from "../../../lib/agent-plugins/commands/flags";
import { parseAttestPromotionRequest } from "../../../lib/agent-plugins/commands/input";

export default class AgentPluginsAttestPromotion extends AgentPluginLifecycleCommand {
  static description = "Validate governed acceptance and attest exact current-main equivalence";

  static flags = {
    json: RawrCommand.baseFlags.json,
    "content-workspace": Flags.string({ description: "Canonical governed content workspace" }),
    "repository-identity": Flags.string({ description: "Expected governed repository identity" }),
    ...gitPointerFlags("policy"),
    ...gitPointerFlags("request"),
    ...gitPointerFlags("acceptance"),
    ...gitPointerFlags("landed"),
    "git-executable": gitExecutableFlag,
    "hosted-governance-executable": hostedGovernanceExecutableFlag,
  } as const;

  async run(): Promise<void> {
    const { flags } = await this.parseRawr(AgentPluginsAttestPromotion);
    const input = this.parseInput(flags, parseAttestPromotionRequest);
    if (input !== undefined) {
      await this.project({ operation: "governance.attestPromotion", input }, flags, {
        git: true,
        hostedGovernance: true,
      });
    }
  }
}
