import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tempDirs: string[] = [];
const seamStatuses = new Set([
  "owner-file-missing",
  "owner-file-empty",
  "owner-current-instance",
  "owner-other-instance",
]);

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) await fs.rm(dir, { recursive: true, force: true });
  }
});

type DoctorGlobalPayload = {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: {
    code?: string;
    details?: Record<string, unknown>;
  };
};

function extractDiagnostics(parsed: DoctorGlobalPayload): Record<string, unknown> {
  if (parsed.ok && parsed.data) return parsed.data;
  return (parsed.error?.details ?? {}) as Record<string, unknown>;
}

describe("rawr doctor global", () => {
  it("returns machine-readable diagnostics", () => {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const proc = spawnSync("bun", ["src/index.ts", "doctor", "global", "--json"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env },
    });

    expect(proc.status).not.toBeNull();
    expect([0, 1]).toContain(proc.status as number);
    expect(proc.stdout).toBeTruthy();

    const parsed = JSON.parse(proc.stdout) as DoctorGlobalPayload;
    expect(typeof parsed.ok).toBe("boolean");

    const details = extractDiagnostics(parsed);
    expect(details.recommendedMode).toBe("bun-symlink");
    expect(typeof details.bunGlobalRawrPath).toBe("string");
    expect(typeof details.ownerFilePath).toBe("string");
    expect(typeof details.ownerFileExists).toBe("boolean");
    expect(typeof details.currentInstanceRoot).toBe("string");
    expect(typeof details.aliasInstanceSeamStatus).toBe("string");
    expect(seamStatuses.has(String(details.aliasInstanceSeamStatus))).toBe(true);

    const commandSurfaces = details.commandSurfaces as Record<string, unknown>;
    expect(commandSurfaces.externalCliPlugins).toBe("rawr plugins ...");
    expect(commandSurfaces.workspaceRuntimePlugins).toBe("rawr plugins web ...");

    if (!parsed.ok) {
      expect(parsed.error?.code).toBe("GLOBAL_RAWR_MISCONFIGURED");
    }
  }, 30_000);

  it("reports explicit owner-other-instance seam when owner file points elsewhere", async () => {
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "rawr-cli-doctor-owner-"));
    tempDirs.push(tmpHome);

    const ownerDir = path.join(tmpHome, ".rawr");
    await fs.mkdir(ownerDir, { recursive: true });
    const otherInstanceRoot = path.join(tmpHome, "other-instance");
    await fs.mkdir(otherInstanceRoot, { recursive: true });
    await fs.writeFile(path.join(ownerDir, "global-rawr-owner-path"), `${otherInstanceRoot}\n`, "utf8");

    const proc = spawnSync("bun", ["src/index.ts", "doctor", "global", "--json"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: { ...process.env, HOME: tmpHome },
    });

    expect(proc.status).not.toBeNull();
    expect([0, 1]).toContain(proc.status as number);
    expect(proc.stdout).toBeTruthy();

    const parsed = JSON.parse(proc.stdout) as DoctorGlobalPayload;
    const details = extractDiagnostics(parsed);

    expect(details.ownerFileExists).toBe(true);
    expect(details.ownerWorkspacePath).toBe(path.resolve(otherInstanceRoot));
    expect(details.ownerMatchesCurrentInstanceByRealpath).toBe(false);
    expect(details.aliasInstanceSeamStatus).toBe("owner-other-instance");
  }, 30_000);
});
