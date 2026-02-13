import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { coordinationErrorMessage, type RunTraceLinkV1 } from "@rawr/coordination";
import { coordinationGetRunStatus, resolveServerBaseUrl } from "../../../lib/coordination-api";

export default class WorkflowCoordTrace extends RawrCommand {
  static description = "Show trace links for a coordination run";

  static args = {
    runId: Args.string({ required: true, description: "Run id" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(WorkflowCoordTrace);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const runId = String(args.runId);

    const baseUrl = await resolveServerBaseUrl(process.cwd());
    const response = await coordinationGetRunStatus({
      baseUrl,
      runId,
    });

    if (!response.ok) {
      const result = this.fail(coordinationErrorMessage(response.error, "Run not found"), {
        code: "COORD_TRACE_NOT_FOUND",
        details: response.error,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const traceLinks: RunTraceLinkV1[] = response.data.run.traceLinks ?? [];
    const result = this.ok({ runId, traceLinks });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`trace links for ${runId}:`);
        for (const link of traceLinks) {
          this.log(`- ${link.label}: ${link.url}`);
        }
      },
    });
  }
}
