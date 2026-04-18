import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scanSourcePlugin } from "../src/scan-source-plugin";
import type { HostSourcePlugin } from "../src/types";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("scanSourcePlugin", () => {
  it("includes only canonical skills, workflows, scripts, and agents", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-scan-"));
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

    const sourcePlugin: HostSourcePlugin = {
      ref: "demo",
      absPath: root,
      dirName: "demo",
      packageName: "@rawr/plugin-demo",
    };

    const scanned = await scanSourcePlugin(sourcePlugin);
    expect(scanned.skills.map((skill) => skill.name)).toEqual(["good"]);
    expect(scanned.workflowFiles.map((workflow) => workflow.name)).toEqual(["sync"]);
    expect(scanned.scripts.map((script) => script.name)).toEqual(["helper.sh"]);
    expect(scanned.agentFiles.map((agent) => agent.name)).toEqual(["assistant"]);
  });

  it("respects package.json#rawr.pluginContent.contentRoot", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-scan-root-"));
    tempDirs.push(root);

    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify(
        {
          name: "@rawr/plugin-demo",
          rawr: { pluginContent: { version: 1, contentRoot: "content" } },
        },
        null,
        2,
      ),
      "utf8",
    );

    const contentRoot = path.join(root, "content");
    await fs.mkdir(path.join(contentRoot, "workflows"), { recursive: true });
    await fs.writeFile(path.join(contentRoot, "workflows", "x.md"), "# x", "utf8");

    const sourcePlugin: HostSourcePlugin = {
      ref: "demo",
      absPath: root,
      dirName: "demo",
      packageName: "@rawr/plugin-demo",
    };

    const scanned = await scanSourcePlugin(sourcePlugin);
    expect(scanned.workflowFiles.map((workflow) => workflow.name)).toEqual(["x"]);
  });
});
