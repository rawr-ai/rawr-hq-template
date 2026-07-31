import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createClient } from "../../../../src";
import { validateRawrConfig } from "../../../../src/service/modules/config/model/policy/config-validation.js";
import {
  type AnalyticsEntry,
  createClientOptions,
  createTestHqOpsResources,
  invocation,
  type LogEntry,
  writeGlobalRawrConfig,
  writeRawrConfig,
} from "../../../support/service/helpers";

describe("hq-ops config support", () => {
  it("records one successful lifecycle for a missing workspace config", async () => {
    const analytics: AnalyticsEntry[] = [];
    const logs: LogEntry[] = [];
    const resources = createTestHqOpsResources();
    resources.fs.stat = async () => null;
    const client = createClient(
      createClientOptions({
        analytics,
        logs,
        repoRoot: "/repo/rawr",
        resources,
      })
    );

    await expect(
      client.config.getWorkspaceConfig({}, invocation("trace-config-workspace"))
    ).resolves.toEqual({
      config: null,
      path: null,
      warnings: [],
    });

    const procedureAnalytics = analytics.filter(
      (entry) =>
        entry.event === "orpc.procedure" &&
        entry.payload.path === "config.getWorkspaceConfig" &&
        entry.payload.outcome === "success"
    );
    const procedureLogs = logs.filter(
      (entry) =>
        entry.level === "info" &&
        entry.event === "hq-ops.procedure" &&
        entry.payload.path === "config.getWorkspaceConfig" &&
        entry.payload.outcome === "success"
    );

    expect(procedureAnalytics).toHaveLength(1);
    expect(procedureLogs).toHaveLength(1);
  });

  it("accepts a minimal v1 config", () => {
    const r = validateRawrConfig({ version: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.version).toBe(1);
    expect(r.config).not.toHaveProperty("plugins");
  });

  it("rejects the retired plugins policy bag", () => {
    const r = validateRawrConfig({ version: 1, plugins: {} });
    expect(r.ok).toBe(false);
  });

  it("rejects the retired plugin risk default", () => {
    const r = validateRawrConfig({
      version: 1,
      plugins: {
        defaultRiskTolerance: "balanced",
      },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown versions", () => {
    const r = validateRawrConfig({ version: 2 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.some((i) => i.path === "version")).toBe(true);
  });

  it("clamps journal semantic candidateLimit into 1..500 and defaults to 200", () => {
    const r1 = validateRawrConfig({ version: 1, journal: { semantic: {} } });
    expect(r1.ok).toBe(true);
    if (r1.ok) expect(r1.config.journal?.semantic?.candidateLimit).toBe(200);

    const r2 = validateRawrConfig({ version: 1, journal: { semantic: { candidateLimit: 9999 } } });
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.config.journal?.semantic?.candidateLimit).toBe(500);

    const r3 = validateRawrConfig({ version: 1, journal: { semantic: { candidateLimit: -10 } } });
    expect(r3.ok).toBe(true);
    if (r3.ok) expect(r3.config.journal?.semantic?.candidateLimit).toBe(1);
  });

  it("rejects the retired sync authority bag", () => {
    const r = validateRawrConfig({
      version: 1,
      sync: {
        providers: {
          codex: { destinations: [{ id: "primary", rootPath: "/tmp/codex" }] },
          claude: { destinations: [{ id: "local", rootPath: "/tmp/claude", enabled: false }] },
        },
      },
    });
    expect(r.ok).toBe(false);
  });

  it("merges only the remaining repository-neutral config", async () => {
    const globalConfig = {
      version: 1,
      journal: { semantic: { candidateLimit: 25 } },
      server: { port: 4100 },
    } as const;
    const workspaceConfig = {
      version: 1,
      server: { baseUrl: "http://127.0.0.1:4100" },
    } as const;
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-ops-config-"));
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-ops-home-"));
    await writeGlobalRawrConfig(homeDir, globalConfig);
    await writeRawrConfig(repoRoot, workspaceConfig);
    const client = createClient(createClientOptions({ repoRoot, homeDir }));

    const result = await client.config.getLayeredConfig({}, invocation("trace-config-layered"));
    const merged = result.merged;
    expect(merged).not.toBeNull();
    expect(merged).not.toHaveProperty("plugins");
    expect(merged?.journal?.semantic?.candidateLimit).toBe(25);
    expect(merged?.server).toEqual({ port: 4100, baseUrl: "http://127.0.0.1:4100" });
  });
});
