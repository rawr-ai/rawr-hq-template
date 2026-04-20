import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createClient } from "../src";
import type { RawrConfig } from "../src/service/modules/config/entities";
import { validateRawrConfig } from "../src/service/modules/config/support.js";
import { createClientOptions, invocation, writeGlobalRawrConfig, writeRawrConfig } from "./helpers";

describe("hq-ops config support", () => {
  it("accepts a minimal v1 config", () => {
    const r = validateRawrConfig({ version: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.version).toBe(1);
    expect(r.config.plugins?.channels?.workspace?.enabled).toBe(true);
    expect(r.config.plugins?.channels?.external?.enabled).toBe(false);
  });

  it("allows missing optional fields", () => {
    const r = validateRawrConfig({ version: 1, plugins: {} });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.plugins?.channels?.workspace?.enabled).toBe(true);
      expect(r.config.plugins?.channels?.external?.enabled).toBe(false);
    }
  });

  it("accepts plugin channel policy controls", () => {
    const r = validateRawrConfig({
      version: 1,
      plugins: {
        channels: {
          workspace: { enabled: true },
          external: { enabled: true },
        },
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.plugins?.channels?.workspace?.enabled).toBe(true);
      expect(r.config.plugins?.channels?.external?.enabled).toBe(true);
    }
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

  it("accepts sync providers/destinations and normalizes enabled=true", () => {
    const r = validateRawrConfig({
      version: 1,
      sync: {
        providers: {
          codex: { destinations: [{ id: "primary", rootPath: "/tmp/codex" }] },
          claude: { destinations: [{ id: "local", rootPath: "/tmp/claude", enabled: false }] },
        },
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.sync?.providers?.codex?.destinations?.[0]?.enabled).toBe(true);
    expect(r.config.sync?.providers?.claude?.destinations?.[0]?.enabled).toBe(false);
  });

  it("merges layered sync config through the config service", async () => {
    const globalConfig = {
      version: 1,
      sync: {
        sources: { paths: ["/a", "/b"] },
        providers: {
          codex: { destinations: [{ id: "codex", rootPath: "/g/codex", enabled: false }] },
        },
      },
    } satisfies RawrConfig;
    const workspaceConfig = {
      version: 1,
      sync: {
        sources: { paths: ["/b", "/c"] },
        providers: {
          codex: { destinations: [{ id: "codex", enabled: true }, { id: "codex2", rootPath: "/w/codex2" }] },
        },
      },
    } satisfies RawrConfig;
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-ops-config-"));
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-hq-ops-home-"));
    await writeGlobalRawrConfig(homeDir, globalConfig);
    await writeRawrConfig(repoRoot, workspaceConfig);
    const client = createClient(createClientOptions({ repoRoot, homeDir }));

    const result = await client.config.getLayeredConfig({}, invocation("trace-config-layered"));
    const merged = result.merged;
    expect(merged).not.toBeNull();
    expect(merged?.sync?.sources?.paths).toEqual(["/a", "/b", "/c"]);

    const dests = merged?.sync?.providers?.codex?.destinations ?? [];
    expect(dests.map((d) => d.id)).toEqual(["codex", "codex2"]);
    expect(dests.find((d) => d.id === "codex")?.rootPath).toBe("/g/codex");
    expect(dests.find((d) => d.id === "codex")?.enabled).toBe(true);
    expect(dests.find((d) => d.id === "codex2")?.rootPath).toBe("/w/codex2");
    expect(dests.find((d) => d.id === "codex2")?.enabled).toBe(true);
  });
});
