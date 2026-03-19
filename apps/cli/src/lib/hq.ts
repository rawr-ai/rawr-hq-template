import { spawn } from "node:child_process";
import path from "node:path";
import type { HqObservabilityMode, HqOpenPolicy } from "./hq-status";

export const HQ_ACTIONS = ["up", "down", "status", "restart", "attach"] as const;
export type HqAction = (typeof HQ_ACTIONS)[number];

export type HqLifecyclePlan = {
  cmd: string;
  args: string[];
  cwd: string;
};

export function buildHqLifecyclePlan(args: {
  workspaceRoot: string;
  action: Exclude<HqAction, "status">;
  open?: HqOpenPolicy;
  observability?: HqObservabilityMode;
}): HqLifecyclePlan {
  const scriptPath = "./scripts/dev/hq.sh";
  const scriptArgs = [scriptPath, args.action];

  if (args.open) {
    scriptArgs.push("--open", args.open);
  }

  if (args.observability) {
    scriptArgs.push("--observability", args.observability);
  }

  return {
    cmd: "bash",
    args: scriptArgs,
    cwd: path.resolve(args.workspaceRoot),
  };
}

export async function runHqLifecycle(plan: HqLifecyclePlan): Promise<number> {
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
