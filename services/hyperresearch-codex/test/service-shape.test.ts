import fs from "node:fs/promises";
import { dirname } from "node:path";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as publicApi from "../src";
import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { router } from "../src/router";
import { contract } from "../src/service/contract";
import { createClientOptions } from "./helpers";

describe("hyperresearch-codex service shell", () => {
  it("keeps the public boundary and root contract aligned with the service-package shape", () => {
    expect(typeof createClient).toBe("function");
    expect(createClient(createClientOptions())).toBeDefined();
    expect(router).toBeDefined();
    expect(Object.keys(contract)).toEqual(["fixtures", "runs"]);
    expect(Object.keys(contract.fixtures)).toEqual(["runSyntheticSlice"]);
    expect(Object.keys(contract.runs)).toEqual([
      "startV8Run",
      "advanceV8Run",
      "inspectV8Run",
      "validateV8Run",
    ]);
  });

  it("keeps package mechanics behind explicit service modules", async () => {
    expect(Object.keys(publicApi).sort()).toEqual(["createClient", "router"]);

    const srcDir = path.resolve(dirname(fileURLToPath(import.meta.url)), "../src");
    const rootTsFiles = (await fs.readdir(srcDir)).filter((entry) => entry.endsWith(".ts")).sort();

    expect(rootTsFiles).toEqual(["client.ts", "index.ts", "router.ts", "types.ts"]);
  });

  it("rejects generic module buckets, module-root implementation files, and top-level common helpers", async () => {
    const serviceDir = path.resolve(dirname(fileURLToPath(import.meta.url)), "../src/service");
    const moduleDir = path.join(serviceDir, "modules");
    const commonDir = path.join(serviceDir, "common");
    const moduleNames = (await fs.readdir(moduleDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    expect(moduleNames).toEqual(["fixtures", "runs"]);
    await expect(fs.stat(path.join(moduleDir, "common"))).rejects.toThrow();
    await expect(fs.stat(path.join(moduleDir, "runtime"))).rejects.toThrow();

    for (const moduleName of moduleNames) {
      const entries = (await fs.readdir(path.join(moduleDir, moduleName))).sort();
      expect(entries).toEqual([
        "contract.ts",
        "helpers",
        "middleware.ts",
        "module.ts",
        "router.ts",
      ]);
      expect(entries).not.toContain("services");
      expect(entries).not.toContain("runner.ts");
      expect(entries).not.toContain("v8-runner.ts");
    }

    expect((await fs.readdir(commonDir)).sort()).toEqual([
      "adapters",
      "entities.ts",
      "resources.ts",
    ]);
    await expect(fs.stat(path.join(commonDir, "helpers"))).rejects.toThrow();
  });
});
