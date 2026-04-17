import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runBunAudit } from "./audit";
import { getRepoRoot } from "./git";
import { writeSecurityReport } from "./report";
import { scanSecretsRepo, scanSecretsStaged } from "./secrets";
import { runBunPmUntrusted } from "./untrusted";

export type SecurityMode = "staged" | "repo";
export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export type VulnerabilityFinding = {
  kind: "vulnerability";
  severity: FindingSeverity;
  packageName: string;
  title: string;
  url?: string;
  advisoryId?: number;
  vulnerableVersions?: string;
  cvssScore?: number;
  cwe?: string[];
};

export type UntrustedDependencyScriptsFinding = {
  kind: "untrustedDependencyScripts";
  severity: "high";
  count: number;
  rawOutput?: string;
};

export type SecretFinding = {
  kind: "secret";
  severity: "high" | "critical";
  path: string;
  patternId: string;
  match: string;
  index: number;
};

export type ToolErrorFinding = {
  kind: "toolError";
  severity: "high";
  tool: string;
  message: string;
  rawOutput?: string;
};

export type SecurityFinding =
  | VulnerabilityFinding
  | UntrustedDependencyScriptsFinding
  | SecretFinding
  | ToolErrorFinding;

export type SecurityReport = {
  ok: boolean;
  findings: SecurityFinding[];
  summary: string;
  timestamp: string;
  mode: SecurityMode;
  meta?: {
    pluginId?: string;
    repoRoot?: string;
  };
};

export type RiskTolerance = "strict" | "balanced" | "permissive" | "off";

export type GateEnableResult = {
  allowed: boolean;
  report: SecurityReport & { reportPath?: string };
  requiresForce: boolean;
};

function severityRank(severity: SecurityFinding["severity"]): number {
  switch (severity) {
    case "info":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

function summarize(findings: SecurityFinding[]): string {
  const vulns = findings.filter((finding) => finding.kind === "vulnerability").length;
  const untrusted = findings.filter((finding) => finding.kind === "untrustedDependencyScripts").length;
  const secrets = findings.filter((finding) => finding.kind === "secret").length;
  return `vulns=${vulns}, untrusted=${untrusted}, secrets=${secrets}`;
}

function sortFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const kindOrder: Record<SecurityFinding["kind"], number> = {
    secret: 0,
    untrustedDependencyScripts: 1,
    vulnerability: 2,
    toolError: 3,
  };

  return findings.slice().sort((a, b) => {
    const kind = kindOrder[a.kind] - kindOrder[b.kind];
    if (kind !== 0) return kind;

    const severity = severityRank(b.severity) - severityRank(a.severity);
    if (severity !== 0) return severity;

    if (a.kind === "secret" && b.kind === "secret") {
      const filePath = a.path.localeCompare(b.path);
      if (filePath !== 0) return filePath;
      return a.patternId.localeCompare(b.patternId);
    }

    if (a.kind === "vulnerability" && b.kind === "vulnerability") {
      const pkg = a.packageName.localeCompare(b.packageName);
      if (pkg !== 0) return pkg;
      return a.title.localeCompare(b.title);
    }

    if (a.kind === "untrustedDependencyScripts" && b.kind === "untrustedDependencyScripts") {
      return b.count - a.count;
    }

    return 0;
  });
}

export async function securityCheck(input: {
  mode: SecurityMode;
  cwd?: string;
}): Promise<Pick<SecurityReport, "ok" | "findings" | "summary" | "timestamp" | "mode" | "meta"> & { reportPath?: string }> {
  const startedCwd = input.cwd ?? process.cwd();
  const repoRoot = (await getRepoRoot(startedCwd)) ?? startedCwd;
  const timestamp = new Date().toISOString();

  const findings: SecurityFinding[] = [];
  const audit = await runBunAudit(repoRoot);
  findings.push(...audit.findings);

  const untrusted = await runBunPmUntrusted(repoRoot);
  if (untrusted.finding) findings.push(untrusted.finding);

  if (input.mode === "staged") {
    findings.push(...(await scanSecretsStaged({ repoRoot })));
  } else {
    findings.push(...(await scanSecretsRepo({ repoRoot })));
  }

  const sorted = sortFindings(findings);
  const ok = sorted.length === 0;
  const summary = summarize(sorted);
  const report: SecurityReport = {
    ok,
    findings: sorted,
    summary,
    timestamp,
    mode: input.mode,
    meta: { repoRoot },
  };
  const { reportPath } = await writeSecurityReport({ repoRoot, report });
  return { ok, findings: sorted, summary, timestamp, mode: input.mode, meta: { repoRoot }, reportPath };
}

function toleranceToMaxSeverity(riskTolerance: RiskTolerance): SecurityFinding["severity"] | null {
  switch (riskTolerance) {
    case "off":
      return "critical";
    case "permissive":
      return "high";
    case "balanced":
      return "medium";
    case "strict":
      return null;
  }
}

export async function gateEnable(input: {
  pluginId: string;
  riskTolerance: RiskTolerance;
  mode: SecurityMode;
  cwd?: string;
}): Promise<GateEnableResult> {
  const base = await securityCheck({ mode: input.mode, cwd: input.cwd });
  const report: GateEnableResult["report"] = {
    ok: base.ok,
    findings: base.findings,
    summary: base.summary,
    timestamp: base.timestamp,
    mode: input.mode,
    meta: { pluginId: input.pluginId, repoRoot: base.meta?.repoRoot },
    reportPath: base.reportPath,
  };

  if (report.ok) return { allowed: true, report, requiresForce: false };
  if (input.riskTolerance === "strict") return { allowed: false, report, requiresForce: true };

  const maxAllowed = toleranceToMaxSeverity(input.riskTolerance);
  if (!maxAllowed) return { allowed: false, report, requiresForce: true };

  const maxFindingSeverity = report.findings.reduce<SecurityFinding["severity"]>(
    (acc, finding) => (severityRank(finding.severity) > severityRank(acc) ? finding.severity : acc),
    "info",
  );

  const allowed = severityRank(maxFindingSeverity) <= severityRank(maxAllowed);
  return { allowed, report, requiresForce: !allowed };
}

export async function getSecurityReport(input: { cwd: string }): Promise<SecurityReport | null> {
  const repoRoot = (await getRepoRoot(input.cwd)) ?? input.cwd;
  const latestPath = join(repoRoot, ".rawr", "security", "latest.json");
  try {
    return JSON.parse(await readFile(latestPath, "utf8")) as SecurityReport;
  } catch {
    return null;
  }
}

export function createNodeSecurityRuntime() {
  return {
    async securityCheck(repoRoot: string, mode: SecurityMode) {
      return await securityCheck({ mode, cwd: repoRoot });
    },
    async gateEnable(repoRoot: string, pluginId: string, riskTolerance: RiskTolerance, mode: SecurityMode) {
      return await gateEnable({ pluginId, riskTolerance, mode, cwd: repoRoot });
    },
    async getSecurityReport(repoRoot: string) {
      return await getSecurityReport({ cwd: repoRoot });
    },
  };
}
