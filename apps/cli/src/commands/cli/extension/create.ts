import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";

import {
  authorExternalExtension,
  parseExternalExtensionAuthoringRequest,
} from "../../../lib/authoring/cli-extension";
import { authoringResultView } from "../../../lib/authoring/shared";

export default class CliExtensionCreate extends RawrCommand {
  static description = "Create portable external Oclif extension source";

  static args = {
    id: Args.string({ required: true, description: "External extension identity" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    destination: Flags.string({ required: true, description: "Explicit extension destination" }),
  } as const;

  async run(): Promise<void> {
    const { args, flags } = await this.parseRawr(CliExtensionCreate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const request = parseExternalExtensionAuthoringRequest({
      extensionId: args.id,
      destination: flags.destination,
      operatorCwd: process.cwd(),
      dryRun: baseFlags.dryRun,
    });
    if (!request.ok) {
      this.outputResult(this.fail("External extension request rejected", { details: request.issues }), { flags: baseFlags });
      this.exit(2);
      return;
    }
    const result = await authorExternalExtension(request.value);
    const view = authoringResultView(result);
    const failed = result.kind === "AuthoringRejected" || result.kind === "AuthoringFailed" || result.kind === "AuthoringPartial";
    this.outputResult(failed
      ? this.fail("External extension authoring did not complete", { details: view })
      : this.ok(view), { flags: baseFlags });
    if (failed) this.exit(1);
  }
}
