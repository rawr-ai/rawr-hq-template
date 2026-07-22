import { Flags } from "@oclif/core";
import { findWorkspaceRoot, RawrCommand } from "@rawr/core";
import { resolveCliReentry, runStep, type StepResult } from "../../lib/subprocess";

export default class RoutineCheck extends RawrCommand {
  static description = "Run the routine dev hygiene loop (doctor + security + tests)";

  static flags = {
    ...RawrCommand.baseFlags,
    mode: Flags.string({
      description: "Security scan mode",
      options: ["staged", "repo"],
      default: "staged",
    }),
    continue: Flags.boolean({
      description: "Continue running steps after a failure",
      default: true,
      allowNo: true,
    }),
    "skip-tests": Flags.boolean({
      description: "Skip bun run test",
      default: false,
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(RoutineCheck);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const mode = String(flags.mode) as "staged" | "repo";
    const shouldContinue = Boolean(flags.continue);
    const skipTests = Boolean((flags as Record<string, unknown>)["skip-tests"]);

    const rawr = resolveCliReentry();

    const planned: StepResult[] = [
      {
        name: "doctor",
        cmd: rawr.cmd,
        args: [...rawr.args, "doctor", ...(baseFlags.json ? ["--json"] : [])],
        cwd: rawr.cwd,
        status: "planned",
      },
      {
        name: "security",
        cmd: rawr.cmd,
        args: [
          ...rawr.args,
          "security",
          "check",
          ...(mode === "staged" ? ["--staged"] : ["--repo"]),
          ...(baseFlags.json ? ["--json"] : []),
        ],
        cwd: rawr.cwd,
        status: "planned",
      },
      {
        name: "tests",
        cmd: "bun",
        args: ["run", "test"],
        cwd: workspaceRoot,
        status: skipTests ? "skipped" : "planned",
      },
    ];

    if (baseFlags.dryRun) {
      const result = this.ok({ steps: planned });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          for (const step of planned)
            this.log(`[dry-run] ${step.name}: ${step.cmd} ${step.args.join(" ")}`);
        },
      });
      return;
    }

    const steps: StepResult[] = [];
    let overallOk = true;

    for (const step of planned) {
      if (step.status === "skipped") {
        steps.push(step);
        continue;
      }

      const r = runStep({
        name: step.name,
        cmd: step.cmd,
        args: step.args,
        cwd: step.cwd,
        ...(step.name === "tests" ? {} : { env: rawr.env }),
        inheritStdio: !baseFlags.json,
      });

      const { proc: _proc, ...publicStep } = r;
      steps.push(publicStep);

      if (publicStep.exitCode !== 0) {
        overallOk = false;
        if (!shouldContinue) break;
      }
    }

    const result = this.ok({ ok: overallOk, steps });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        for (const step of steps) {
          const dur = typeof step.durationMs === "number" ? ` (${step.durationMs}ms)` : "";
          this.log(`${step.status}: ${step.name}${dur}`);
        }
      },
    });

    if (!overallOk) this.exit(1);
  }
}
