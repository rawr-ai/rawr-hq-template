import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { evaluateLifecycleCompleteness } from "../src/lib/plugins-lifecycle/lifecycle";

const tempDirs: string[] = [];

async function makeTemp(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("evaluateLifecycleCompleteness", () => {
  it("fails when code changed without tests/docs/dependents updates", async () => {
    const workspaceRoot = await makeTemp("plugins-lifecycle-");
    const targetAbs = path.join(workspaceRoot, "plugins", "cli", "demo");
    await fs.mkdir(path.join(targetAbs, "src"), { recursive: true });
    await fs.writeFile(path.join(targetAbs, "package.json"), JSON.stringify({ name: "@rawr/plugin-demo" }), "utf8");
    await fs.writeFile(path.join(targetAbs, "src", "index.ts"), "export const x = 1;\n", "utf8");

    const dependentFile = path.join(workspaceRoot, "docs", "system", "DEMO.md");
    await fs.mkdir(path.dirname(dependentFile), { recursive: true });
    await fs.writeFile(dependentFile, "@rawr/plugin-demo\n", "utf8");

    const result = await evaluateLifecycleCompleteness({
      workspaceRoot,
      targetInput: "demo",
      targetAbs,
      type: "cli",
      changedFiles: ["plugins/cli/demo/src/index.ts"],
      repoFiles: ["plugins/cli/demo/src/index.ts", "plugins/cli/demo/package.json", "docs/system/DEMO.md"],
      syncVerified: true,
      driftVerified: true,
      driftDetected: false,
    });

    expect(result.status).toBe("fail");
    expect(result.missingTests.length).toBeGreaterThan(0);
    expect(result.missingDocs.length).toBeGreaterThan(0);
    expect(result.missingDependents).toContain("docs/system/DEMO.md");
  });

  it("passes when tests/docs/dependents are updated", async () => {
    const workspaceRoot = await makeTemp("plugins-lifecycle-");
    const targetAbs = path.join(workspaceRoot, "plugins", "cli", "demo");
    await fs.mkdir(path.join(targetAbs, "src"), { recursive: true });
    await fs.mkdir(path.join(targetAbs, "test"), { recursive: true });
    await fs.writeFile(path.join(targetAbs, "package.json"), JSON.stringify({ name: "@rawr/plugin-demo" }), "utf8");
    await fs.writeFile(path.join(targetAbs, "src", "index.ts"), "export const x = 1;\n", "utf8");
    await fs.writeFile(path.join(targetAbs, "README.md"), "# demo\n", "utf8");
    await fs.writeFile(path.join(targetAbs, "test", "plugin.test.ts"), "export {};\n", "utf8");

    const dependentFile = path.join(workspaceRoot, "docs", "system", "DEMO.md");
    await fs.mkdir(path.dirname(dependentFile), { recursive: true });
    await fs.writeFile(dependentFile, "@rawr/plugin-demo\n", "utf8");

    const result = await evaluateLifecycleCompleteness({
      workspaceRoot,
      targetInput: "demo",
      targetAbs,
      type: "cli",
      changedFiles: [
        "plugins/cli/demo/src/index.ts",
        "plugins/cli/demo/test/plugin.test.ts",
        "plugins/cli/demo/README.md",
        "docs/system/DEMO.md",
      ],
      repoFiles: [
        "plugins/cli/demo/src/index.ts",
        "plugins/cli/demo/package.json",
        "plugins/cli/demo/README.md",
        "plugins/cli/demo/test/plugin.test.ts",
        "docs/system/DEMO.md",
      ],
      syncVerified: true,
      driftVerified: true,
      driftDetected: false,
    });

    expect(result.status).toBe("pass");
    expect(result.missingTests).toEqual([]);
    expect(result.missingDocs).toEqual([]);
    expect(result.missingDependents).toEqual([]);
  });
});
