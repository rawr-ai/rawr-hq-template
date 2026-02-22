import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { getRepoState, statePath } from "../../state/src/repo-state";

const tempDirs: string[] = [];

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoStateModulePath = path.resolve(thisDir, "../../state/src/repo-state.ts");

function bunExecutable(): string {
  if (process.execPath.toLowerCase().includes("bun")) return process.execPath;
  return "bun";
}

async function runEnablePluginInSeparateProcess(repoRoot: string, pluginId: string): Promise<void> {
  const scriptPath = path.join(repoRoot, `enable-plugin-${pluginId.replace(/[^a-z0-9]/gi, "-")}.mjs`);
  const scriptSource = [
    `import { enablePlugin } from ${JSON.stringify(pathToFileURL(repoStateModulePath).href)};`,
    "const [, , targetRepoRoot, targetPluginId] = process.argv;",
    "await enablePlugin(targetRepoRoot, targetPluginId);",
  ].join("\n");

  await fs.writeFile(scriptPath, `${scriptSource}\n`, "utf8");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(bunExecutable(), [scriptPath, repoRoot, pluginId], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`process failed for ${pluginId} with exit code ${code}: ${stderr.trim()}`));
    });
  });
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("storage lock cross-instance contention", () => {
  it("preserves deterministic state writes under concurrent multi-process contention", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-state-cross-instance-"));
    tempDirs.push(repoRoot);

    const pluginIds = Array.from({ length: 16 }, (_, idx) => `@rawr/plugin-proc-${idx}`);
    await Promise.all(pluginIds.map((pluginId) => runEnablePluginInSeparateProcess(repoRoot, pluginId)));

    const state = await getRepoState(repoRoot);
    expect(state.plugins.enabled).toEqual([...pluginIds].sort());

    const persistedRaw = await fs.readFile(statePath(repoRoot), "utf8");
    expect(() => JSON.parse(persistedRaw)).not.toThrow();
  }, 20_000);
});
