import type { HqOpsResources } from "../../../shared/ports/resources";
import type { RiskTolerance, SecurityFinding, SecurityMode, SecurityReport } from "../types";

const DEFAULT_MAX_REPORT_BYTES = 250_000;

export function severityRank(severity: SecurityFinding["severity"]): number {
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

export function summarize(findings: SecurityFinding[]): string {
  const vulns = findings.filter((finding) => finding.kind === "vulnerability").length;
  const untrusted = findings.filter((finding) => finding.kind === "untrustedDependencyScripts").length;
  const secrets = findings.filter((finding) => finding.kind === "secret").length;
  return `vulns=${vulns}, untrusted=${untrusted}, secrets=${secrets}`;
}

export function sortFindings(findings: SecurityFinding[]): SecurityFinding[] {
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

export function securityReport(input: {
  findings: SecurityFinding[];
  mode: SecurityMode;
  timestamp: string;
  repoRoot: string;
}): SecurityReport {
  return {
    ok: input.findings.length === 0,
    findings: input.findings,
    summary: summarize(input.findings),
    timestamp: input.timestamp,
    mode: input.mode,
    meta: { repoRoot: input.repoRoot },
  };
}

function safeIsoForFilename(iso: string): string {
  return iso.replaceAll(":", "-").replaceAll(".", "-");
}

function estimateSizeBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function capFindings(report: SecurityReport, maxBytes: number): SecurityReport {
  if (estimateSizeBytes(report) <= maxBytes) return report;

  const capped: SecurityReport = {
    ...report,
    findings: report.findings.slice(),
    summary: `${report.summary} (truncated)`,
  };

  capped.findings = capped.findings.map((finding) => {
    if (finding.kind === "untrustedDependencyScripts") {
      return { ...finding, rawOutput: finding.rawOutput?.slice(0, 2_000) };
    }
    if (finding.kind === "secret") {
      return { ...finding, match: finding.match.slice(0, 32) };
    }
    return finding;
  });

  if (estimateSizeBytes(capped) <= maxBytes) return capped;

  let n = Math.min(capped.findings.length, 50);
  for (; n >= 1; n = Math.floor(n / 2)) {
    const attempt: SecurityReport = { ...capped, findings: capped.findings.slice(0, n) };
    if (estimateSizeBytes(attempt) <= maxBytes) return attempt;
  }

  return { ...capped, findings: [] };
}

export async function writeSecurityReport(resources: HqOpsResources, opts: {
  repoRoot: string;
  report: SecurityReport;
  maxReportBytes?: number;
}): Promise<{ reportDir: string; reportPath: string; latestPath: string }> {
  const maxBytes = opts.maxReportBytes ?? DEFAULT_MAX_REPORT_BYTES;
  const reportDir = resources.path.join(opts.repoRoot, ".rawr", "security");
  await resources.fs.mkdir(reportDir);

  const capped = capFindings(opts.report, maxBytes);
  const json = JSON.stringify(capped, null, 2);
  const fileName = `report-${safeIsoForFilename(capped.timestamp)}.json`;
  const reportPath = resources.path.join(reportDir, fileName);
  const latestPath = resources.path.join(reportDir, "latest.json");

  await resources.fs.writeText(reportPath, json);
  await resources.fs.writeText(latestPath, json);

  return { reportDir, reportPath, latestPath };
}

export function toleranceToMaxSeverity(riskTolerance: RiskTolerance): SecurityFinding["severity"] | null {
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

export function maxFindingSeverity(findings: SecurityFinding[]): SecurityFinding["severity"] {
  return findings.reduce<SecurityFinding["severity"]>(
    (acc, finding) => (severityRank(finding.severity) > severityRank(acc) ? finding.severity : acc),
    "info",
  );
}

export async function readLatestSecurityReport(
  resources: HqOpsResources,
  repoRoot: string,
): Promise<SecurityReport | null> {
  const latestPath = resources.path.join(repoRoot, ".rawr", "security", "latest.json");
  const raw = await resources.fs.readText(latestPath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SecurityReport;
  } catch {
    return null;
  }
}
