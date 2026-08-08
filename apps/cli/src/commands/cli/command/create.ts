import { HabitatCommand } from "@habitat-ai/cli/command";
import { Args } from "@oclif/core";

import {
  authorOfficialCommand,
  parseOfficialCommandAuthoringRequest,
} from "../../../lib/authoring/cli-command";
import { authoringResultView } from "../../../lib/authoring/shared";

export default class CliCommandCreate extends HabitatCommand {
  static description = "Create one official command in a verified Template workspace";

  static args = {
    topic: Args.string({ required: true, description: "Official command topic" }),
    name: Args.string({ required: true, description: "Official command name" }),
  } as const;

  static flags = {
    ...HabitatCommand.baseFlags,
  } as const;

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CliCommandCreate);
    const baseFlags = HabitatCommand.extractBaseFlags(flags);
    const request = parseOfficialCommandAuthoringRequest({
      topic: args.topic,
      name: args.name,
      workspaceCwd: process.cwd(),
      dryRun: baseFlags.dryRun,
    });
    if (!request.ok) {
      await this.outputResult(
        this.fail("Official command request rejected", { details: request.issues }),
        { flags: baseFlags }
      );
      this.exit(2);
      return;
    }
    const result = await authorOfficialCommand(request.value);
    const view = authoringResultView(result);
    const failed =
      result.kind === "AuthoringRejected" ||
      result.kind === "AuthoringFailed" ||
      result.kind === "AuthoringPartial";
    await this.outputResult(
      failed
        ? this.fail("Official command authoring did not complete", { details: view })
        : this.ok(view),
      { flags: baseFlags }
    );
    if (failed) this.exit(1);
  }
}
