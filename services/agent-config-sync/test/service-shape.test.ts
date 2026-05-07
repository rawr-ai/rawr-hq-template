import { readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createClient } from "../src/client";
import { contract } from "../src/service/contract";
import { router } from "../src/router";
import {
  beginPluginsSyncUndoCapture,
  PLUGINS_SYNC_UNDO_PROVIDER,
} from "../src/undo";
import { createClientOptions } from "./helpers";

const serviceModulesRoot = new URL("../src/service/modules/", import.meta.url);
const serviceModuleNames = ["planning", "execution", "retirement", "undo"];
const moduleRepositoryFiles = new Map([
  ["planning", new Set(["source-plugin-repository.ts", "workspace-root-repository.ts"])],
  ["execution", new Set([
    "claude-destination-sync-repository.ts",
    "codex-destination-sync-repository.ts",
    "codex-native-agent-role-repository.ts",
  ])],
  ["retirement", new Set([
    "claude-retirement-repository.ts",
    "codex-cleanup-behind-repository.ts",
    "codex-retirement-repository.ts",
  ])],
  ["undo", new Set(["capsule-capture-repository.ts", "capsule-store-repository.ts", "path-snapshot-repository.ts"])],
]);
const forbiddenModuleDirs = new Set([
  "helpers",
  "operations",
  "procedures",
  "support",
  "utils",
  "common",
  "shared",
  "internal",
]);

describe("agent-config-sync service shell", () => {
  it("keeps the public boundary and root contract intact", () => {
    expect(typeof createClient).toBe("function");
    expect(createClient(createClientOptions())).toBeDefined();
    expect(router).toBeDefined();
    expect(Object.keys(contract)).toEqual(["planning", "execution", "retirement", "undo"]);
    expect(Object.keys(contract.planning)).toEqual([
      "planWorkspaceSync",
      "assessWorkspaceSync",
      "evaluateFullSyncPolicy",
    ]);
    expect(Object.keys(contract.execution)).toEqual([
      "runSync",
      "syncCodexNativeAgentRoles",
      "resolveProviderContent",
    ]);
    expect(Object.keys(contract.retirement)).toEqual(["retireStaleManaged", "cleanupBehindProviderSync"]);
    expect(Object.keys(contract.undo)).toEqual(["runUndo"]);
  });

  it("keeps the undo public helper export intact", () => {
    expect(typeof beginPluginsSyncUndoCapture).toBe("function");
    expect(PLUGINS_SYNC_UNDO_PROVIDER).toBe("plugins.sync");
  });

  it("keeps module routers native and prevents helper-bucket drift", async () => {
    for (const moduleName of serviceModuleNames) {
      const moduleUrl = new URL(`${moduleName}/`, serviceModulesRoot);
      const moduleEntries = await readdir(moduleUrl, { withFileTypes: true });
      const moduleEntryNames = new Set(moduleEntries.map((entry) => entry.name));

      for (const forbidden of forbiddenModuleDirs) {
        expect(moduleEntryNames.has(forbidden), `${moduleName} must not have ${forbidden}/`).toBe(false);
      }

      expect(moduleEntryNames.has("router.ts"), `${moduleName} must not mix router.ts with router/`).toBe(false);
      expect(moduleEntryNames.has("router"), `${moduleName} must use router/index.ts`).toBe(true);

      const routerEntries = await readdir(new URL(`${moduleName}/router/`, serviceModulesRoot), {
        withFileTypes: true,
      });
      expect(routerEntries.every((entry) => entry.isFile()), `${moduleName}/router must not contain subdirectories`).toBe(true);
      expect(routerEntries.some((entry) => entry.name.endsWith(".router.ts")), `${moduleName}/router needs fragments`).toBe(true);
      expect(
        routerEntries.every((entry) => /^(index|[a-z0-9-]+\.router)\.ts$/u.test(entry.name)),
        `${moduleName}/router only allows index.ts and *.router.ts`,
      ).toBe(true);

      const allowedRepositories = moduleRepositoryFiles.get(moduleName) ?? new Set<string>();
      if (allowedRepositories.size > 0) {
        expect(moduleEntryNames.has("repositories"), `${moduleName} keeps only real repositories`).toBe(true);
        const repositoryEntries = await readdir(new URL(`${moduleName}/repositories/`, serviceModulesRoot), {
          withFileTypes: true,
        });
        const repositoryNames = new Set(repositoryEntries.map((entry) => entry.name));
        expect(
          repositoryEntries.every((entry) =>
            entry.isFile() &&
            /^[a-z0-9-]+-repository\.ts$/u.test(entry.name) &&
            allowedRepositories.has(entry.name)
          ),
          `${moduleName}/repositories only allows explicit real *-repository.ts files`,
        ).toBe(true);
        expect(repositoryNames, `${moduleName}/repositories must not hide fake repositories`).toEqual(allowedRepositories);
      } else {
        expect(moduleEntryNames.has("repositories"), `${moduleName} has no real repositories`).toBe(false);
      }
    }
  });
});
