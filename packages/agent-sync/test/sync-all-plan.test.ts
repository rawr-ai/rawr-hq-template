import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { planSyncAll } from "../src/lib/sync-all";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeWorkspace(): Promise<{ root: string }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "agent-sync-plan-"));
  tempDirs.push(root);
  await fs.mkdir(path.join(root, "plugins", "agents"), { recursive: true });
  await fs.mkdir(path.join(root, "plugins", "cli"), { recursive: true });
  await fs.mkdir(path.join(root, "plugins", "web"), { recursive: true });
  await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ name: "workspace" }), "utf8");

  const empty = path.join(root, "plugins", "agents", "empty-plugin");
  await fs.mkdir(empty, { recursive: true });
  await fs.writeFile(path.join(empty, "package.json"), JSON.stringify({ name: "@rawr/empty" }), "utf8");

  const withSkills = path.join(root, "plugins", "agents", "with-skills");
  await fs.mkdir(path.join(withSkills, "skills", "demo-skill"), { recursive: true });
  await fs.writeFile(path.join(withSkills, "package.json"), JSON.stringify({ name: "@rawr/with-skills" }), "utf8");
  await fs.writeFile(path.join(withSkills, "skills", "demo-skill", "SKILL.md"), "# demo", "utf8");

  return { root };
}

describe("planSyncAll", () => {
  it("includes only plugins with canonical content directories", async () => {
    const { root } = await makeWorkspace();
    const plan = await planSyncAll(root);
    expect(plan.workspaceRoot).toBe(root);

    expect(plan.syncable.map((s) => s.sourcePlugin.dirName)).toEqual(["with-skills"]);
    expect(plan.skipped.map((s) => s.dirName)).toContain("empty-plugin");
  });
});
