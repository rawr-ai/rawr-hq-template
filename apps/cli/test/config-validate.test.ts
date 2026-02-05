import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

function cliEntrypoint(): string {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  return path.join(projectRoot, "src", "index.ts");
}

function runRawrInWorkspace(workspaceRoot: string, args: string[]) {
  return spawnSync("bun", [cliEntrypoint(), ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: { ...process.env },
  });
}

async function makeWorkspace(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-ws-"));
  await fs.mkdir(path.join(dir, "plugins"), { recursive: true });
  await fs.writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "tmp-ws", private: true }, null, 2), "utf8");
  return dir;
}

describe("rawr config validate", () => {
  it("exits 0 when no rawr.config.ts exists", async () => {
    const ws = await makeWorkspace();
    const proc = runRawrInWorkspace(ws, ["config", "validate", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.ok).toBe(true);
    expect(parsed.data.path).toBeNull();
  });

  it("exits 0 for a valid config", async () => {
    const ws = await makeWorkspace();
    await fs.writeFile(
      path.join(ws, "rawr.config.ts"),
      `export default { version: 1, plugins: { defaultRiskTolerance: "off" } };`,
      "utf8",
    );
    const proc = runRawrInWorkspace(ws, ["config", "validate", "--json"]);
    expect(proc.status).toBe(0);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(true);
    expect(parsed.data.ok).toBe(true);
    expect(parsed.data.path).toMatch(/rawr\.config\.ts$/);
  });

  it("exits 1 for an invalid config", async () => {
    const ws = await makeWorkspace();
    await fs.writeFile(path.join(ws, "rawr.config.ts"), `export default { version: 2 };`, "utf8");
    const proc = runRawrInWorkspace(ws, ["config", "validate", "--json"]);
    expect(proc.status).toBe(1);
    const parsed = JSON.parse(proc.stdout) as any;
    expect(parsed.ok).toBe(false);
  });
});
