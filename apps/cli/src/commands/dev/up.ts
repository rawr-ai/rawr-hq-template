import { RawrCommand } from "@rawr/core";
import { spawn } from "node:child_process";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

export default class DevUp extends RawrCommand {
  static description = "Start the RAWR HQ-Template dev stack (server + web)";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(DevUp);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const cmd = "bun";
    const args = ["run", "dev"];

    if (baseFlags.json || baseFlags.dryRun) {
      const result = this.ok({ cmd, args, cwd: workspaceRoot });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`cwd: ${workspaceRoot}`);
          this.log(`$ ${cmd} ${args.join(" ")}`);
        },
      });
      return;
    }

    const child = spawn(cmd, args, {
      cwd: workspaceRoot,
      stdio: "inherit",
      env: { ...process.env },
    });

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (child.killed) return;
      try {
        child.kill(signal);
      } catch {
        // ignore
      }
    };

    process.on("SIGINT", () => forwardSignal("SIGINT"));
    process.on("SIGTERM", () => forwardSignal("SIGTERM"));

    await new Promise<void>((resolve) => child.on("exit", () => resolve()));
  }
}
