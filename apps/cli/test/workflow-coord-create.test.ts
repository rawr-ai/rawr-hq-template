import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function runRawr(args: string[]) {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return spawnSync("bun", ["src/index.ts", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

describe("workflow coord create", () => {
  it("supports --dry-run with planned workflow payload", () => {
    const proc = runRawr(["workflow", "coord", "create", "--id", "wf-cli", "--json", "--dry-run"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.planned.procedure).toBe("coordination.saveWorkflow");
    expect(parsed.data.planned.rpcPath).toBe("/rpc/coordination/saveWorkflow");
    expect(parsed.data.workflow.workflowId).toBe("wf-cli");
  });
});
