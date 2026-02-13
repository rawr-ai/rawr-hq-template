import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import { coordinationErrorMessage, type CoordinationWorkflowV1 } from "@rawr/coordination";
import {
  coordinationProcedurePath,
  coordinationSaveWorkflow,
  resolveServerBaseUrl,
} from "../../../lib/coordination-api";

function starterWorkflow(input: { workflowId: string; name: string; description: string }): CoordinationWorkflowV1 {
  return {
    workflowId: input.workflowId,
    version: 1,
    name: input.name,
    description: input.description,
    entryDeskId: "desk-a",
    desks: [
      {
        deskId: "desk-a",
        kind: "desk:analysis",
        name: "Intake Desk",
        responsibility: "Analyze incoming context",
        domain: "coordination",
        inputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
        outputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
        memoryScope: { persist: true, namespace: "desk-a" },
      },
      {
        deskId: "desk-b",
        kind: "desk:execution",
        name: "Execution Desk",
        responsibility: "Execute agreed handoff",
        domain: "coordination",
        inputSchema: { type: "object", properties: { payload: { type: "string" } }, required: ["payload"] },
        outputSchema: { type: "object", properties: { done: { type: "boolean" } }, required: ["done"] },
        memoryScope: { persist: false },
      },
    ],
    handoffs: [{ handoffId: "handoff-a-b", fromDeskId: "desk-a", toDeskId: "desk-b" }],
    observabilityProfile: "full",
  };
}

export default class WorkflowCoordCreate extends RawrCommand {
  static description = "Create a typed coordination workflow scaffold on the server";

  static flags = {
    ...RawrCommand.baseFlags,
    id: Flags.string({ description: "Workflow id", required: true }),
    name: Flags.string({ description: "Workflow name", default: "Agent Coordination Workflow" }),
    description: Flags.string({ description: "Workflow description", default: "Coordination and handoff design" }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(WorkflowCoordCreate);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workflow = starterWorkflow({
      workflowId: String(flags.id),
      name: String(flags.name),
      description: String(flags.description),
    });

    if (baseFlags.dryRun) {
      const result = this.ok({
        planned: {
          procedure: "coordination.saveWorkflow",
          method: "POST",
          rpcPath: coordinationProcedurePath("coordination.saveWorkflow"),
        },
        workflow,
      });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log("[dry-run] create workflow");
          this.log(`id: ${workflow.workflowId}`);
        },
      });
      return;
    }

    const baseUrl = await resolveServerBaseUrl(process.cwd());
    const response = await coordinationSaveWorkflow({
      baseUrl,
      workflow,
    });

    if (!response.ok) {
      const result = this.fail(
        coordinationErrorMessage(response.error, "Failed to create coordination workflow"),
        {
          code: "COORD_CREATE_FAILED",
          details: response.error,
        },
      );
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const result = this.ok({
      baseUrl,
      workflowId: workflow.workflowId,
      workflow: response.data.workflow,
      response: response.data,
    });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`created workflow: ${workflow.workflowId}`);
        this.log(`server: ${baseUrl}`);
      },
    });
  }
}
