import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanSourcePlugin } from "../src/lib/scan-source-plugin";
import type { SourcePlugin } from "../src/lib/types";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("scanSourcePlugin", () => {
  it("includes only canonical skills/workflows/scripts", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-scan-"));
    tempDirs.push(root);

    await fs.mkdir(path.join(root, "skills", "good", "references"), { recursive: true });
    await fs.writeFile(path.join(root, "skills", "good", "SKILL.md"), "# skill", "utf8");
    await fs.writeFile(path.join(root, "skills", "good", "references", "note.md"), "x", "utf8");

    await fs.mkdir(path.join(root, "skills", "bad"), { recursive: true });
    await fs.writeFile(path.join(root, "skills", "bad", "not-skill.md"), "x", "utf8");

    await fs.mkdir(path.join(root, "workflows"), { recursive: true });
    await fs.writeFile(path.join(root, "workflows", "sync.md"), "# wf", "utf8");
    await fs.writeFile(path.join(root, "workflows", "ignore.txt"), "x", "utf8");

    await fs.mkdir(path.join(root, "scripts"), { recursive: true });
    await fs.writeFile(path.join(root, "scripts", "helper.sh"), "echo hi", "utf8");

    await fs.mkdir(path.join(root, "agents"), { recursive: true });
    await fs.writeFile(path.join(root, "agents", "assistant.md"), "# agent", "utf8");
    await fs.writeFile(path.join(root, "agents", "ignore.txt"), "x", "utf8");

    await fs.mkdir(path.join(root, "src", "commands"), { recursive: true });
    await fs.writeFile(path.join(root, "src", "commands", "internal.ts"), "// internal", "utf8");

    const source: SourcePlugin = {
      ref: "demo",
      absPath: root,
      dirName: "demo",
      packageName: "@rawr/plugin-demo",
    };

    const scanned = await scanSourcePlugin(source);
    expect(scanned.skills.map((s) => s.name)).toEqual(["good"]);
    expect(scanned.workflowFiles.map((w) => w.name)).toEqual(["sync"]);
    expect(scanned.scripts.map((s) => s.name)).toEqual(["helper.sh"]);
    expect(scanned.agentFiles.map((a) => a.name)).toEqual(["assistant"]);
  });

  it("respects package.json#rawr.pluginContent.contentRoot", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-scan-root-"));
    tempDirs.push(root);

    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "@rawr/plugin-demo", rawr: { pluginContent: { version: 1, contentRoot: "content" } } }, null, 2),
      "utf8",
    );

    const contentRoot = path.join(root, "content");
    await fs.mkdir(path.join(contentRoot, "workflows"), { recursive: true });
    await fs.writeFile(path.join(contentRoot, "workflows", "x.md"), "# x", "utf8");

    const source: SourcePlugin = {
      ref: "demo",
      absPath: root,
      dirName: "demo",
      packageName: "@rawr/plugin-demo",
    };

    const scanned = await scanSourcePlugin(source);
    expect(scanned.workflowFiles.map((w) => w.name)).toEqual(["x"]);
  });
});
