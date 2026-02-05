import { runBunAudit } from "./audit.js";
import { getRepoRoot } from "./git.js";
import { writeSecurityReport } from "./report.js";
import { scanSecretsRepo, scanSecretsStaged } from "./secrets.js";
import { runBunPmUntrusted } from "./untrusted.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  GateEnableInput,
  GateEnableResult,
  RiskTolerance,
  SecurityFinding,
  SecurityMode,
  SecurityReport,
} from "./types.js";

export type {
  GateEnableInput,
  GateEnableResult,
  RiskTolerance,
  SecurityFinding,
  SecurityMode,
  SecurityReport,
} from "./types.js";

function severityRank(s: SecurityFinding["severity"]): number {
  switch (s) {
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
  const vulns = findings.filter((f) => f.kind === "vulnerability").length;
  const untrusted = findings.filter((f) => f.kind === "untrustedDependencyScripts").length;
  const secrets = findings.filter((f) => f.kind === "secret").length;
  return `vulns=${vulns}, untrusted=${untrusted}, secrets=${secrets}`;
}

function sortFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const kindOrder: Record<SecurityFinding["kind"], number> = {
    secret: 0,
    untrustedDependencyScripts: 1,
    vulnerability: 2,
  };

  return findings.slice().sort((a, b) => {
    const k = kindOrder[a.kind] - kindOrder[b.kind];
    if (k !== 0) return k;

    const s = severityRank(b.severity) - severityRank(a.severity);
    if (s !== 0) return s;

    if (a.kind === "secret" && b.kind === "secret") {
      const p = a.path.localeCompare(b.path);
      if (p !== 0) return p;
      return a.patternId.localeCompare(b.patternId);
    }
    if (a.kind === "vulnerability" && b.kind === "vulnerability") {
      const p = a.packageName.localeCompare(b.packageName);
      if (p !== 0) return p;
      return a.title.localeCompare(b.title);
    }
    if (a.kind === "untrustedDependencyScripts" && b.kind === "untrustedDependencyScripts") {
      return b.count - a.count;
    }
    return 0;
  });
}

export async function securityCheck(input: { mode: SecurityMode }): Promise<
  (Pick<SecurityReport, "ok" | "findings" | "summary" | "timestamp"> & { reportPath?: string })
> {
  const startedCwd = process.cwd();
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

  const report: SecurityReport = { ok, findings: sorted, summary, timestamp, mode: input.mode, meta: { repoRoot } };
  const { reportPath } = await writeSecurityReport({ repoRoot, report });

  return { ok, findings: sorted, summary, timestamp, reportPath };
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

export async function gateEnable(input: GateEnableInput): Promise<GateEnableResult> {
  const base = await securityCheck({ mode: input.mode });
  const report: GateEnableResult["report"] = {
    ok: base.ok,
    findings: base.findings,
    summary: base.summary,
    timestamp: base.timestamp,
    mode: input.mode,
    meta: { pluginId: input.pluginId },
    reportPath: base.reportPath,
  };

  if (report.ok) return { allowed: true, report, requiresForce: false };
  if (input.riskTolerance === "strict") return { allowed: false, report, requiresForce: true };

  const maxAllowed = toleranceToMaxSeverity(input.riskTolerance);
  if (!maxAllowed) return { allowed: false, report, requiresForce: true };

  const maxFindingSeverity = report.findings.reduce<SecurityFinding["severity"]>(
    (acc, f) => (severityRank(f.severity) > severityRank(acc) ? f.severity : acc),
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
