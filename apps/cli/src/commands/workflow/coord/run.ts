import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { coordinationErrorMessage, type JsonValue } from "@rawr/coordination";
import {
  coordinationProcedurePath,
  coordinationQueueRun,
  resolveServerBaseUrl,
} from "../../../lib/coordination-api";

function parseInput(raw: string): JsonValue {
  try {
    const parsed = JSON.parse(raw) as JsonValue;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
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

    let input: JsonValue;
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
          procedure: "coordination.queueRun",
          method: "POST",
          rpcPath: coordinationProcedurePath("coordination.queueRun"),
          body: { input },
        },
      });
      this.outputResult(result, { flags: baseFlags });
      return;
    }

    const baseUrl = await resolveServerBaseUrl(process.cwd());
    const response = await coordinationQueueRun({
      baseUrl,
      workflowId,
      runInput: input,
    });

    if (!response.ok) {
      const result = this.fail(coordinationErrorMessage(response.error, "Workflow run failed"), {
        code: "COORD_RUN_FAILED",
        details: response.error,
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const data = response.data;
    const result = this.ok({
      baseUrl,
      workflowId,
      run: data.run,
      eventIds: data.eventIds,
    });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`run started: ${data.run.runId}`);
        this.log(`status: ${data.run.status}`);
      },
    });
  }
}
