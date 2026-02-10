import { Args } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { coordinationFetch, resolveServerBaseUrl } from "../../../lib/coordination-api";

export default class WorkflowCoordValidate extends RawrCommand {
  static description = "Validate a coordination workflow by id";

  static args = {
    workflowId: Args.string({ required: true, description: "Workflow id" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(WorkflowCoordValidate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workflowId = String(args.workflowId);

    const baseUrl = await resolveServerBaseUrl(process.cwd());
    const response = await coordinationFetch<any>({
      baseUrl,
      path: `/rawr/coordination/workflows/${encodeURIComponent(workflowId)}/validate`,
      method: "POST",
    });

    if (!response.ok) {
      const result = this.fail("Failed to validate workflow", {
        code: "COORD_VALIDATE_FAILED",
        details: response.data,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const result = this.ok({ baseUrl, workflowId, validation: response.data.validation });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        const ok = Boolean(response.data?.validation?.ok);
        this.log(`${workflowId}: ${ok ? "valid" : "invalid"}`);
      },
    });
  }
}
