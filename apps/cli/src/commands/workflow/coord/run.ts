import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { coordinationFetch, resolveServerBaseUrl } from "../../../lib/coordination-api";

function parseInput(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    throw new Error("--input must be valid JSON object text");
  }
}

export default class WorkflowCoordRun extends RawrCommand {
  static description = "Run a coordination workflow by id";

  static args = {
    workflowId: Args.string({ required: true, description: "Workflow id" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    input: Flags.string({ description: "JSON object input", default: "{}" }),
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(WorkflowCoordRun);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const workflowId = String(args.workflowId);

    let input: Record<string, unknown>;
    try {
      input = parseInput(String(flags.input));
    } catch (err) {
      const result = this.fail(err instanceof Error ? err.message : String(err), {
        code: "INVALID_INPUT_JSON",
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    if (baseFlags.dryRun) {
      const result = this.ok({
        planned: {
          method: "POST",
          path: `/rawr/coordination/workflows/${workflowId}/run`,
          body: { input },
        },
      });
      this.outputResult(result, { flags: baseFlags });
      return;
    }

    const baseUrl = await resolveServerBaseUrl(process.cwd());
    const response = await coordinationFetch<any>({
      baseUrl,
      path: `/rawr/coordination/workflows/${encodeURIComponent(workflowId)}/run`,
      method: "POST",
      body: { input },
    });

    if (!response.ok) {
      const result = this.fail("Workflow run failed", {
        code: "COORD_RUN_FAILED",
        details: response.data,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const result = this.ok({ baseUrl, workflowId, run: response.data.run });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`run started: ${response.data.run?.runId}`);
        this.log(`status: ${response.data.run?.status}`);
      },
    });
  }
}
