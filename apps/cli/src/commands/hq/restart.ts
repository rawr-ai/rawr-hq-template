import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { buildHqLifecyclePlan, runHqLifecycle } from "../../lib/hq";
import { HQ_OBSERVABILITY_MODES, HQ_OPEN_POLICIES, type HqObservabilityMode, type HqOpenPolicy } from "../../lib/hq-status";
import { findWorkspaceRoot } from "@rawr/core";

export default class HqRestart extends RawrCommand {
  static description = "Restart the managed RAWR HQ runtime";

  static flags = {
    ...RawrCommand.baseFlags,
    open: Flags.string({
      description: "Open policy for local HQ surfaces",
      options: [...HQ_OPEN_POLICIES],
      default: "all",
    }),
    observability: Flags.string({
      description: "Managed observability mode for local HyperDX support",
      options: [...HQ_OBSERVABILITY_MODES],
      default: "auto",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HqRestart);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const plan = buildHqLifecyclePlan({
      workspaceRoot,
      action: "restart",
      open: flags.open as HqOpenPolicy,
      observability: flags.observability as HqObservabilityMode,
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

    const exitCode = await runHqLifecycle(plan);
    if (exitCode !== 0) this.exit(exitCode);
  }
}
