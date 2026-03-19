import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { buildHqGraphPlan, runHqGraph } from "../../lib/hq-graph";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class HqGraph extends RawrCommand {
  static description = "Launch the local Nx graph explorer on demand";

  static flags = {
    ...RawrCommand.baseFlags,
    host: Flags.string({
      description: "Host interface for the local Nx graph server",
      default: "127.0.0.1",
    }),
    port: Flags.integer({
      description: "Port for the local Nx graph server",
      default: 4211,
    }),
    focus: Flags.string({
      description: "Focus the graph on a single project",
    }),
    view: Flags.string({
      description: "Graph view to open",
      options: ["projects", "tasks"],
      default: "projects",
    }),
    targets: Flags.string({
      description: "Comma-delimited task targets to render when using the tasks view",
      multiple: true,
    }),
    watch: Flags.boolean({
      description: "Keep the graph server running and update it as the workspace changes",
      default: true,
      allowNo: true,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HqGraph);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const host = flags.host as string;
    const port = flags.port as number;
    const focus = flags.focus as string | undefined;
    const view = flags.view as "projects" | "tasks";
    const watch = flags.watch as boolean;
    const rawTargets = (flags.targets as string[] | undefined) ?? [];

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const targets = rawTargets.flatMap((value) => value.split(",").map((item) => item.trim()).filter(Boolean));

    const plan = buildHqGraphPlan({
      workspaceRoot,
      host,
      port,
      focus,
      view,
      targets,
      watch,
    });

    if (baseFlags.json || baseFlags.dryRun) {
      this.outputResult(this.ok(plan), {
        flags: baseFlags,
        human: () => {
          this.log(`cwd: ${plan.cwd}`);
          this.log(`$ ${plan.cmd} ${plan.args.join(" ")}`);
        },
      });
      return;
    }

    const exitCode = await runHqGraph(plan);
    if (exitCode !== 0) this.exit(exitCode);
  }
}
