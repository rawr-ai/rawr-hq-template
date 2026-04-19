import { spawn } from "node:child_process";
import path from "node:path";

export type HqGraphPlan = {
  cmd: string;
  args: string[];
  cwd: string;
};

export function buildHqGraphPlan(args: {
  workspaceRoot: string;
  host?: string;
  port?: number;
  focus?: string;
  view?: "projects" | "tasks";
  targets?: string[];
  watch?: boolean;
}): HqGraphPlan {
  const commandArgs = ["nx", "graph", "--open", "true"];

  if (args.host) {
    commandArgs.push("--host", args.host);
  }

  if (typeof args.port === "number") {
    commandArgs.push("--port", String(args.port));
  }

  if (args.focus) {
    commandArgs.push("--focus", args.focus);
  }

  if (args.view) {
    commandArgs.push("--view", args.view);
  }

  if (args.targets && args.targets.length > 0) {
    commandArgs.push("--targets", args.targets.join(","));
  }

  if (args.watch === false) {
    commandArgs.push("--watch=false");
  }

  return {
    cmd: "bunx",
    args: commandArgs,
    cwd: path.resolve(args.workspaceRoot),
  };
}

export async function runHqGraph(plan: HqGraphPlan): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn(plan.cmd, plan.args, {
      cwd: plan.cwd,
      stdio: "inherit",
      env: { ...process.env },
    });

    const forwardSignal = (signal: NodeJS.Signals) => {
      if (child.killed) return;
      try {
        child.kill(signal);
      } catch {
        // Ignore signal-forwarding failures while the child exits.
      }
    };

    process.on("SIGINT", () => forwardSignal("SIGINT"));
    process.on("SIGTERM", () => forwardSignal("SIGTERM"));

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (typeof code === "number") {
        resolve(code);
        return;
      }

      resolve(signal === "SIGINT" ? 130 : 1);
    });
  });
}
