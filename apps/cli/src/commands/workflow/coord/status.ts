import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { coordinationErrorMessage } from "@rawr/coordination";
import { coordinationGetRunStatus, resolveServerBaseUrl } from "../../../lib/coordination-api";

export default class WorkflowCoordStatus extends RawrCommand {
  static description = "Show status for a coordination run";

  static args = {
    runId: Args.string({ required: true, description: "Run id" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(WorkflowCoordStatus);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const runId = String(args.runId);

    const baseUrl = await resolveServerBaseUrl(process.cwd());
    const response = await coordinationGetRunStatus({
      baseUrl,
      runId,
    });

    if (!response.ok) {
      const result = this.fail(coordinationErrorMessage(response.error, "Run not found"), {
        code: "COORD_RUN_NOT_FOUND",
        details: response.error,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const data = response.data;
    const result = this.ok({ baseUrl, run: data.run });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`${data.run.runId}: ${data.run.status}`);
      },
    });
  }
}
