import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createNodeAgentConfigSyncHostBoundary } from "../src/boundary";
import { loadCodexRegistry } from "../src/registry-codex";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("agent-config-sync host boundary", () => {
  it("creates the full host boundary with concrete runtime adapters", () => {
    const boundary = createNodeAgentConfigSyncHostBoundary();

    expect(typeof boundary.deps.fs.readJsonFile).toBe("function");
    expect(typeof boundary.deps.workspace.findWorkspaceRoot).toBe("function");
    expect(typeof boundary.deps.scanning.scanSourcePlugin).toBe("function");
    expect(typeof boundary.deps.targets.resolveTargets).toBe("function");
    expect(typeof boundary.deps.codexRegistry.loadCodexRegistry).toBe("function");
    expect(typeof boundary.deps.claudeManifests.writeClaudeSyncManifest).toBe("function");
    expect(typeof boundary.deps.packaging.packageCoworkPlugin).toBe("function");
    expect(typeof boundary.deps.claudeExecution.installAndEnableClaudePlugin).toBe("function");
  });

  it("loads an empty codex registry through the composed adapter surface", async () => {
    const codexHome = await fs.mkdtemp(path.join(os.tmpdir(), "agent-config-sync-host-"));
    tempDirs.push(codexHome);

    const registry = await loadCodexRegistry(codexHome);
    expect(registry.filePath).toContain(path.join("plugins", "registry.json"));
    expect(registry.data.plugins).toEqual([]);
  });
});
