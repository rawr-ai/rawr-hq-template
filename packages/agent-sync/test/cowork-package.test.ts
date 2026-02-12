import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import yauzl from "yauzl";

import { scanSourcePlugin } from "../src/lib/scan-source-plugin";
import { packageCoworkPlugin } from "../src/lib/cowork-package";
import type { SourcePlugin } from "../src/lib/types";

const tempDirs: string[] = [];

async function makeSourcePlugin(): Promise<SourcePlugin> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-cowork-src-"));
  tempDirs.push(root);

  await fs.writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "@rawr/plugin-demo", version: "9.9.9", description: "Demo plugin for Cowork" }, null, 2) + "\n",
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
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function readZipEntries(zipPath: string): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err ?? new Error("Failed to open zip"));
      const files = new Map<string, Buffer>();

      zip.readEntry();
      zip.on("entry", (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) return reject(err2 ?? new Error("Missing stream"));
          const chunks: Buffer[] = [];
          stream.on("data", (d) => chunks.push(Buffer.from(d)));
          stream.on("end", () => {
            files.set(entry.fileName, Buffer.concat(chunks));
            zip.readEntry();
          });
        });
      });

      zip.on("end", () => resolve(files));
      zip.on("error", reject);
    });
  });
}

describe("packageCoworkPlugin", () => {
  it("builds a .zip archive with claude-compatible structure", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);

    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-cowork-out-"));
    tempDirs.push(outDir);

    const res = await packageCoworkPlugin({
      sourcePlugin: source,
      content,
      outDirAbs: outDir,
      dryRun: false,
      includeAgents: true,
    });

    expect(res.action).toBe("written");
    expect(res.outFile.endsWith(".zip")).toBe(true);

    const zipFiles = await readZipEntries(res.outFile);
    expect(zipFiles.has(".claude-plugin/plugin.json")).toBe(true);
    expect(zipFiles.has("commands/alpha.md")).toBe(true);
    expect(zipFiles.has("skills/skill-a/SKILL.md")).toBe(true);
    expect(zipFiles.has("scripts/helper.py")).toBe(true);
    expect(zipFiles.has("agents/assistant.md")).toBe(true);

    const pluginJson = JSON.parse(String(zipFiles.get(".claude-plugin/plugin.json") ?? ""));
    expect(pluginJson.name).toBe("demo-plugin");
    expect(pluginJson.version).toBe("9.9.9");
    expect(pluginJson.description).toBe("Demo plugin for Cowork");
  });

  it("can omit agents when includeAgents=false", async () => {
    const source = await makeSourcePlugin();
    const content = await scanSourcePlugin(source);

    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-cowork-out-"));
    tempDirs.push(outDir);

    const res = await packageCoworkPlugin({
      sourcePlugin: source,
      content,
      outDirAbs: outDir,
      dryRun: false,
      includeAgents: false,
    });

    const zipFiles = await readZipEntries(res.outFile);
    expect(zipFiles.has("agents/assistant.md")).toBe(false);
  });
});
