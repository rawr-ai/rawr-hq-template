import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import {
  authorCuratedAgentPlugin,
  parseCuratedAgentPluginAuthoringRequest,
} from "../../../lib/authoring/agent-plugin";
import { authoringResultView } from "../../../lib/authoring/shared";

export default class AgentPluginsCreate extends RawrCommand {
  static description = "Create curated agent-plugin content in an explicit content workspace";

  static args = {
    id: Args.string({ required: true, description: "Curated agent-plugin identity" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    "content-workspace": Flags.string({ required: true, description: "Explicit personal content workspace" }),
  } as const;

  async run(): Promise<void> {
    const { args, flags } = await this.parseRawr(AgentPluginsCreate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const request = parseCuratedAgentPluginAuthoringRequest({
      pluginId: args.id,
      contentWorkspace: flags["content-workspace"],
      dryRun: baseFlags.dryRun,
    });
    if (!request.ok) {
      this.outputResult(this.fail("Curated agent-plugin request rejected", { details: request.issues }), { flags: baseFlags });
      this.exit(2);
      return;
    }
    const result = await authorCuratedAgentPlugin(request.value);
    const view = authoringResultView(result);
    const failed = result.kind === "AuthoringRejected" || result.kind === "AuthoringFailed" || result.kind === "AuthoringPartial";
    this.outputResult(failed
      ? this.fail("Curated agent-plugin authoring did not complete", { details: view })
      : this.ok(view), { flags: baseFlags });
    if (failed) this.exit(1);
  }
}
