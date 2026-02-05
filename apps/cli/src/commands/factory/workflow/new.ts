import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import path from "node:path";
import { recordArtifact } from "../../../lib/journal-context";
import { findWorkspaceRoot } from "../../../lib/workspace-plugins";
import {
  appendToolExport,
  assertSafeSegment,
  planWriteFile,
  renderWorkflowSource,
  renderWorkflowTestSource,
  type FactoryPlannedWrite,
  type FactoryWriteMode,
} from "../../../lib/factory";

export default class FactoryWorkflowNew extends RawrCommand {
  static description = "Create a new workflow command (`rawr workflow <name>`) with a matching Vitest test";

  static args = {
    name: Args.string({ required: true, description: "Workflow name (kebab-case)" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    description: Flags.string({ description: "Workflow description", required: true }),
    "tools-export": Flags.boolean({
      description: "Append this workflow to `tools export`",
      default: true,
      allowNo: true,
    }),
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(FactoryWorkflowNew);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const name = assertSafeSegment(String(args.name), "name");
    const description = String(flags.description);
    const updateTools = Boolean((flags as Record<string, unknown>)["tools-export"]);

    const cliRoot = path.join(workspaceRoot, "apps", "cli");
    const mode: FactoryWriteMode = baseFlags.dryRun ? "dry-run" : "write";

    const commandPath = path.join(cliRoot, "src", "commands", "workflow", `${name}.ts`);
    const testPath = path.join(cliRoot, "test", `workflow-${name}.test.ts`);
    const toolsExportPath = path.join(cliRoot, "src", "commands", "tools", "export.ts");

    const planned: FactoryPlannedWrite[] = [];
    planned.push(await planWriteFile(commandPath, mode, renderWorkflowSource({ name, description })));
    planned.push(await planWriteFile(testPath, mode, renderWorkflowTestSource({ name })));

    let toolsUpdated = false;
    if (updateTools) {
      const { updated, planned: toolPlan } = await appendToolExport(
        toolsExportPath,
        { command: `workflow ${name}`, description },
        mode,
      );
      toolsUpdated = updated;
      if (toolPlan) planned.push(toolPlan);
    }

    for (const p of planned) {
      if (p.action === "create") recordArtifact(p.path);
    }

    const result = this.ok({ name, description, toolsUpdated, planned });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        for (const p of planned) {
          const reason = p.reason ? ` (${p.reason})` : "";
          this.log(`${p.action}: ${p.path}${reason}`);
        }
      },
    });
  }
}

