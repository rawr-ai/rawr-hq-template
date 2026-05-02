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
    expect(Object.keys(contract)).toEqual(["runtime"]);
    expect(Object.keys(contract.runtime)).toEqual([
      "runSyntheticSlice",
      "startV8Run",
      "advanceV8Run",
      "inspectV8Run",
      "validateV8Run",
    ]);
  });

  it("keeps runtime mechanics behind the service module boundary", async () => {
    expect(Object.keys(publicApi).sort()).toEqual(["createClient", "router"]);

    const srcDir = path.resolve(dirname(fileURLToPath(import.meta.url)), "../src");
    const rootTsFiles = (await fs.readdir(srcDir))
      .filter((entry) => entry.endsWith(".ts"))
      .sort();

    expect(rootTsFiles).toEqual([
      "client.ts",
      "index.ts",
      "router.ts",
      "types.ts",
    ]);
  });
});
