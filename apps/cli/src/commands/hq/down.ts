import { RawrCommand } from "@rawr/core";
import { buildHqLifecyclePlan, runHqLifecycle } from "../../lib/hq";
import { findWorkspaceRoot } from "@rawr/core";

export default class HqDown extends RawrCommand {
  static description = "Stop the managed RAWR HQ runtime";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(HqDown);
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
      action: "down",
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
