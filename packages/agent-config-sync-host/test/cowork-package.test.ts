import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import yauzl from "yauzl";

import { packageCoworkPlugin } from "../src/cowork-package";
import { scanSourcePlugin } from "../src/scan-source-plugin";
import type { HostSourcePlugin } from "../src/types";

const tempDirs: string[] = [];

async function makeSourcePlugin(): Promise<HostSourcePlugin> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-cowork-src-"));
  tempDirs.push(root);

  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        name: "@rawr/plugin-demo",
        version: "9.9.9",
        description: "Demo plugin for Cowork",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  await fs.mkdir(path.join(root, "workflows"), { recursive: true });
  await fs.writeFile(path.join(root, "workflows", "alpha.md"), "# alpha", "utf8");

  await fs.mkdir(path.join(root, "skills", "skill-a"), { recursive: true });
  await fs.writeFile(path.join(root, "skills", "skill-a", "SKILL.md"), "# skill-a", "utf8");

  await fs.mkdir(path.join(root, "scripts"), { recursive: true });
  await fs.writeFile(path.join(root, "scripts", "helper.py"), "print('x')", "utf8");

  await fs.mkdir(path.join(root, "agents"), { recursive: true });
  await fs.writeFile(path.join(root, "agents", "assistant.md"), "# assistant", "utf8");

  return {
    ref: "demo",
    absPath: root,
    dirName: "demo-plugin",
    packageName: "@rawr/plugin-demo",
    version: "9.9.9",
    description: "Demo plugin for Cowork",
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

async function readZipEntries(zipPath: string): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) return reject(error ?? new Error("Failed to open zip"));
      const files = new Map<string, Buffer>();

      zipFile.readEntry();
      zipFile.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipFile.readEntry();
          return;
        }
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            return reject(streamError ?? new Error("Missing stream"));
          }
          const chunks: Buffer[] = [];
          stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on("end", () => {
            files.set(entry.fileName, Buffer.concat(chunks));
            zipFile.readEntry();
          });
        });
      });

      zipFile.on("end", () => resolve(files));
      zipFile.on("error", reject);
    });
  });
}

describe("packageCoworkPlugin", () => {
  it("builds a zip archive with claude-compatible structure", async () => {
    const sourcePlugin = await makeSourcePlugin();
    const content = await scanSourcePlugin(sourcePlugin);

    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-cowork-out-"));
    tempDirs.push(outDir);

    const result = await packageCoworkPlugin({
      sourcePlugin,
      content,
      outDirAbs: outDir,
      dryRun: false,
      includeAgents: true,
    });

    expect(result.action).toBe("written");

    const zipFiles = await readZipEntries(result.outFile);
    expect(zipFiles.has(".claude-plugin/plugin.json")).toBe(true);
    expect(zipFiles.has("commands/alpha.md")).toBe(true);
    expect(zipFiles.has("skills/skill-a/SKILL.md")).toBe(true);
    expect(zipFiles.has("scripts/helper.py")).toBe(true);
    expect(zipFiles.has("agents/assistant.md")).toBe(true);

    const pluginJson = JSON.parse(String(zipFiles.get(".claude-plugin/plugin.json") ?? ""));
    expect(pluginJson.name).toBe("demo-plugin");
    expect(pluginJson.version).toBe("9.9.9");
  });

  it("can omit agents when includeAgents=false", async () => {
    const sourcePlugin = await makeSourcePlugin();
    const content = await scanSourcePlugin(sourcePlugin);

    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-cowork-out-"));
    tempDirs.push(outDir);

    const result = await packageCoworkPlugin({
      sourcePlugin,
      content,
      outDirAbs: outDir,
      dryRun: false,
      includeAgents: false,
    });

    const zipFiles = await readZipEntries(result.outFile);
    expect(zipFiles.has("agents/assistant.md")).toBe(false);
  });
});
