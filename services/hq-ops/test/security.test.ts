import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
}));

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    readFile: mockReadFile,
  };
});

vi.mock("../src/security/git.js", () => ({
  getRepoRoot: vi.fn(async (cwd: string) => `${cwd}/.git-root`),
}));

vi.mock("../src/security/audit.js", () => ({
  runBunAudit: vi.fn(async () => ({ findings: [] })),
}));

vi.mock("../src/security/untrusted.js", () => ({
  runBunPmUntrusted: vi.fn(async () => ({ finding: null })),
}));

vi.mock("../src/security/secrets.js", () => ({
  scanSecretsRepo: vi.fn(async () => []),
  scanSecretsStaged: vi.fn(async () => []),
}));

vi.mock("../src/security/report.js", () => ({
  writeSecurityReport: vi.fn(async ({ repoRoot }: { repoRoot: string }) => ({
    reportPath: `${repoRoot}/.rawr/security/latest.json`,
  })),
}));

import { gateEnable, getSecurityReport, securityCheck } from "../src/security/index.js";
import type { SecurityReport } from "../src/security/index.js";
import { getRepoRoot } from "../src/security/git.js";

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockReset();
});

describe("@rawr/hq-ops/security", () => {
  it("exports the public API", () => {
    expect(typeof securityCheck).toBe("function");
    expect(typeof gateEnable).toBe("function");
    expect(typeof getSecurityReport).toBe("function");
  });

  it("SecurityReport type compiles", () => {
    const r: SecurityReport = {
      ok: true,
      findings: [],
      summary: "vulns=0, untrusted=0, secrets=0",
      timestamp: new Date().toISOString(),
      mode: "repo",
    };
    expect(r.ok).toBe(true);
  });

  it("resolves security scans from the provided cwd", async () => {
    const report = await securityCheck({ mode: "repo", cwd: "/tmp/workspace" });

    expect(getRepoRoot).toHaveBeenCalledWith("/tmp/workspace");
    expect(report.reportPath).toContain("/tmp/workspace/.git-root/.rawr/security/latest.json");
  });

  it("propagates the provided cwd through gateEnable", async () => {
    const evaluation = await gateEnable({
      pluginId: "@rawr/plugin-mfe-demo",
      riskTolerance: "off",
      mode: "repo",
      cwd: "/tmp/workspace",
    });

    expect(getRepoRoot).toHaveBeenCalledWith("/tmp/workspace");
    expect(evaluation.allowed).toBe(true);
    expect(evaluation.report.meta?.pluginId).toBe("@rawr/plugin-mfe-demo");
    expect(evaluation.report.reportPath).toContain("/tmp/workspace/.git-root/.rawr/security/latest.json");
  });

  it("reads the last report from the canonical repo root for the provided cwd", async () => {
    mockReadFile.mockResolvedValueOnce(
      JSON.stringify({
        ok: true,
        findings: [],
        summary: "vulns=0, untrusted=0, secrets=0",
        timestamp: new Date().toISOString(),
        mode: "repo",
      }),
    );

    const report = await getSecurityReport({ cwd: "/tmp/workspace" });

    expect(getRepoRoot).toHaveBeenCalledWith("/tmp/workspace");
    expect(mockReadFile).toHaveBeenCalledWith("/tmp/workspace/.git-root/.rawr/security/latest.json", "utf8");
    expect(report?.ok).toBe(true);
  });
});
